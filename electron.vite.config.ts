import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      '@main': path.resolve(__dirname, 'src/main'),
      '@shared': path.resolve(__dirname, 'src/shared'),
    },
  },
  build: {
    outDir: 'dist/main',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'src/main/index.ts',
      formats: ['cjs'],
      fileName: 'index',
    },
    rollupOptions: {
      external: ['electron', 'better-sqlite3', 'express'],
      output: {
        entryFileNames: 'index.js',
      },
    },
  },
});