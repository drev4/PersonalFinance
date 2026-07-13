import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    // Replica-set-enabled mongodb-memory-server instances take longer to
    // start/stop than the 10s default, especially in beforeAll/afterAll.
    hookTimeout: 60000,
    // Ensure CJS packages are properly transformed
    server: {
      deps: {
        inline: ['ioredis-mock'],
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.test.ts', 'src/**/__tests__/**'],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
  },
});
