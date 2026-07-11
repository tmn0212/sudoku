/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // Precache the full app shell so it launches with no network at all.
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
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
    // Engine tests run in Node (fast); component tests opt into jsdom via a
    // `// @vitest-environment jsdom` pragma at the top of the file.
    environment: 'node',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    css: true,
    coverage: {
      provider: 'v8',
      include: ['src/engine/**/*.ts'],
      reporter: ['text', 'html'],
    },
  },
});
