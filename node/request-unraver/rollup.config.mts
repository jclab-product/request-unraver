import { defineConfig } from 'rollup';
import typescript from '@rollup/plugin-typescript';

export default defineConfig({
  input: 'src/walink.ts',
  output: [
    {
      file: 'dist/walink.mjs',
      format: 'esm',
      sourcemap: true,
    },
    {
      file: 'dist/walink.cjs',
      format: 'cjs',
      sourcemap: true,
    },
  ],
  plugins: [
    typescript(),
  ]
});