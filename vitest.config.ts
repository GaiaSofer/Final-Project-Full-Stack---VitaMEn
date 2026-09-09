import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
  // tsconfig.json sets jsx:"preserve" for Next's own SWC compiler; esbuild
  // (what Vitest uses) doesn't understand that value and falls back to the
  // classic runtime, which needs a `React` global. This only affects the
  // Vitest run, never `next build`, which ignores this file entirely.
  esbuild: { jsx: 'automatic' },
});
