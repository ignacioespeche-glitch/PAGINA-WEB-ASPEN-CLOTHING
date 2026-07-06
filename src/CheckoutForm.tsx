// src/CheckoutForm.tsx
import { useState } from 'react';
import { useCart } from './CartContext';
import { validarCuponTiendanube, crearOrdenTiendanube, generarLinkMercadoPago, type CuponDescuento } from './services/tiendanube';

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

export const CheckoutForm = () => {
  const context = useCart();
  const carrito = context?.carrito ?? [];
  const totalPrecio = context?.totalPrecio ?? 0;
  const costoEnvio = context?.costoEnvio ?? 0;
  
  const setCarrito = (context as any)?.setCarrito || (context as any)?.setCart || (useCart() as any).setCarrito;
  
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia'); 
  
  // Campos de datos obligatorios del cliente
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');

  // Estado para capturar errores estéticos
  const [errorPasarela, setErrorPasarela] = useState(''); 

  // Estados del sistema de cupones
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<CuponDescuento | null>(null);
  const [errorCupon, setErrorCupon] = useState('');

  // Estado de Compra Realizada Exitosamente
  const [compraExitosa, setCompraExitosa] = useState(false); 
  const [montoFinalCobrado, setMontoFinalCobrado] = useState(0);

  const [cargandoPasarela, setCargandoPasarela] = useState(false);

  let descuentoCalculado = 0;
  if (cuponAplicado) {
    if (cuponAplicado.tipo === 'percentage') {
      descuentoCalculado = Math.round(totalPrecio * (cuponAplicado.valor / 100));
    } else {
      descuentoCalculado = cuponAplicado.valor;
    }
  }

  const subtotalConDescuento = Math.max(0, totalPrecio - descuentoCalculado);
  const precioBaseCatalogo = subtotalConDescuento + costoEnvio;
  const precioConRecargoTarjeta = Math.round((subtotalConDescuento + costoEnvio) * 1.20); 
  const montoFinalAMostrar = metodoPago === 'tarjeta' ? precioConRecargoTarjeta : precioBaseCatalogo;

  const obtenerLinkWhatsAppEfectivo = () => {
    const telefonoLocal = '542612515727';
    const nombreCliente = nombre.trim() || '[Ingresar Nombre]';
    const totalPedido = montoFinalAMostrar.toLocaleString('es-AR');
    const mensaje = `Hola Aspen! Necesito el cupón / QR para pagar en Rapipago o Pago Fácil.\n\nMis datos son:\n• Nombre: ${nombreCliente}\n• Total neto (con envío): $${totalPedido},00`;
    return `https://wa.me/${telefonoLocal}?text=${encodeURIComponent(mensaje)}`;
  };

  const obtenerLinkWhatsAppTransferencia = () => {
    const telefonoLocal = '542612515727';
    const nombreCliente = nombre.trim() || '[Ingresar Nombre]';
    const totalPedido = montoFinalAMostrar.toLocaleString('es-AR');
    const mensaje = `Hola Aspen! Soy ${nombreCliente}.\n\nAcabo de realizar la transferencia por un total de $${totalPedido},00 correspondiente a mi pedido (envío incluido). Adjunto el comprobante de pago para su verificación.`;
    return `https://wa.me/${telefonoLocal}?text=${encodeURIComponent(mensaje)}`;
  };

  const handleAplicarCupon = async () => {
    setErrorCupon('');
    if (!cuponInput.trim()) return;
    const resultado = await validarCuponTiendanube(cuponInput);
    if (resultado) {
      setCuponAplicado(resultado);
      setErrorCupon('');
    } else {
      setCuponAplicado(null);
      setErrorCupon('CÓDIGO INEXISTENTE O INACTIVO');
    }
  };

  const handlePagarAhoraSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorPasarela(''); 
    
    if (!email.trim() || !nombre.trim() || !direccion.trim()) {
      setErrorPasarela("POR FAVOR COMPLETA LOS CAMPOS OBLIGATORIOS DE ENVÍO.");
      return;
    }

    setCargandoPasarela(true);
    const datosCliente = { email, nombre, telefono, direccion, localidad };
    setMontoFinalCobrado(montoFinalAMostrar);

    // 1️⃣ SE IMPACTA PRIMERO LA VENTA EN TIENDANUBE Y SE DESCUENTA EL STOCK
    const respuestaApiUrl = await crearOrdenTiendanube(
      datosCliente, 
      carrito, 
      metodoPago, 
      cuponAplicado
    );

    // 2️⃣ SI LA VENTA SE REGISTRÓ CON ÉXITO, SE PROCEDE CON EL DESVÍO CORRESPONDIENTE
    if (respuestaApiUrl === "SUCCESS") {
      
      if (metodoPago === 'tarjeta') {
        const productosMP = carrito.map((item: any) => {
          const precioIndividualConRecargo = Math.round((item.precio || 0) * 1.20);
          return {
            titulo: item.nombre || "Prenda Aspen",
            cantidad: Number(item.cantidad || 1),
            precio: precioIndividualConRecargo
          };
        });

        // Llamamos a tu pasarela de Mercado Pago que quedó intacta y funcionando
        const linkMercadoPago = await generarLinkMercadoPago(productosMP);
        setCargandoPasarela(false);

        if (linkMercadoPago) {
          localStorage.removeItem('aspen_cart');
          localStorage.removeItem('aspen_costo_envio');
          if (typeof setCarrito === 'function') setCarrito([]);
          
          window.location.href = linkMercadoPago; // Redirección directa a la pasarela bancaria
          return;
        } else {
          setErrorPasarela("LA VENTA SE REGISTRÓ, PERO NO SE PUDO GENERAR EL LINK DE MERCADO PAGO. CONTACTATE CON SOPORTE.");
          return;
        }
      }

      // Manejo tradicional offline para efectivo y transferencia por WhatsApp
      if (metodoPago === 'efectivo') {
        window.open(obtenerLinkWhatsAppEfectivo(), '_blank');
      } else if (metodoPago === 'transferencia') {
        window.open(obtenerLinkWhatsAppTransferencia(), '_blank');
      }

      localStorage.removeItem('aspen_cart');
      localStorage.removeItem('aspen_costo_envio');
      setCompraExitosa(true);
      setCargandoPasarela(false);
      return;

    } else {
      setCargandoPasarela(false);
      setErrorPasarela("NO SE PUDO SINCRONIZAR LA ORDEN CON TIENDANUBE. INTENTE MÁS TARDE.");
    }
  };

  if (compraExitosa) {
    const montoSeguro = (montoFinalCobrado || 0).toLocaleString('es-AR');
    const envioSeguro = (costoEnvio || 0).toLocaleString('es-AR');

    return (
      <div style={{ padding: '160px max(4vw, 20px) 80px max(4vw, 20px)', minHeight: '75vh', fontFamily: 'Inter, sans-serif', display: 'block', maxWidth: '600px', margin: '0 auto', textAlign: 'center' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '64px', height: '64px', borderRadius: '50%', backgroundColor: '#f0fdf4', marginBottom: '24px' }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
        </div>
        
        <h1 style={{ fontSize: '20px', fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase', margin: '0 0 12px 0', color: '#000' }}>
          ¡COMPRA REALIZADA CORRECTAMENTE!
        </h1>
        
        <p style={{ fontSize: '13px', color: '#555', lineHeight: '1.6', margin: '0 0 32px 0' }}>
          Hola <strong>{nombre.toUpperCase()}</strong>, procesamos tu solicitud con éxito. Tu orden ya impactó en nuestro systema. En breve te enviaremos la confirmación de facturación a <span>{email}</span>.
        </p>

        <div style={{ border: '1px solid #000', padding: '24px', textAlign: 'left', backgroundColor: '#fafafa', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 16px 0', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            Comprobante del Pedido
          </h3>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Método de pago:</strong> {metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo (Rapipago / Pago Fácil)'}</p>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Destino de entrega:</strong> {direccion}, {localidad || 'Mendoza'}</p>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Costo de Envío:</strong> ${envioSeguro},00</p>
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', fontWeight: 700, paddingTop: '12px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <span>TOTAL PROCESADO:</span>
            <span>${montoSeguro},00</span>
          </p>
        </div>

        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            if (typeof setCarrito === 'function') {
              setCarrito([]);
            }
            window.location.href = '/';
          }}
          style={{ width: '100%', background: '#000', color: '#fff', border: '1px solid #000', padding: '16px', fontWeight: 700, fontSize: '11px', letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  return (
    <div className="checkout-container" style={{ padding: '140px max(4vw, 20px) 40px max(4vw, 20px)', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={handlePagarAhoraSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '80px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* BLOQUE 1: IDENTIFICACIÓN Y ENVÍO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '12px', margin: 0 }}>
              1. IDENTIFICACIÓN Y ENVÍO
            </h2>
            <input type="email" placeholder="EMAIL *" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="NOMBRE COMPLETO *" value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="TELÉFONO" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="DIRECCIÓN Y NÚMERO *" value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="CIUDAD / LOCALIDAD" value={localidad} onChange={(e) => setLocalidad(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
          </div>

          {/* BLOQUE 2: MEDIO DE PAGO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '12px', margin: 0 }}>
              2. MEDIO DE PAGO
            </h2>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #000', cursor: 'pointer', backgroundColor: metodoPago === 'transferencia' ? '#fcfcfc' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="radio" name="payment_method" checked={metodoPago === 'transferencia'} onChange={() => setMetodoPago('transferencia')} style={{ accentColor: '#000' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>TRANSFERENCIA BANCARIA DIRECTA</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>PRECIO PROMO CATÁLOGO</span>
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #000', cursor: 'pointer', backgroundColor: metodoPago === 'efectivo' ? '#fcfcfc' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="radio" name="payment_method" checked={metodoPago === 'efectivo'} onChange={() => setMetodoPago('efectivo')} style={{ accentColor: '#000' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>EFECTIVO (RAPIPAGO / PAGO FÁCIL)</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#059669' }}>PRECIO PROMO CATÁLOGO</span>
              </label>

              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', border: '1px solid #000', cursor: 'pointer', backgroundColor: metodoPago === 'tarjeta' ? '#fcfcfc' : '#fff' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <input type="radio" name="payment_method" checked={metodoPago === 'tarjeta'} onChange={() => setMetodoPago('tarjeta')} style={{ accentColor: '#000' }} />
                  <span style={{ fontSize: '12px', fontWeight: 600, letterSpacing: '0.5px' }}>TARJETA DE CRÉDITO o DÉBITO</span>
                </div>
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#000', backgroundColor: '#eee', padding: '4px 8px', letterSpacing: '0.5px' }}>OPCIONES EN CUOTAS (+20%)</span>
              </label>
            </div>

            <div style={{ marginTop: '4px' }}>
              {metodoPago === 'tarjeta' && (
                <div style={{ border: '1px solid #000', padding: '32px 24px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '12px', textAlign: 'center', alignItems: 'center' }}>
                  <p style={{ margin: 0, fontSize: '12px', color: '#000', fontWeight: 700, letterSpacing: '0.5px' }}>
                    🔒 Entorno Certificado y Protegido (Mercado Pago)
                  </p>
                  <p style={{ margin: 0, fontSize: '11px', color: '#555', lineHeight: '1.6', maxWidth: '450px' }}>
                    Al confirmar la compra abajo, serás redirigido de forma totalmente encriptada bajo las normas de seguridad oficiales de <strong>Mercado Pago</strong>. Allí podrás colocar los datos reales de tu tarjeta y seleccionar hasta tus <strong>3 cuotas sin interés</strong> con total tranquilidad y resguardo bancario.
                  </p>
                </div>
              )}

              {metodoPago === 'transferencia' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>DATOS DE NUESTRA CUENTA:</p>
                  <p style={{ margin: 0 }}><strong>BANCO:</strong> MERCADO PAGO</p>
                  <p style={{ margin: 0 }}><strong>ALIAS:</strong> aspen.mdz</p>
                  <p style={{ margin: 0 }}><strong>TITULAR:</strong> GIULIANO MICARELLI</p>
                </div>
              )}

              {metodoPago === 'efectivo' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solicitud de Cupón de Cobro:</p>
                  <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>
                    Al confirmar tu pedido abajo, la app registrará la compra y abrirá la línea de WhatsApp corporativa para despacharte el código de barra o QR por el monto neto de <strong>${montoFinalAMostrar.toLocaleString('es-AR')},00</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {errorPasarela && (
            <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', letterSpacing: '1px', textTransform: 'uppercase', marginTop: '10px', display: 'block' }}>
              ✕ {errorPasarela}
            </span>
          )}

          <button 
            type="submit" 
            disabled={cargandoPasarela}
            style={{ width: '100%', background: cargandoPasarela ? '#666' : '#000', color: '#fff', border: 'none', padding: '18px', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', marginTop: '10px' }}
          >
            {cargandoPasarela ? 'VERIFICANDO ENTORNO...' : metodoPago === 'tarjeta' ? 'PAGAR CON MERCADO PAGO' : metodoPago === 'efectivo' ? 'SOLICITAR CUPÓN Y PAGAR' : 'PAGAR AHORA'}
          </button>
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ background: 'transparent', padding: '35px 0 max(4vw, 20px) 0', border: 'none' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '25px', color: '#000' }}>
            RESUMEN DEL PEDIDO ({carrito.reduce((acc, item) => acc + (item?.cantidad ?? 0), 0)})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px', borderBottom: '1px solid #000', paddingBottom: '25px' }}>
            {carrito.map((item, index) => {
              if (!item) return null;
              const precioIndividualConRecargo = Math.round((item.precio || 0) * 1.20);
              const precioAMostrarPorItem = metodoPago === 'tarjeta' ? precioIndividualConRecargo : (item.precio || 0);

              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={item.imagen} alt={item.nombre} style={{ width: '40px', height: '55px', objectFit: 'cover' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>{item.nombre}</p>
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '11px' }}>Talle: {item.talle} × {item.cantidad}</p>
                    </div>
                  </div>
                  <strong style={{ fontSize: '12px' }}>${(precioAMostrarPorItem * (item.cantidad || 1)).toLocaleString('es-AR')},00</strong>
                </div>
              );
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px', borderBottom: '1px solid #000', paddingBottom: '25px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input type="text" placeholder="CÓDIGO DE DESCUENTO" value={cuponInput} onChange={(e) => setCuponInput(e.target.value)} style={{ flex: 1, padding: '12px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', outline: 'none' }} />
              <button type="button" onClick={handleAplicarCupon} style={{ background: '#000', color: '#fff', border: 'none', padding: '0 24px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}>
                APLICAR
              </button>
            </div>
            {cuponAplicado && <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669' }}>✓ CUPÓN {cuponAplicado.codigo} APLICADO</span>}
            {errorCupon && <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626' }}>✕ {errorCupon}</span>}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
              <span>SUBTOTAL:</span>
              <span>${totalPrecio.toLocaleString('es-AR')},00</span>
            </div>
            
            {descuentoCalculado > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                <span>DESCUENTO:</span>
                <span>-${descuentoCalculado.toLocaleString('es-AR')},00</span>
              </div>
            )}

            {costoEnvio > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px' }}>
                <span>COSTO DE ENVÍO:</span>
                <span>${costoEnvio.toLocaleString('es-AR')},00</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, borderTop: '1px solid #000', paddingTop: '14px' }}>
              <span>TOTAL NETO:</span>
              <span>${montoFinalAMostrar.toLocaleString('es-AR')},00</span>
            </div>
          </div>
        </div>

      </form>
    </div>
  );
};