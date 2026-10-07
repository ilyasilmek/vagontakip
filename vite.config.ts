import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  root: 'client',
  publicDir: '../public',
  plugins: [react()],
  build: { outDir: '../dist/client', emptyOutDir: true, manifest: true, rollupOptions: { output: { manualChunks: { exceljs: ['exceljs'] } } } },
  server: {
    port: 5173,
    strictPort: true,
    proxy: { '/api': { target: 'http://127.0.0.1:8787', changeOrigin: false } },
  },
});
