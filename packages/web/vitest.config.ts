/* eslint-disable import/no-unresolved */
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'happy-dom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      include: ['src/hooks/**/*.ts', 'src/api/**/*.ts'],
      exclude: ['src/**/*.test.*'],
      thresholds: {
        lines: 50,
        functions: 50,
      },
    },
  },
});
