import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    watch: false,
    environment: 'jsdom',
    include: ['src/**/__tests__/**/*.spec.ts?(x)'],
  },
});
