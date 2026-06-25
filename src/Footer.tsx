// src/components/Footer/Footer.jsx
import { Link } from 'react-router-dom';

export const Footer = () => {
  return (
    <footer className="main-footer-black">
      
      {/* COLUMNAS DE LINKS E INFO */}
      <div className="footer-links-grid">
        
        <div className="footer-col">
          <h4>CATEGORÍAS</h4>
          <Link to="/">INICIO</Link>
          <Link to="/superior">SUPERIOR</Link>
          <Link to="/inferior">INFERIOR</Link>
          <Link to="/accesorios">ACCESORIOS</Link>
        </div>
        
        <div className="footer-col">
          <h4>CONTACTÁNOS</h4>
          <p>542612515727</p>
          <p>2612515727</p>
          <p>ASPENN.MDZ@GMAIL.COM</p>
          <p>MONTEVIDEO 27</p>
        </div>
        
        <div className="footer-col brand-col">
          <h4>EL PROYECTO</h4>
          <p>
            ASPEN CLOTHING es un proyecto diseñado para redefinir el concepto de Exclusividad. 
            Empezamos diseñando lo que nosotros mismos queríamos usar y no podíamos encontrar. 
            Cada prenda, cada corte y cada detalle está pensado para quienes entienden que el verdadero lujo está en lo simple.
          </p>
        </div>

        {/* 📸 COLUMNA DE INSTAGRAM CON INYECCIÓN DE ESTILOS DIRECTOS */}
        <div className="footer-col icon-col" style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
          <a 
            href="https://instagram.com/aspenclothing__" 
            target="_blank" 
            rel="noreferrer" 
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', textDecoration: 'none', color: 'inherit' }}
          >
            <img 
              src="/images/logo ig.png" 
              alt="Instagram Aspen" 
              style={{ 
                width: '80px', 
                height: '80px', 
                maxWidth: '80px', 
                maxHeight: '80px', 
                objectFit: 'contain', 
                display: 'block', 
                margin: '0 auto' 
              }} 
            />
            <span style={{ fontSize: '12px', fontWeight: '500', letterSpacing: '1.5px', textAlign: 'center', display: 'block' }}>
            </span>
          </a>
        </div>

      </div>

      {/* SECCIÓN MEDIOS DE PAGO */}
      <div className="medios-de-pago-section">
        <h4>MEDIOS DE PAGO</h4>
        <div className="logos-pago">
          <img src="/images/bancos.png" alt="Todos los medios de pago" className="imagen-bancos" />
        </div>
      </div>

      {/* LOGO GIGANTE ASPEN */}
      <div className="footer-logo-gigante">
        <img src="/images/LOGO BLANCO.png" alt="ASPEN CLOTHING" className="footer-logo-img" />
      </div>

      {/* COPYRIGHT Y LEGALES */}
      <div className="footer-copyright">
        <p>COPYRIGHT ASPEN - 20418854317 - 2026. TODOS LOS DERECHOS RESERVADOS.</p>
        <p>
          DEFENSA DE LAS Y LOS CONSUMIDORES. 
          <a href="https://autogestion.produccion.gob.ar/consumidores" target="_blank" rel="noreferrer" className="link-legal">
             PARA RECLAMOS INGRESÁ ACÁ. 
          </a> 
          / 
          <a href="https://wa.me/542612515727?text=Hola%20Aspen..." target="_blank" rel="noreferrer" className="link-legal">
             BOTÓN DE ARREPENTIMIENTO
          </a>
        </p>
      </div>

    </footer>
  );
};