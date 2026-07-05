// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: true, // Permite las conexiones del túnel de Ngrok
    proxy: {
      // 🚀 PROXY BASE AMPLILADO: Deja pasar dinámicamente tanto /orders como /checkouts salteando el CORS
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
      // 💳 REPARACIÓN QUIRÚRGICA: Proxy directo para Mercado Pago (Evita la destrucción del JSON POST)
      '/api-mercadopago': {
        target: 'https://api.mercadopago.com',
        changeOrigin: true,
        secure: false,
        ws: true,
        rewrite: (path) => path.replace(/^\/api-mercadopago/, '')
        // Removimos el bloque 'configure' para que Vite no intercepte el flujo de datos
        // y el JSON con las back_urls llegue 100% entero a Mercado Pago.
      }
    }
  }
});