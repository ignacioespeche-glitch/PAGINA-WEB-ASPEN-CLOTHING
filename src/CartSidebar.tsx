// src/CartSidebar.tsx
import { useState, useEffect } from 'react';
import { useCart } from './CartContext';
import { obtenerProductos, calcularEnvioReal, type TiendanubeProducto, type OpcionEnvio } from './services/tiendanube';

interface CartSidebarProps {
  onIniciarCheckout: () => void;
}

export const CartSidebar = ({ onIniciarCheckout }: CartSidebarProps) => {
  const { 
    carrito, 
    removerDelCarrito, 
    agregarAlCarrito, 
    totalPrecio, 
    isCartOpen, 
    setIsCartOpen,
    codigoPostal,
    setCodigoPostal,
    costoEnvio,
    setCostoEnvio
  } = useCart();

  const [productosReales, setProductosReales] = useState<TiendanubeProducto[]>([]);
  
  // Estados para la calculadora de envíos incorporada
  const [calculando, setCalculando] = useState(false);
  const [opcionesEnvio, setOpcionesEnvio] = useState<OpcionEnvio[]>([]);
  const [envioCalculado, setEnvioCalculado] = useState(false);
  const [mensajeErrorEnvio, setMensajeErrorEnvio] = useState('');

  useEffect(() => {
    if (isCartOpen) {
      obtenerProductos()
        .then((data: TiendanubeProducto[]) => setProductosReales(data))
        .catch((err: unknown) => console.error(err));
    }
  }, [isCartOpen]);

  const obtenerRecommendations = () => {
    if (carrito.length === 0 || !productosReales || productosReales.length === 0) return [];
    const ultimoItem = carrito[carrito.length - 1];
    const infoProductoReal = productosReales.find(p => p.id && ultimoItem.id && p.id.toString() === ultimoItem.id.toString());
    
    let tipoPrendaBase = '';
    if (infoProductoReal && infoProductoReal.categories) {
      const nombresCategorias = infoProductoReal.categories.map((c: { name?: { es?: string } }) => c.name?.es?.toUpperCase().trim() || '');
      if (nombresCategorias.some((n: string) => n.includes('SUPERIOR'))) tipoPrendaBase = 'superior';
      else if (nombresCategorias.some((n: string) => n.includes('INFERIOR'))) tipoPrendaBase = 'inferior';
      else if (nombresCategorias.some((n: string) => n.includes('ACCESORIOS') || n.includes('ACCESORIO'))) tipoPrendaBase = 'accesorios';
    }

    if (!tipoPrendaBase) {
      const nameUpper = ultimoItem.nombre ? ultimoItem.nombre.toUpperCase() : '';
      if (nameUpper.includes('REMERA') || nameUpper.includes('BUZO') || nameUpper.includes('CAMPERA') || nameUpper.includes('CHALECO')) {
        tipoPrendaBase = 'superior';
      } else if (nameUpper.includes('PANTALON') || nameUpper.includes('PANTALÓN') || nameUpper.includes('JOGGING') || nameUpper.includes('BERMUDA')) {
        tipoPrendaBase = 'inferior';
      } else {
        tipoPrendaBase = 'accesorios';
      }
    }

    let categoriesBuscadas: string[] = [];
    if (tipoPrendaBase === 'superior') {
      categoriesBuscadas = ['INFERIOR', 'ACCESORIOS', 'INFERIOR HOME', 'ACCESORIOS HOME'];
    } else if (tipoPrendaBase === 'inferior') {
      categoriesBuscadas = ['SUPERIOR', 'ACCESORIOS', 'SUPERIOR HOME', 'ACCESORIOS HOME'];
    } else {
      categoriesBuscadas = ['SUPERIOR', 'INFERIOR', 'SUPERIOR HOME', 'INFERIOR HOME'];
    }

    return productosReales
      .filter(prod => {
        if (!prod || !prod.id) return false;
        const yaEstaEnCarrito = carrito.some(item => item.id && item.id.toString() === prod.id.toString());
        const coincideCategoria = prod.categories?.some((c: { name?: { es?: string } }) => 
          categoriesBuscadas.includes(c.name?.es?.toUpperCase().trim() || '')
        );
        return coincideCategoria && !yaEstaEnCarrito;
      })
      .slice(0, 3);
  };

  const recomendaciones = obtenerRecommendations();

  // Lógica interactiva con la API de Tiendanube para cotizar el envío real
  const handleCalcularEnvio = async () => {
    setMensajeErrorEnvio('');
    if (!codigoPostal.trim()) {
      setMensajeErrorEnvio('POR FAVOR INGRESÁ UN CÓDIGO POSTAL.');
      return;
    }

    setCalculando(true);
    try {
      const tarifas = await calcularEnvioReal(codigoPostal, carrito);
      if (tarifas && tarifas.length > 0) {
        setOpcionesEnvio(tarifas);
        // Por defecto seleccionamos el costo de la primera opción que devuelva Tiendanube
        setCostoEnvio(tarifas[0].price);
        setEnvioCalculado(true);
      } else {
        setOpcionesEnvio([]);
        setCostoEnvio(0);
        setEnvioCalculado(false);
        setMensajeErrorEnvio('NO HAY ENVÍOS DISPONIBLES PARA ESTE CÓDIGO POSTAL.');
      }
    } catch (error) {
      console.error(error);
      setMensajeErrorEnvio('ERROR AL COTIZAR EL ENVÍO. INTENTÁ DE NUEVO.');
    } finally {
      setCalculando(false);
    }
  };

  const handleFinalizarCompra = () => {
    if (carrito.length === 0) return;
    if (!envioCalculado) {
      setMensajeErrorEnvio('DEBÉS CALCULAR EL ENVÍO ANTES DE INICIAR LA COMPRA.');
      return;
    }
    setIsCartOpen(false); 
    onIniciarCheckout();   
  };

  const handleRestarCantidad = (item: any) => {
    if (item.cantidad <= 1) return;
    agregarAlCarrito({ ...item, cantidad: -1 }, item.stockMaximo || 99);
    setEnvioCalculado(false); // Forzamos a recalcular si cambia el peso/volumen del carrito
  };

  const handleSumarCantidad = (item: any) => {
    if (item.cantidad >= (item.stockMaximo || 99)) return;
    agregarAlCarrito({ ...item, cantidad: 1 }, item.stockMaximo || 99);
    setEnvioCalculado(false); // Forzamos a recalcular si cambia el peso/volumen del carrito
  };

  if (!isCartOpen) return null;

  return (
    <div className="cart-overlay" onClick={() => setIsCartOpen(false)}>
      <div className="cart-sidebar" onClick={(e) => e.stopPropagation()}>
        
        <div className="cart-header">
          <h2>CARRITO DE COMPRAS</h2>
          <button className="cerrar-cart" onClick={() => setIsCartOpen(false)}>×</button>
        </div>

        <div className="cart-items-container">
          {carrito.length === 0 ? (
            <p className="cart-vacio">El carrito está vacío.</p>
          ) : (
            <>
              <div className="cart-lista-prendas" style={{ borderTop: '1px solid #000000', paddingTop: '20px' }}>
                {carrito.map((item, index) => (
                  <div key={index} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '16px', paddingBottom: '20px', borderBottom: '1px solid #000000', backgroundColor: 'transparent', width: '100%', boxSizing: 'border-box' }}>
                    
                    <div style={{ width: '60px', height: '80px', minWidth: '60px', minHeight: '80px', maxWidth: '60px', maxHeight: '80px', overflow: 'hidden', flexShrink: 0, display: 'block', margin: 0, padding: 0, backgroundColor: 'transparent' }}>
                      <img src={item.imagen} alt={item.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center top', display: 'block' }} />
                    </div>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      <div className="cart-item-fila-superior" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000' }}>{item.nombre} ({item.talle})</p>
                        <button className="btn-borrar-item-nuevo" onClick={() => { removerDelCarrito(item.id, item.talle); setEnvioCalculado(false); }}>Borrar</button>
                      </div>
                      
                      <div className="cart-item-acciones-precio" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="selector-cantidad-caja mini-contador">
                          <button onClick={() => handleRestarCantidad(item)} disabled={item.cantidad <= 1}>-</button>
                          <span>{item.cantidad}</span>
                          <button onClick={() => handleSumarCantidad(item)} disabled={item.cantidad >= (item.stockMaximo || 99)}>+</button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#000', letterSpacing: '0.5px' }}>${(item.precio * item.cantidad).toLocaleString('es-AR')},00</p>
                      </div>
                    </div>

                  </div>
                ))}
              </div>

              {recomendaciones.length > 0 && (
                <div className="cart-cross-selling-seccion">
                  <h3 className="cross-selling-titulo">COMPLETÁ TU LOOK</h3>
                  <div className="cross-selling-lista">
                    {recomendaciones.map((prod: TiendanubeProducto) => {
                      const primeraVariante = prod?.variants && prod.variants.length > 0 ? prod.variants[0] : null;
                      const precioBase = primeraVariante?.price ? parseFloat(primeraVariante.price) : 0;
                      const fotoUrl = prod?.images && prod.images.length > 0 ? prod.images[0].src : '';
                      const talleDefecto = primeraVariante?.options && primeraVariante.options.length > 0 ? primeraVariante.options[0] : 'Único';
                      const variantIdReal = primeraVariante?.id ? Number(primeraVariante.id) : 0;

                      return (
                        <div key={prod.id} className="cross-selling-item">
                          {fotoUrl && <img src={fotoUrl} alt={prod.name?.es} className="cross-selling-foto" />}
                          <div className="cross-selling-info">
                            <p className="cross-selling-nombre">{prod.name?.es || 'ASPEN ITEM'}</p>
                            <p className="cross-selling-precio">${precioBase.toLocaleString('es-AR')},00</p>
                            <button 
                              className="btn-cross-agregar"
                              onClick={() => {
                                agregarAlCarrito({
                                  id: prod.id,
                                  nombre: prod.name?.es || 'ASPEN ITEM',
                                  precio: precioBase,
                                  imagen: fotoUrl,
                                  talle: talleDefecto,
                                  variantId: variantIdReal,
                                  cantidad: 1
                                }, primeraVariante?.stock || 5);
                                setEnvioCalculado(false);
                              }}
                            >
                              + AGREGAR
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* 🚀 NUEVA SECCIÓN: CALCULADORA DE ENVÍOS OBLIGATORIA */}
              <div className="cart-shipping-calculator" style={{ borderTop: '1px solid #000', paddingTop: '20px', marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: 0, color: '#000' }}>
                  CALCULAR COSTO DE ENVÍO
                </h3>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <input 
                    type="text" 
                    placeholder="TU CÓDIGO POSTAL *" 
                    value={codigoPostal} 
                    onChange={(e) => {
                      setCodigoPostal(e.target.value.replace(/\D/g, ''));
                      setEnvioCalculado(false);
                    }} 
                    style={{ flex: 1, padding: '12px', border: '1px solid #000', fontSize: '11px', outline: 'none', letterSpacing: '0.5px' }} 
                  />
                  <button 
                    type="button" 
                    onClick={handleCalcularEnvio} 
                    disabled={calculando}
                    style={{ background: '#000', color: '#fff', border: 'none', padding: '0 20px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}
                  >
                    {calculando ? '...' : 'CALCULAR'}
                  </button>
                </div>

                {/* Feedback interactivo de tarifas reales de Tiendanube */}
                {envioCalculado && opcionesEnvio.length > 0 && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: '#fafafa', padding: '12px', border: '1px solid #eee' }}>
                    {opcionesEnvio.map((opcion, i) => (
                      <label key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '11px', cursor: 'pointer', fontWeight: costoEnvio === opcion.price ? 700 : 400 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <input 
                            type="radio" 
                            name="shipping_option" 
                            checked={costoEnvio === opcion.price} 
                            onChange={() => setCostoEnvio(opcion.price)}
                            style={{ accentColor: '#000' }}
                          />
                          <span style={{ textTransform: 'uppercase' }}>{opcion.name}</span>
                        </div>
                        <span>${opcion.price.toLocaleString('es-AR')},00</span>
                      </label>
                    ))}
                  </div>
                )}

                {mensajeErrorEnvio && (
                  <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                    {mensajeErrorEnvio}
                  </span>
                )}
              </div>

              {/* RESUMEN DE VALORES */}
              <div className="cart-resumen-valores" style={{ marginTop: '20px', borderTop: '1px solid #000', paddingTop: '15px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                  <span>SUBTOTAL:</span>
                  <span>${totalPrecio.toLocaleString('es-AR')},00</span>
                </div>
                {envioCalculado && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
                    <span>COSTO DE ENVÍO:</span>
                    <span>${costoEnvio.toLocaleString('es-AR')},00</span>
                  </div>
                )}
                <div className="cart-fila-valores total-principal" style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                  <span>TOTAL:</span>
                  <span>${(totalPrecio + (envioCalculado ? costoEnvio : 0)).toLocaleString('es-AR')},00</span>
                </div>
              </div>
            </>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="cart-footer-nuevo">
            {/* El botón se bloquea visualmente y cambia su estilo si no calcularon el envío */}
            <button 
              className="btn-finalizar-compra-unificado" 
              onClick={handleFinalizarCompra}
              style={{
                opacity: envioCalculado ? 1 : 0.6,
                cursor: envioCalculado ? 'pointer' : 'not-allowed',
                backgroundColor: envioCalculado ? '#000' : '#444'
              }}
            >
              INICIAR COMPRA
            </button>
            <button className="btn-seguir-viendo" onClick={() => setIsCartOpen(false)}>
              VER MÁS PRODUCTOS
            </button>
          </div>
        )}
      </div>
    </div>
  );
};