import { defineConfig } from 'vitest/config';

// The core is pure logic, so its tests run in the node environment — fast, no
// jsdom. Tests import { describe, it, expect } from 'vitest' explicitly (no globals).
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});
