import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    root: './',
    environment: 'node',
    testTimeout: 1_200_000,   // 20 mins
  },
});
