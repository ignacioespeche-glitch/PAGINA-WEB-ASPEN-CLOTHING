// src/ProductoDetalle.tsx
import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useCart } from './CartContext';
import { obtenerProductos, type TiendanubeProducto } from './services/tiendanube';
import './App.css';

export const ProductoDetalle = () => {
  const { id } = useParams();
  const { agregarAlCarrito, carrito, setIsCartOpen } = useCart();
  
  const [producto, setProducto] = useState<TiendanubeProducto | null>(null);
  const [loading, setLoading] = useState(true);
  
  const [talleElegido, setTalleElegido] = useState('');
  const [cantidad, setCantidad] = useState(1);

  const requiereTallesCompletos = (nombre: string): boolean => {
    const n = nombre.toUpperCase();
    if (n.includes('GORRA') || n.includes('MEDIA') || n.includes('PILUSO') || n.includes('ACCESORIO') || n.includes('LENTES')) {
      return false;
    }
    return true;
  };

  const obtenerTalleDeVariante = (variant: any): string | null => {
    if (!variant.options || variant.options.length === 0) return null;
    
    if (variant.options.length === 1) {
      return variant.options[0] ? variant.options[0].trim().toUpperCase() : null;
    }

    const op1 = variant.options[0]?.trim().toUpperCase() || '';
    const op2 = variant.options[1]?.trim().toUpperCase() || '';

    const palabrasDeColor = ['NEGRO', 'BLANCO', 'GRIS', 'WHITE', 'BLACK', 'GREY', 'CHEETAH', 'MOCCA', 'BEIGE', 'MARRON', 'BLUE', 'AZUL'];
    
    if (!isNaN(Number(op1)) || palabrasDeColor.includes(op2)) {
      return op1;
    }
    
    return op2 || op1;
  };

  const obtenerTallesDeProducto = (prod: TiendanubeProducto): string[] => {
    if (!prod.variants || prod.variants.length === 0) return ['Único'];
    
    const listaTalles = prod.variants
      .map(v => obtenerTalleDeVariante(v))
      .filter((t): t is string => Boolean(t) && t !== '');

    if (listaTalles.length > 0) {
      return Array.from(new Set(listaTalles));
    }

    return requiereTallesCompletos(prod.name?.es || '') ? ['S', 'M', 'L', 'XL'] : ['Único'];
  };

  useEffect(() => {
    const cargarProducto = async () => {
      setLoading(true);
      try {
        const todosLosProductos = await obtenerProductos();
        const productoEncontrado = todosLosProductos.find(p => p.id.toString() === id?.toString());
        
        if (productoEncontrado) {
          setProducto(productoEncontrado);
          const talles = obtenerTallesDeProducto(productoEncontrado);
          
          const primerTalleConStock = talles.find(t => {
            const v = productoEncontrado.variants?.find(variant => {
              const talleVar = obtenerTalleDeVariante(variant);
              return talleVar === t.toUpperCase();
            });
            return v ? (v.stock ?? 0) > 0 : false;
          });

          setTalleElegido(primerTalleConStock || talles[0] || '');
        } else {
          setProducto({
            id: 999,
            name: { es: 'STRADA LOW CHEETAH // BLACK' },
            handle: { es: 'strada-low-cheetah-black' },
            description: { es: '<ul><li>59% PU, 41% PL</li><li>Quilted nylon fabric</li><li>Bicolor design</li><li>FIT: Oversized / Boxy</li></ul>' },
            images: [
              { id: 1, src: '/images/foto principal 1.png' },
              { id: 2, src: '/images/foto trasera 1.png' }
            ],
            categories: [], 
            variants: [
              { id: 101, price: '152600', stock: 5, options: ['XS'] },
              { id: 102, price: '152600', stock: 3, options: ['S'] },
              { id: 103, price: '152600', stock: 8, options: ['M'] },
              { id: 104, price: '152600', stock: 2, options: ['L'] },
              { id: 105, price: '152600', stock: 0, options: ['XL'] },
            ]
          });
          setTalleElegido('XS');
        }
      } catch (error) {
        console.error("Error al cargar la prenda:", error);
      } finally {
        setLoading(false);
      }
    };
    cargarProducto();
  }, [id]);

  if (loading) return <div className="pantalla-mensaje">Cargando prenda...</div>;
  if (!producto) return <div className="pantalla-mensaje">Producto no encontrado.</div>;

  const tallesDisponibles = obtenerTallesDeProducto(producto);

  const varianteReal = producto.variants?.find(v => {
    const talleVar = obtenerTalleDeVariante(v);
    return talleVar === talleElegido.trim().toUpperCase();
  }) || producto.variants?.[0];

  const priceString = varianteReal?.price || '0';
  const precioNumerico = parseFloat(priceString);

  const precioListaConAumento = Math.round(precioNumerico * 1.20);
  const valorCuota = Math.round(precioListaConAumento / 3);

  const esPrendaForzada = requiereTallesCompletos(producto.name?.es || '') && (!producto.variants || producto.variants.length <= 1);
  const stockMostrar = varianteReal && typeof varianteReal.stock === 'number' ? varianteReal.stock : 0;

  const yaAgregadoAlCarrito = carrito?.some(item => item.id === producto.id) ?? false;

  const itemExistenteEnCarrito = carrito.find(item => item.id === producto.id && item.talle === talleElegido);
  const cantidadYaAgregada = itemExistenteEnCarrito ? itemExistenteEnCarrito.cantidad : 0;
  const stockRestanteDisponible = Math.max(0, stockMostrar - cantidadYaAgregada);

  const handleCambiarTalle = (nuevoTalle: string) => {
    setTalleElegido(nuevoTalle);
    const nuevaVariante = producto.variants?.find(v => {
      const talleVar = obtenerTalleDeVariante(v);
      return talleVar === nuevoTalle.trim().toUpperCase();
    });
    const nuevoStock = nuevaVariante?.stock === 0 ? 0 : (esPrendaForzada ? 5 : (nuevaVariante?.stock ?? 0));
    
    if (nuevoStock > 0 && cantidad > nuevoStock) {
      setCantidad(nuevoStock);
    }
  };

  const handleAgregar = () => {
    if (stockMostrar === 0 || cantidad > stockMostrar || cantidad > stockRestanteDisponible) return;
    
    agregarAlCarrito({
      id: producto.id,
      variantId: varianteReal ? varianteReal.id : 0, 
      nombre: producto.name?.es || 'ASPEN ITEM',
      precio: precioNumerico,
      talle: talleElegido,
      cantidad: cantidad,
      imagen: producto.images && producto.images.length > 0 ? producto.images[0].src : ''
    }, stockMostrar);
  };

  const btnMenosDeshabilitado = stockMostrar === 0 || cantidad <= 1;
  const btnMasDeshabilitado = stockMostrar === 0 || cantidad >= stockRestanteDisponible || cantidad >= stockMostrar;
  const btnAgregarDeshabilitado = stockMostrar === 0 || stockRestanteDisponible <= 0;

  return (
    <div className="detalle-wrapper">
      
      {/* LISTA VERTICAL DE FOTOS CONTINUAS */}
      <div className="detalle-foto-seccion-vertical">
        {producto.images && producto.images.length > 0 ? (
          producto.images.map((img) => (
            <div key={img.id} className="foto-principal-contenedor-scroll">
              <img 
                src={img.src} 
                alt={`${producto.name?.es}`} 
                className="foto-detalle-img-scroll" 
              />
            </div>
          ))
        ) : (
          <div className="foto-placeholder"></div>
        )}
      </div>

      {/* DETALLES DE INFORMACIÓN */}
      <div className="detalle-info-seccion">
        <h1 className="detalle-titulo">{producto.name?.es || 'ASPEN ITEM'}</h1>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', margin: '15px 0 25px 0', fontFamily: 'Inter, sans-serif' }}>
          <span style={{ fontSize: '13px', color: '#999', textDecoration: 'line-through' }}>
            ${precioListaConAumento.toLocaleString('es-AR')},00 ARS
          </span>
          <strong style={{ fontSize: '16px', color: '#059669', fontWeight: 700, letterSpacing: '0.3px' }}>
            ${precioNumerico.toLocaleString('es-AR')},00 por Transferencia
          </strong>
          <span style={{ fontSize: '13px', color: '#000', fontWeight: 500, letterSpacing: '0.2px' }}>
            3 cuotas de ${valorCuota.toLocaleString('es-AR')},00 sin interés con 💳
          </span>
        </div>

        <div className="detalle-bloque-talles">
          <p className="talle-label">TALLE: <span>{(talleElegido || '').toUpperCase()}</span></p>
          <div className="grilla-botones-talle">
            {tallesDisponibles.map(t => {
              const vReal = producto.variants?.find(variant => {
                const talleVar = obtenerTalleDeVariante(variant);
                return talleVar === t.toUpperCase();
              });
              const sinStock = vReal ? (vReal.stock ?? 0) === 0 : true;
              
              return (
                <button 
                  key={t}
                  disabled={sinStock}
                  className={`btn-talle-cuadrado ${(talleElegido || '').toUpperCase() === t.toUpperCase() ? 'activo' : ''} ${sinStock ? 'sin-stock' : ''}`}
                  onClick={() => handleCambiarTalle(t)}
                >
                  {t}
                </button>
              );
            })}
          </div>
        </div>

        <div className="detalle-bloque-accion">
          <div className="selector-cantidad-caja">
            <button 
              disabled={btnMenosDeshabilitado} 
              onClick={() => setCantidad(Math.max(1, cantidad - 1))}
              style={{
                cursor: btnMenosDeshabilitado ? 'not-allowed' : 'pointer',
                opacity: btnMenosDeshabilitado ? 0.3 : 1
              }}
            >
              -
            </button>
            <span>{stockMostrar === 0 ? 0 : cantidad}</span>
            <button 
              disabled={btnMasDeshabilitado}
              onClick={() => setCantidad(cantidad + 1)}
              style={{
                cursor: btnMasDeshabilitado ? 'not-allowed' : 'pointer',
                opacity: btnMasDeshabilitado ? 0.3 : 1
              }}
            >
              +
            </button>
          </div>
          
          <button 
            className={`btn-agregar-full ${btnAgregarDeshabilitado ? 'sin-stock-bloqueado' : ''}`} 
            onClick={handleAgregar}
            disabled={btnAgregarDeshabilitado}
            style={{
              cursor: btnAgregarDeshabilitado ? 'not-allowed' : 'pointer',
              opacity: btnAgregarDeshabilitado ? 0.5 : 1
            }}
          >
            {stockMostrar === 0 ? 'SIN STOCK' : stockRestanteDisponible <= 0 ? 'MÁXIMO EN CARRITO' : 'AGREGAR AL CARRITO'}
          </button>
        </div>

        <div className="alertas-compra-contenedor">
          <div className="detalle-stock">
            {stockMostrar === 0 ? (
              <><span className="punto-rojo"></span> Producto agotado temporalmente.</>
            ) : stockMostrar <= 3 ? (
              <><span className="punto-rojo"></span> ¡Últimas {stockMostrar} unidades en stock!</>
            ) : (
              <><span className="punto-verde"></span> Unidades disponibles.</>
            )}
          </div>

          {yaAgregadoAlCarrito && (
            <div className="mensaje-ya-agregado">
              <span className="tilde-verificado">✓</span> YA AGREGASTE ESTE PRODUCTO.{' '}
              <button onClick={() => setIsCartOpen(true)} className="btn-texto-open-cart">
                VER CARRITO
              </button>
            </div>
          )}
        </div>

        <div className="detalle-descripcion-texto">
          <div dangerouslySetInnerHTML={{ __html: producto.description?.es || '<p>Sin descripción.</p>' }} />
        </div>
      </div>
    </div>
  );
};