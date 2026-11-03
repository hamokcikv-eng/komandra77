import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/client',
    emptyOutDir: true,
    target: 'es2022',
    cssCodeSplit: false,
    reportCompressedSize: false,
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
  },
});
