import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  // Build with relative asset paths so the popup works when loaded from extension/dist
  base: './',
  // vite config runs from inside the popup folder, use current folder as root
  root: '.',
  build: {
    outDir: '../extension/dist',
    emptyOutDir: false,
    rollupOptions: {
      input: 'onboarding.html'
    }
  }
});
