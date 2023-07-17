import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'node',
    root: './',
    environment: 'node',
    testTimeout: 500000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      all: true,
      reportsDirectory: './coverage',
      enabled: false,
    },
  },
});
