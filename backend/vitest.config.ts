import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    setupFiles: ['./tests/setup-env.ts'],
    globalSetup: './tests/global-setup.ts',
    pool: 'forks',
    hookTimeout: 60000,
    testTimeout: 30000,
  },
});