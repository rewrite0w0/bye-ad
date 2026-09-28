import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm', 'cjs', 'iife'],
  globalName: 'ByeAd',
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  minify: true,
  target: 'es2020',
  outExtension({ format }) {
    if (format === 'iife') return { js: '.global.js' };
    if (format === 'cjs') return { js: '.cjs' };
    return { js: '.js' };
  },
});
