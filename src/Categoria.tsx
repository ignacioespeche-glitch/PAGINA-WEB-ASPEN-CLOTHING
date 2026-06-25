// src/Categoria.tsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { obtenerProductos, type TiendanubeProducto } from './services/tiendanube';
import './Categoria.css';

interface Props {
  titulo: string;
  busqueda: string; 
}

export const Categoria = ({ titulo, busqueda }: Props) => {
  const [productos, setProductos] = useState<TiendanubeProducto[]>([]);
  const [loading, setLoading] = useState(true);

  const [mostrarFiltros, setMostrarFiltros] = useState(false);
  const [filtroColor, setFiltroColor] = useState('');
  const [filtroCalce, setFiltroCalce] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      setLoading(true);
      const datosReales = await obtenerProductos();
      setProductos(datosReales);
      setLoading(false);
    };
    cargarDatos();
  }, []);

  const productosFiltrados = productos.filter((producto) => {
    const nombreProducto = producto.name?.es || '';
    const categoriaPagina = titulo.toUpperCase().trim();

    // 1. FILTRADO ESTRICTO POR CATEGORÍAS Y SUBCATEGORÍAS DE TIENDANUBE
    if (categoriaPagina !== "RESULTADOS DE BÚSQUEDA") {
      const perteneceACategoria = producto.categories?.some(cat => {
        const nombreCatReal = cat.name?.es?.toUpperCase().trim() || '';
        // Valida que coincida con la principal (ej: "SUPERIOR") o su subcategoría ("SUPERIOR HOME")
        return nombreCatReal === categoriaPagina || nombreCatReal === `${categoriaPagina} HOME`;
      });

      // Si no pertenece a la sección activa de la barra de navegación, queda fuera
      if (!perteneceACategoria) return false;
    }

    // 2. FILTROS COMPLEMENTARIOS (BÚSQUEDA INPUT, COLOR Y CALCE DEL PANEL)
    const coincideBusqueda = nombreProducto.toLowerCase().includes(busqueda.toLowerCase());
    const coincideColor = filtroColor === '' || nombreProducto.toLowerCase().includes(filtroColor.toLowerCase());
    const coincideCalce = filtroCalce === '' || nombreProducto.toLowerCase().includes(filtroCalce.toLowerCase());
    
    return coincideBusqueda && coincideColor && coincideCalce;
  });

  if (loading) {
    return (
      <div className="aspen-categoria" style={{ display: 'flex', justifyContent: 'center', padding: '150px 0', color: '#000' }}>
        <h2>Cargando colección...</h2>
      </div>
    );
  }

  return (
    <section className="aspen-categoria">
      
      {/* CABECERA Y FILTROS */}
      <div className="categoria-cabecera">
        <h1 className="categoria-titulo">{titulo}</h1>
        
        <div className="barra-filtros">
          <div 
            className="filtro-item lado-izquierdo boton-interactivo"
            onClick={() => setMostrarFiltros(!mostrarFiltros)}
          >
            <span>FILTER</span>
            <span className="icono-circulo">{mostrarFiltros ? '^' : 'v'}</span>
          </div>
          
          <div className="filtro-item centro">
            <span>{productosFiltrados.length} {productosFiltrados.length === 1 ? 'product' : 'products'}</span>
          </div>
          
          <div className="filtro-item lado-derecho boton-interactivo">
            <span>FEATURED</span>
            <span className="icono-circulo">v</span>
          </div>
        </div>

        {/* PANEL DESPLEGABLE DE FILTROS */}
        {mostrarFiltros && (
          <div className="panel-desplegable-filtros">
            <div className="grupo-filtro">
              <label>COLOR</label>
              <select value={filtroColor} onChange={(e) => setFiltroColor(e.target.value)}>
                <option value="">Todos los colores</option>
                <option value="Negro">Negro</option>
                <option value="Blanco">Blanco</option>
                <option value="Gris">Gris</option>
              </select>
            </div>

            <div className="grupo-filtro">
              <label>FIT</label>
              <select value={filtroCalce} onChange={(e) => setFiltroCalce(e.target.value)}>
                <option value="">Todos los calces</option>
                <option value="Oversized">Oversized</option>
                <option value="Boxy Fit">Boxy Fit</option>
                <option value="Regular">Regular</option>
              </select>
            </div>

            <button 
              className="btn-limpiar"
              onClick={() => { setFiltroColor(''); setFiltroCalce(''); }}
            >
              CLEAR
            </button>
          </div>
        )}
      </div>

      {/* GRILLA DE CATÁLOGO */}
      <div className="grilla-categoria">
        {productosFiltrados.map((producto) => {
          return (
            <Link to={`/producto/${producto.id}`} key={producto.id} className="tarjeta-destacada" style={{ textDecoration: 'none', color: 'inherit' }}>
              
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
                  <div className="espacio-vacio-categoria"></div>
                )}
              </div>

              {/* Solo el nombre del producto, sin la etiqueta del precio */}
              <div className="info-prenda-detalles">
                <h3>{producto.name?.es}</h3>
              </div>
              
            </Link>
          );
        })}
      </div>
    </section>
  );
};