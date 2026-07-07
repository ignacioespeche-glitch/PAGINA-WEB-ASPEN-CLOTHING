// src/main.tsx
import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { useLocation } from 'react-router-dom'
import './index.css'
import App from './App.tsx'

// Componente auxiliar que escucha los cambios de página y te tira arriba de todo
const ScrollToTop = () => {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]); // Se ejecuta al instante cada vez que cambia la ruta de la web

  return null;
};

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ScrollToTop />
    <App />
  </StrictMode>,
)