import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/upload': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
      '/analyze': {
        target: 'http://127.0.0.1:5000',
        changeOrigin: true,
      },
    },
  },
});
