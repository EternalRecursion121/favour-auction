import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';

export default defineConfig({
  plugins: [sveltekit()],
  test: {
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.{js,ts}'],
    exclude: [
      'src/routes/api/admin/auth/tests/auth.test.ts',
      'src/routes/api/auctions/current/tests/current-auction.test.ts'
    ],
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    deps: {
      inline: [/@sveltejs\/kit/, /msw/]
    }
  },
  resolve: {
    alias: {
      $lib: './src/lib',
      $app: './node_modules/@sveltejs/kit/src/runtime/app',
      '$env/static/private': './src/test/mocks/env/static/private'
    }
  }
});