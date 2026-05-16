import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',                    // Cloudflare Pages usually uses root
  define: {
    global: 'globalThis',
  },
  resolve: {
    alias: {
      buffer: 'buffer/',
    },
  },
});
