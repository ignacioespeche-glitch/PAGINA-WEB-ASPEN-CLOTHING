// src/CartContext.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

export interface CartItem {
  id: number | string;
  variantId: number;
  nombre: string;
  precio: number;
  talle: string;
  cantidad: number;
  imagen: string;
  stockMaximo?: number; // Guardamos el stock real para validar acumulados repetidos
}

interface CartContextType {
  carrito: CartItem[];
  removerDelCarrito: (id: number | string, talle: string) => void;
  totalPrecio: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
  agregarAlCarrito: (item: CartItem, stockReal: number) => void; // Recibe el stock actual de la prenda
  notificacionPopup: CartItem | null;
  cerrarNotificacion: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: ReactNode }) => {
  const [carrito, setCarrito] = useState<CartItem[]>(() => {
    const savedCart = localStorage.getItem('aspen_cart');
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [isCartOpen, setIsCartOpen] = useState(false);
  const [notificacionPopup, setNotificacionPopup] = useState<CartItem | null>(null);

  useEffect(() => {
    localStorage.setItem('aspen_cart', JSON.stringify(carrito));
  }, [carrito]);

  // 1. Calculamos el precio base real proveniente de Tienda Nube
  const precioBaseOriginal = carrito.reduce((total, item) => total + (item.precio * item.cantidad), 0);

  // 2. MODIFICACIÓN COMERCIAL: totalPrecio ahora exporta el valor con el +20% (Precio de Lista para Tarjetas)
  // Usamos Math.round para evitar centavos molestos en el total expuesto
  const totalPrecio = Math.round(precioBaseOriginal * 1.20);

  const agregarAlCarrito = (nuevoItem: CartItem, stockReal: number) => {
    setCarrito((prevCart) => {
      const existeIndex = prevCart.findIndex(
        (item) => item.id === nuevoItem.id && item.talle === nuevoItem.talle
      );

      if (existeIndex > -1) {
        const copiaCart = [...prevCart];
        const cantidadActualEnCarrito = copiaCart[existeIndex].cantidad;
        
        // 🔒 CONTROL ESTRICTO: Frenamos la suma si el acumulado supera el stock disponible
        if (cantidadActualEnCarrito + nuevoItem.cantidad > stockReal) {
          copiaCart[existeIndex].cantidad = stockReal; // Lo clavamos en el tope máximo
        } else {
          copiaCart[existeIndex].cantidad += nuevoItem.cantidad;
        }
        return copiaCart;
      }
      return [...prevCart, { ...nuevoItem, stockMaximo: stockReal }];
    });

    setNotificacionPopup(nuevoItem);
  };

  const removerDelCarrito = (id: number | string, talle: string) => {
    setCarrito((prevCart) => prevCart.filter((item) => !(item.id === id && item.talle === talle)));
  };

  useEffect(() => {
    if (notificacionPopup) {
      const timer = setTimeout(() => {
        setNotificacionPopup(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [notificacionPopup]);

  const cerrarNotificacion = () => setNotificacionPopup(null);

  return (
    <CartContext.Provider 
      value={{ 
        carrito, 
        removerDelCarrito, 
        totalPrecio, 
        isCartOpen, 
        setIsCartOpen, 
        agregarAlCarrito, 
        notificacionPopup, 
        cerrarNotificacion 
      }}
    >
      {children}
      
      {/* 🔔 PESTAÑA EMERGENTE FLOTANTE SUPERIOR DERECHA */}
      {notificacionPopup && (
        <div className="popup-notificacion-superior">
          <button className="btn-cerrar-popup" onClick={cerrarNotificacion}>×</button>
          <div className="popup-cuerpo">
            <div className="popup-foto-caja">
              {notificacionPopup.imagen ? (
                <img src={notificacionPopup.imagen} alt={notificacionPopup.nombre} />
              ) : (
                <div className="popup-placeholder"></div>
              )}
            </div>
            <div className="popup-info">
              <h5 className="popup-prenda-titulo">{notificacionPopup.nombre}</h5>
              <p className="popup-prenda-variante">TALLE: {notificacionPopup.talle}</p>
              {/* Aquí mostramos el precio unitario base de la prenda para que no confunda al agregar */}
              <p className="popup-prenda-detalles">{notificacionPopup.cantidad} x ${notificacionPopup.precio.toLocaleString('es-AR')}</p>
              <span className="popup-tag-exito">¡AGREGADO AL CARRITO!</span>
            </div>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart debe usarse dentro de un CartProvider');
  return context;
};