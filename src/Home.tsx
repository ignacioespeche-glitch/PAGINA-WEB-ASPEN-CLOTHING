// src/Home.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { obtenerProductos, type TiendanubeProducto } from './services/tiendanube';

type ProductoGrilla = Omit<Partial<TiendanubeProducto>, 'id'> & { 
  id: string | number; 
  esVacio: boolean; 
};

export const Home = () => {
  const [productos, setProductos] = useState<TiendanubeProducto[]>([]);

  useEffect(() => {
    obtenerProductos().then(data => {
      console.log("=== DATOS RECIBIDOS ===");
      console.log("Cantidad:", data ? data.length : 0);
      console.log("Productos:", data);
      setProductos(data);
    });
  }, []);

  const obtenerGrillaPorCategoria = (nombreCategoria: string): ProductoGrilla[] => {
    const categoryUpper = nombreCategoria.toUpperCase().trim();
    const subcategoryHome = `${categoryUpper} HOME`;
    
    // 1. Buscamos primero de forma estricta los productos asignados a la subcategoría HOME (ej: SUPERIOR HOME)
    let destacados = productos.filter(p => 
      p.categories?.some(cat => {
        const catName = cat.name?.es?.toUpperCase().trim() || '';
        return catName === subcategoryHome;
      })
    );

    // 2. Si no hay suficientes específicos del HOME, rellenamos con los de la categoría general (ej: SUPERIOR)
    if (destacados.length < 4) {
      const deRespaldo = productos.filter(p => 
        p.categories?.some(cat => cat.name?.es?.toUpperCase().trim() === categoryUpper) &&
        !destacados.some(d => d.id === p.id) // Evita duplicar si ya estaba
      );
      destacados = [...destacados, ...deRespaldo];
    }

    // 🔒 VALVIÓ EL CANDADO: Toma estrictamente las primeras 4 prendas para congelar la estructura visual
    const items: ProductoGrilla[] = destacados.slice(0, 4).map(p => ({ ...p, esVacio: false }));
    
    // Mantiene los espacios vacíos estéticos si hay menos de 4 artículos
    while (items.length < 4) {
      items.push({ 
        id: `vacio-${nombreCategoria}-${items.length}`, 
        esVacio: true, 
        name: { es: 'PRÓXIMAMENTE' },
        images: []
      });
    }
    return items;
  };

  const destacadosSuperior = obtenerGrillaPorCategoria('SUPERIOR');
  const destacadosInferior = obtenerGrillaPorCategoria('INFERIOR');
  const destacadosAccesorios = obtenerGrillaPorCategoria('ACCESORIOS');

  return (
    <div className="home-wrapper">
      
      <section className="hero-container">
        <div className="hero-media hero-left">
          <img src="/images/foto principal 2.png" alt="Superior Izquierda" />
        </div>
        <div className="hero-media hero-right">
          <img src="/images/foto principal 1.png" alt="Superior Derecha" />
        </div>
      </section>

      <section className="frase-separadora">
        <div className="encabezado-minimalista">
          <h4 className="subtitulo-mini">ASPEN CLOTHING</h4>
          <h2 className="titulo-mini">LA EXCLUSIVIDAD</h2>
          <p className="descripcion-mini">Al alcance de tu mano.</p>
        </div>
      </section>

      {/* GRILLA SUPERIOR */}
      <section className="home-destacados">
        <div className="grilla-destacados">
          {destacadosSuperior.map((producto) => {
            const precioBase = producto.variants?.[0]?.price ? parseFloat(producto.variants[0].price) : 0;
            const precioListaConAumento = Math.round(precioBase * 1.20);
            const valorCuota = Math.round(precioListaConAumento / 3);

            return (
              <Link 
                to={producto.esVacio ? `/producto/999` : `/producto/${producto.id}`} 
                key={`sup-${producto.id}`} 
                className="tarjeta-destacada"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="contenedor-foto-destacada">
                  {producto.images && producto.images.length > 0 ? (
                    <>
                      <img src={producto.images[0].src} alt={producto.name?.es} className="foto-prenda foto-frente" />
                      <img 
                        src={producto.images.length > 1 ? producto.images[1].src : producto.images[0].src} 
                        alt={`${producto.name?.es} espalda`} 
                        className="foto-prenda foto-espalda" 
                      />
                    </>
                  ) : (
                    <div className="espacio-vacio-destacado"></div>
                  )}
                </div>
                
                <div className="info-prenda-detalles" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 0' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {producto.esVacio ? 'PRÓXIMAMENTE' : (producto.name?.es || 'ASPEN ITEM')}
                  </h3>
                  {!producto.esVacio && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through' }}>
                        ${precioListaConAumento.toLocaleString('es-AR')},00
                      </span>
                      <strong style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                        ${precioBase.toLocaleString('es-AR')},00 por Transferencia
                      </strong>
                      <span style={{ fontSize: '11px', color: '#000', letterSpacing: '0.2px' }}>
                        3 cuotas de ${valorCuota.toLocaleString('es-AR')},00 sin interés con 💳
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="contenedor-boton">
          <Link to="/superior" className="boton-explorar">EXPLORAR SUPERIOR</Link>
        </div>
      </section>

      <section className="hero-container">
        <div className="hero-media hero-left-inf">
          <img src="/images/pantalones 1.png" alt="Inferior Izquierda" />
        </div>
        <div className="hero-media hero-right-inf">
          <img src="/images/pantalones 2.png" alt="Inferior Derecha" />
        </div>
      </section>

      <section className="frase-separadora">
        <div className="encabezado-minimalista">
          <h4 className="subtitulo-mini">ASPEN CLOTHING</h4>
          <h2 className="titulo-mini">DISEÑO SIN LÍMITES</h2>
          <p className="descripcion-mini">Movimiento y estructura.</p>
        </div>
      </section>

      {/* GRILLA INFERIOR */}
      <section className="home-destacados">
        <div className="grilla-destacados">
          {destacadosInferior.map((producto) => {
            const precioBase = producto.variants?.[0]?.price ? parseFloat(producto.variants[0].price) : 0;
            const precioListaConAumento = Math.round(precioBase * 1.20);
            const valorCuota = Math.round(precioListaConAumento / 3);

            return (
              <Link 
                to={producto.esVacio ? `/producto/999` : `/producto/${producto.id}`} 
                key={`inf-${producto.id}`} 
                className="tarjeta-destacada"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="contenedor-foto-destacada">
                  {producto.images && producto.images.length > 0 ? (
                    <>
                      <img src={producto.images[0].src} alt={producto.name?.es} className="foto-prenda foto-frente" />
                      <img 
                        src={producto.images.length > 1 ? producto.images[1].src : producto.images[0].src} 
                        alt={`${producto.name?.es} espalda`} 
                        className="foto-prenda foto-espalda" 
                      />
                    </>
                  ) : (
                    <div className="espacio-vacio-destacado"></div>
                  )}
                </div>
                
                <div className="info-prenda-detalles" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 0' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {producto.esVacio ? 'PRÓXIMAMENTE' : (producto.name?.es || 'ASPEN ITEM')}
                  </h3>
                  {!producto.esVacio && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through' }}>
                        ${precioListaConAumento.toLocaleString('es-AR')},00
                      </span>
                      <strong style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                        ${precioBase.toLocaleString('es-AR')},00 por Transferencia
                      </strong>
                      <span style={{ fontSize: '11px', color: '#000', letterSpacing: '0.2px' }}>
                        3 cuotas de ${valorCuota.toLocaleString('es-AR')},00 sin interés con 💳
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="contenedor-boton">
          <Link to="/inferior" className="boton-explorar">EXPLORAR INFERIOR</Link>
        </div>
      </section>

      <section className="hero-container">
        <div className="hero-media hero-left-acc">
          <video src="/images/video 1.mp4" autoPlay loop muted playsInline />
        </div>
        <div className="hero-media hero-right-acc">
          <img src="/images/accesorios 2.jpeg" alt="Accesorios Derecha" />
        </div>
      </section>

      <section className="frase-separadora">
        <div className="encabezado-minimalista">
          <h4 className="subtitulo-mini">ASPEN CLOTHING</h4>
          <h2 className="titulo-mini">EL DETALLE FINAL</h2>
          <p className="descripcion-mini">Marca la diferencia.</p>
        </div>
      </section>

      {/* GRILLA ACCESORIOS */}
      <section className="home-destacados">
        <div className="grilla-destacados">
          {destacadosAccesorios.map((producto) => {
            const precioBase = producto.variants?.[0]?.price ? parseFloat(producto.variants[0].price) : 0;
            const precioListaConAumento = Math.round(precioBase * 1.20);
            const valorCuota = Math.round(precioListaConAumento / 3);

            return (
              <Link 
                to={producto.esVacio ? `/producto/999` : `/producto/${producto.id}`} 
                key={`acc-${producto.id}`} 
                className="tarjeta-destacada"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div className="contenedor-foto-destacada">
                  {producto.images && producto.images.length > 0 ? (
                    <>
                      <img src={producto.images[0].src} alt={producto.name?.es} className="foto-prenda foto-frente" />
                      <img 
                        src={producto.images.length > 1 ? producto.images[1].src : producto.images[0].src} 
                        alt={`${producto.name?.es} espalda`} 
                        className="foto-prenda foto-espalda" 
                      />
                    </>
                  ) : (
                    <div className="espacio-vacio-destacado"></div>
                  )}
                </div>
                
                <div className="info-prenda-detalles" style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '10px 0' }}>
                  <h3 style={{ margin: 0, fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {producto.esVacio ? 'PRÓXIMAMENTE' : (producto.name?.es || 'ASPEN ITEM')}
                  </h3>
                  {!producto.esVacio && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', fontFamily: 'Inter, sans-serif' }}>
                      <span style={{ fontSize: '11px', color: '#999', textDecoration: 'line-through' }}>
                        ${precioListaConAumento.toLocaleString('es-AR')},00
                      </span>
                      <strong style={{ fontSize: '12px', color: '#059669', fontWeight: 700 }}>
                        ${precioBase.toLocaleString('es-AR')},00 por Transferencia
                      </strong>
                      <span style={{ fontSize: '11px', color: '#000', letterSpacing: '0.2px' }}>
                        3 cuotas de ${valorCuota.toLocaleString('es-AR')},00 sin interés con 💳
                      </span>
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
        <div className="contenedor-boton">
          <Link to="/accesorios" className="boton-explorar">EXPLORAR ACCESORIOS</Link>
        </div>
      </section>

      <section className="video-final-container">
        <video src="/images/video final.mp4" autoPlay loop muted playsInline className="video-gigante" />
      </section>

    </div>
  );
};