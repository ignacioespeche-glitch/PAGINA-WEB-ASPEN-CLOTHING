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
        rewrite: (path) => path.replace(/^\/api-tiendanube/, ''),
        // 🛠️ FIX DE WARNING: Cambiado req por _req para que compile limpio
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            proxyReq.setHeader('Origin', 'https://api.tiendanube.com');
            proxyReq.setHeader('Referer', 'https://api.tiendanube.com/');
          });
        }
      }
    }
  }
});