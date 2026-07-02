// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true, // Permite las conexiones del túnel de Ngrok
    proxy: {
      // Intercepta las llamadas locales y las manda a los servidores de Tiendanube (INTACTO)
      '/api-tiendanube': {
        target: 'https://api.tiendanube.com',
        changeOrigin: true,
        secure: false, // Evita bloqueos por certificados SSL estrictos en local
        ws: true,
        rewrite: (path) => path.replace(/^\/api-tiendanube/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            proxyReq.setHeader('Origin', 'https://api.tiendanube.com');
            proxyReq.setHeader('Referer', 'https://api.tiendanube.com/');
          });
        }
      },
      // 💳 AGREGADO QUIRÚRGICO: Pasarela espejo para Mercado Pago (Solución al 404)
      '/api-mercadopago': {
        target: 'https://api.mercadopago.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api-mercadopago/, ''),
        configure: (proxy, _options) => {
          proxy.on('proxyReq', (proxyReq, _req, _res) => {
            proxyReq.setHeader('Origin', 'https://api.mercadopago.com');
            proxyReq.setHeader('Referer', 'https://api.mercadopago.com/');
          });
        }
      }
    }
  }
});