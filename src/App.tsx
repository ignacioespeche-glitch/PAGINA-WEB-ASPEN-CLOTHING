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
import { CheckoutForm } from './CheckoutForm.tsx'; // Forzamos la extensión explícita para romper el caché de TS

const HeaderNav = ({ busqueda, setBusqueda }: any) => {
  const { carrito, setIsCartOpen } = useCart(); 
  const navigate = useNavigate();

  const totalBolsaArticulos = carrito ? carrito.reduce((acc: number, item: any) => acc + item.cantidad, 0) : 0;

  const handleBuscar = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && busqueda.trim() !== '') {
      navigate('/buscar'); 
    }
  };

  return (
    <header className="main-header">
      <div className="logo">
        <Link to="/">
          <img src="/images/LOGO ASPEN.jpeg" alt="ASPEN CLOTHING" />
        </Link>
      </div>
      <nav className="nav-menu">
        <ul>
          <li><Link to="/superior">SUPERIOR</Link></li>
          <li><Link to="/inferior">INFERIOR</Link></li>
          <li><Link to="/accesorios">ACCESORIOS</Link></li>
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
      
      <HeaderNav busqueda={busqueda} setBusqueda={setBusqueda} />
      
      {isCheckoutOpen ? (
        <CheckoutForm onCancelar={() => setIsCheckoutOpen(false)} />
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