// src/CartSidebar.tsx
import { useState, useEffect } from 'react';
import { useCart } from './CartContext';
import { obtenerProductos, calcularEnvioReal, type TiendanubeProducto, type OpcionEnvio } from './services/tiendanube';

export const CartSidebar = () => {
  const { carrito, removerDelCarrito, agregarAlCarrito, totalPrecio, isCartOpen, setIsCartOpen } = useCart();

  const [productosReales, setProductosReales] = useState<TiendanubeProducto[]>([]);
  const [cpInput, setCpInput] = useState('');
  const [cargandoEnvio, setCargandoEnvio] = useState(false);
  const [envioCalculado, setEnvioCalculado] = useState(false);
  const [opcionesEnvioReales, setOpcionesEnvioReales] = useState<OpcionEnvio[]>([]);

  useEffect(() => {
    if (isCartOpen) {
      obtenerProductos().then(data => setProductosReales(data)).catch(err => console.error(err));
    }
  }, [isCartOpen]);

  const obtenerRecommendations = () => {
    if (carrito.length === 0 || !productosReales || productosReales.length === 0) return [];
    const ultimoItem = carrito[carrito.length - 1];
    const infoProductoReal = productosReales.find(p => p.id && ultimoItem.id && p.id.toString() === ultimoItem.id.toString());
    
    let tipoPrendaBase = '';
    if (infoProductoReal && infoProductoReal.categories) {
      const nombresCategorias = infoProductoReal.categories.map(c => c.name?.es?.toUpperCase().trim() || '');
      if (nombresCategorias.some(n => n.includes('SUPERIOR'))) tipoPrendaBase = 'superior';
      else if (nombresCategorias.some(n => n.includes('INFERIOR'))) tipoPrendaBase = 'inferior';
      else if (nombresCategorias.some(n => n.includes('ACCESORIOS') || n.includes('ACCESORIO'))) tipoPrendaBase = 'accesorios';
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
        const coincideCategoria = prod.categories?.some(c => 
          categoriesBuscadas.includes(c.name?.es?.toUpperCase().trim() || '')
        );
        return coincideCategoria && !yaEstaEnCarrito;
      })
      .slice(0, 3);
  };

  // Corrección de nombre para limpiar los errores ts(2552) y ts(6133)
  const recomendaciones = obtenerRecommendations();

  const handleCalcularEnvio = async () => {
    if (!cpInput.trim()) return;
    setCargandoEnvio(true);
    setEnvioCalculado(false);
    setOpcionesEnvioReales([]);
    try {
      const tarifas = await calcularEnvioReal(cpInput, carrito);
      setOpcionesEnvioReales(tarifas);
      setEnvioCalculado(true);
    } catch (error) {
      console.error("Error al obtener cotización de envíos:", error);
    } finally {
      setCargandoEnvio(false);
    }
  };

  const handleFinalizarCompra = () => {
    if (carrito.length === 0) return;

    const item = carrito[0];
    
    if (carrito.length === 1) {
      window.location.href = `https://tienda.aspenclothing.com.ar/apps/product/add-to-cart?variant_id=${item.variantId}&quantity=${item.cantidad}`;
    } else {
      const variantes = carrito.map(i => i.variantId).join(',');
      const cantidades = carrito.map(i => i.cantidad).join(',');
      window.location.href = `https://tienda.aspenclothing.com.ar/apps/product/add-to-cart?variant_ids=${variantes}&quantities=${cantidades}`;
    }
  };

  const handleRestarCantidad = (item: any) => {
    if (item.cantidad <= 1) return;
    agregarAlCarrito({ ...item, cantidad: -1 }, item.stockMaximo || 99);
  };

  const handleSumarCantidad = (item: any) => {
    if (item.cantidad >= (item.stockMaximo || 99)) return;
    agregarAlCarrito({ ...item, cantidad: 1 }, item.stockMaximo || 99);
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
                        <p style={{ margin: 0, fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', color: '#000000' }}>{item.nombre} ({item.talle})</p>
                        <button className="btn-borrar-item-nuevo" onClick={() => removerDelCarrito(item.id, item.talle)}>Borrar</button>
                      </div>
                      
                      <div className="cart-item-acciones-precio" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                        <div className="selector-cantidad-caja mini-contador">
                          <button onClick={() => handleRestarCantidad(item)} disabled={item.cantidad <= 1}>-</button>
                          <span>{item.cantidad}</span>
                          <button onClick={() => handleSumarCantidad(item)} disabled={item.cantidad >= (item.stockMaximo || 99)}>+</button>
                        </div>
                        <p style={{ margin: 0, fontSize: '12px', fontWeight: 700, color: '#000000', letterSpacing: '0.5px' }}>${(item.precio * item.cantidad).toLocaleString('es-AR')},00</p>
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
                              onClick={() => agregarAlCarrito({
                                id: prod.id,
                                nombre: prod.name?.es || 'ASPEN ITEM',
                                precio: precioBase,
                                imagen: fotoUrl,
                                talle: talleDefecto,
                                variantId: variantIdReal,
                                cantidad: 1
                              }, primeraVariante?.stock || 5)}
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

              <div className="cart-resumen-valores">
                <div className="cart-fila-valores">
                  <span>SUBTOTAL <small>(SIN ENVÍO)</small> :</span>
                  <span>${totalPrecio.toLocaleString('es-AR')},00</span>
                </div>
                
                <div className="cart-bloque-codigo-postal">
                  <div className="cp-titulo">
                    <span>Medios de envío</span>
                    <span>—</span>
                  </div>
                  <div className="cp-input-grupo">
                    <input type="text" placeholder="Tu código postal" className="cart-cp-input" value={cpInput} onChange={(e) => setCpInput(e.target.value)} disabled={cargandoEnvio} />
                    <input type="button" className="cart-cp-btn" onClick={handleCalcularEnvio} disabled={cargandoEnvio} value={cargandoEnvio ? "..." : "CALCULAR"} />
                  </div>

                  {cargandoEnvio && <div className="camion-ruta-contenedor"><div className="camion-icono">🚚💨</div></div>}

                  {envioCalculado && (
                    <div className="envio-resultados-animados">
                      {opcionesEnvioReales.length === 0 ? (
                        <div className="opcion-envio-item"><span>No hay envíos disponibles para este CP.</span></div>
                      ) : (
                        opcionesEnvioReales.map((opcion, i) => (
                          <div key={i} className="opcion-envio-item">
                            <span>{opcion.name}:</span>
                            <strong>{opcion.price === 0 ? 'GRATIS' : `$${opcion.price.toLocaleString('es-AR')},00`}</strong>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                  <span className="cp-ayuda">NO SÉ MI CÓDIGO POSTAL</span>
                </div>

                <div className="cart-fila-valores total-principal">
                  <span>TOTAL:</span>
                  <span>${totalPrecio.toLocaleString('es-AR')},00</span>
                </div>
              </div>
            </>
          )}
        </div>

        {carrito.length > 0 && (
          <div className="cart-footer-nuevo">
            <button className="btn-finalizar-compra-unificado" onClick={handleFinalizarCompra}>
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