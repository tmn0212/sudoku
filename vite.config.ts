/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // 'prompt' (not 'autoUpdate'): a Sudoku game must never reload itself
      // mid-puzzle. ReloadPrompt.tsx shows a toast and the user chooses when to
      // activate the new version.
      registerType: 'prompt',
      // Precache the full app shell so it launches with no network at all.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2,json}'],
        // The app is a single-page app; serve index.html for any navigation.
        navigateFallback: 'index.html',
      },
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Sudoku',
        short_name: 'Sudoku',
        description: 'A clean, offline-first Sudoku game with teaching hints.',
        theme_color: '#1f6feb',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        scope: '/',
        icons: [
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      // Enable testing the service worker with `npm run preview`.
      devOptions: { enabled: false },
    }),
  ],
  test: {
    globals: true,
    css: true,
    // Tiered suite so a session runs the cheap, high-signal tests by default and
    // only pays for jsdom when it touches the store/hooks/components/db.
    //   npm run test:fast  — pure logic (engine/scoring/data/utils), node, sub-second
    //   npm run test:ui    — store/state/db/hooks/components, jsdom
    //   npm run test:all   — everything (also plain `npm test`)
    // See docs/architecture/05-testing.md for the change-type -> tier table.
    projects: [
      {
        extends: true,
        test: {
          name: 'fast',
          environment: 'node',
          include: [
            'src/engine/**/*.test.ts',
            'src/scoring/**/*.test.ts',
            'src/data/**/*.test.{ts,tsx}',
            'src/utils/**/*.test.ts',
            'src/platform/**/*.test.ts',
            // Pure logic colocated with a component (e.g. the board gesture
            // reducer). Component *render* tests are .test.tsx and run in the ui
            // tier; .test.ts here stays framework-free and node-fast.
            'src/components/**/*.test.ts',
          ],
        },
      },
      {
        extends: true,
        test: {
          name: 'ui',
          environment: 'jsdom',
          setupFiles: ['./src/test/setup.ts'],
          include: [
            'src/game/**/*.test.{ts,tsx}',
            'src/state/**/*.test.ts',
            'src/db/**/*.test.ts',
            'src/hooks/**/*.test.{ts,tsx}',
            'src/components/**/*.test.tsx',
          ],
        },
      },
    ],
    coverage: {
      provider: 'v8',
      // Widened beyond the engine so store/hooks/scoring coverage is visible.
      include: [
        'src/engine/**',
        'src/game/**',
        'src/scoring/**',
        'src/hooks/**',
        'src/state/**',
      ],
      reporter: ['text', 'html'],
    },
  },
});
