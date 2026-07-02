// src/main.tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🔐 PASARELA DE SEGURIDAD OFICIAL DE MERCADO PAGO
// Detecta de forma automática si estás en tu computadora o en producción para activar el escudo correcto
const esLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
const PUBLIC_KEY_MERCADOPAGO = esLocal
  ? 'TEST-bbc9ad87-e59f-45dc-9647-d983e84862f5' // 👈 Public Key de prueba de tu captura de WhatsApp
  : 'APP_USR-efd61244-934c-42b7-a37a-77ffda284133'; // 👈 Tu Public Key de producción real para cuando esté online

if ((window as any).MercadoPago) {
  // Inicializa el sistema de encriptación bancaria directo en el navegador del cliente
  new (window as any).MercadoPago(PUBLIC_KEY_MERCADOPAGO, {
    locale: 'es-AR'
  });
  console.log(`[Mercado Pago] Escudo de encriptación inicializado con éxito en modo: ${esLocal ? 'SANDBOX / PRUEBA' : 'PRODUCCIÓN'}`);
} else {
  console.warn("[Mercado Pago] El SDK no se pudo cargar. Asegurate de tener el script en el index.html.");
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)