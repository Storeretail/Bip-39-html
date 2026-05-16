import { defineConfig } from 'vite';

export default defineConfig({
  define: {
    // Inject global Buffer emulation for modern browsers
    'global': 'globalThis',
  },
  resolve: {
    alias: {
      // Direct build references to use standard browser-ready variants
      buffer: 'buffer/',
    },
  },
});
