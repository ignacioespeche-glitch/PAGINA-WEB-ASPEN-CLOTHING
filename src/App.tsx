// src/App.tsx
import { useState } from 'react';
import { BrowserRouter, Routes, Route, Link, useNavigate } from 'react-router-dom';
import './index.css';

import { Home } from './Home';
import { Categoria } from './Categoria'; 
import { ProductoDetalle } from './ProductoDetalle'; 
import { Footer } from './Footer';
import { CartProvider, useCart } from './CartContext'; 
import { CartSidebar } from './CartSidebar'; 
import { CheckoutForm } from './CheckoutForm.tsx'; 

const HeaderNav = ({ busqueda, setBusqueda, setIsCheckoutOpen }: any) => {
  const { carrito, setIsCartOpen } = useCart(); 
  const navigate = useNavigate();

  const totalBolsaArticulos = carrito ? carrito.reduce((acc: number, item: any) => acc + item.cantidad, 0) : 0;

  const handleBuscar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busqueda.trim() !== '') {
      setIsCheckoutOpen(false); 
      navigate('/buscar'); 
    }
  };

  return (
    <header className="main-header">
      <div className="logo">
        <Link to="/" onClick={() => setIsCheckoutOpen(false)}>
          <img src="/images/LOGO ASPEN.jpeg" alt="ASPEN CLOTHING" />
        </Link>
      </div>
      <nav className="nav-menu">
        <ul>
          <li><Link to="/superior" onClick={() => setIsCheckoutOpen(false)}>SUPERIOR</Link></li>
          <li><Link to="/inferior" onClick={() => setIsCheckoutOpen(false)}>INFERIOR</Link></li>
          <li><Link to="/accesorios" onClick={() => setIsCheckoutOpen(false)}>ACCESORIOS</Link></li>
        </ul>
      </nav>
      <div className="nav-icons">
        <input 
          type="text" 
          className="buscador-input" 
          placeholder="SEARCH" 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          onKeyDown={handleBuscar} 
        />
        
        <button 
          className="icon"
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'Inter', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', color: '#000', letterSpacing: '1px' }}
          onClick={() => setIsCartOpen(true)}
        >
          BAG ({totalBolsaArticulos})
        </button>
      </div>
    </header>
  );
};

function AppContent() {
  const [busqueda, setBusqueda] = useState('');
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);

  return (
    <BrowserRouter>
      <CartSidebar onIniciarCheckout={() => setIsCheckoutOpen(true)} /> 
      
      <HeaderNav busqueda={busqueda} setBusqueda={setBusqueda} setIsCheckoutOpen={setIsCheckoutOpen} />
      
      {isCheckoutOpen ? (
        <CheckoutForm />
      ) : (
        <main>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/superior" element={<Categoria titulo="SUPERIOR" busqueda={busqueda} />} />
            <Route path="/inferior" element={<Categoria titulo="INFERIOR" busqueda={busqueda} />} />
            <Route path="/accesorios" element={<Categoria titulo="ACCESORIOS" busqueda={busqueda} />} />
            <Route path="/buscar" element={<Categoria titulo="RESULTADOS DE BÚSQUEDA" busqueda={busqueda} />} />
            <Route path="/producto/:id" element={<ProductoDetalle />} />
          </Routes>
        </main>
      )}
      
      <Footer />

      {/* 🟢 BOTÓN FLOTANTE DE WHATSAPP OFICIAL PARA ASPEN */}
      <a 
        href="https://wa.me/5492612515727?text=Hola%20Aspen!%20Te%20hago%20una%20consulta%20por%20una%20prenda." 
        className="whatsapp-flotante"
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Contacto por WhatsApp"
      >
        <svg className="whatsapp-icono-svg" viewBox="0 0 24 24">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.713-1.457L0 24zm6.59-4.046c1.66.986 3.288 1.479 4.884 1.48 5.332 0 9.671-4.33 9.675-9.654.002-2.58-1.001-5.005-2.825-6.83C16.5 3.125 14.089 2.121 11.51 2.121 6.22 2.121 1.926 6.405 1.922 11.693c-.001 1.708.468 3.376 1.357 4.864l-.991 3.62 3.73-.978l.029.014z"/>
        </svg>
      </a>
    </BrowserRouter>
  );
}

function App() {
  return (
    <CartProvider>
      <AppContent />
    </CartProvider>
  );
}

export default App;