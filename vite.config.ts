// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true, // Permite las conexiones del túnel de Ngrok
    proxy: {
      // Intercepta las llamadas locales y las manda a los servidores de Tiendanube
      '/api-tiendanube': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api-tiendanube/, '')
      }
    }
  }
});