import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'node',
    root: './',
    environment: 'node',
    testTimeout: 500000,
  },
});
