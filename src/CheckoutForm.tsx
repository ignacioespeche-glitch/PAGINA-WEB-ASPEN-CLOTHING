// src/CheckoutForm.tsx
import { useState } from 'react';
import { useCart } from './CartContext';
import { validarCuponTiendanube, crearOrdenTiendanube, type CuponDescuento } from './services/tiendanube';

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

export const CheckoutForm = () => {
  const context = useCart();
  const carrito = context?.carrito ?? [];
  const totalPrecio = context?.totalPrecio ?? 0;
  
  // 🚀 IMPORTANTE: Traemos el costo de envío guardado globalmente desde el Context
  const costoEnvio = context?.costoEnvio ?? 0;
  
  // Extraemos la función mutadora de forma segura casteando el contexto
  const setCarrito = (context as any)?.setCarrito || (context as any)?.setCart || (useCart() as any).setCarrito;
  
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia'); 
  
  // Campos de datos obligatorios del cliente
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');

  // Estados locales para la tarjeta
  const [numeroTarjeta, setNumeroTarjeta] = useState('');
  const [mesVencimiento, setMesVencimiento] = useState('');
  const [anioVencimiento, setAnioVencimiento] = useState('');
  const [cvvTarjeta, setCvvTarjeta] = useState('');
  const [nombreTarjeta, setNombreTarjeta] = useState('');

  // Estados del sistema de cupones
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<CuponDescuento | null>(null);
  const [errorCupon, setErrorCupon] = useState('');

  // Estado de Compra Realizada Exitosamente
  const [compraExitosa] = useState(false);
  const [montoFinalCobrado, setMontoFinalCobrado] = useState(0);

  const meses = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const anioActual = 2026;
  const anios = Array.from({ length: 2070 - anioActual + 1 }, (_, i) => String(anioActual + i));

  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); 
    const formateado = input.match(/.{1,4}/g)?.join(' ') || ''; 
    if (formateado.length <= 19) { 
      setNumeroTarjeta(formateado);
    }
  };

  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); 
    if (input.length <= 3) {
      setCvvTarjeta(input);
    }
  };

  const obtenerMarcaTarjeta = (numero: string) => {
    const limpio = numero.replace(/\s+/g, '');
    if (limpio.startsWith('4')) return 'Visa';
    const prefijoDos = parseInt(limpio.substring(0, 2), 10);
    const prefijoCuatro = parseInt(limpio.substring(0, 4), 10);
    if ((prefijoDos >= 51 && prefijoDos <= 55) || (prefijoCuatro >= 2221 && prefijoCuatro <= 2720)) {
      return 'Mastercard';
    }
    return '';
  };

  const marcaDetectada = obtenerMarcaTarjeta(numeroTarjeta);

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
    
    if (!email || !nombre || !direccion) {
      alert("Por favor completa los campos obligatorios de identificación y envío primero.");
      return;
    }

    let datosTarjetaPayload = undefined;
    if (metodoPago === 'tarjeta') {
      if (!numeroTarjeta || !mesVencimiento || !anioVencimiento || !cvvTarjeta || !nombreTarjeta) {
        alert("Por favor completa todos los datos de tu tarjeta de crédito.");
        return;
      }
      const tarjetaLimpia = numeroTarjeta.replace(/\s+/g, '');
      datosTarjetaPayload = {
        marca: marcaDetectada || 'Desconocida',
        ultimosCuatro: tarjetaLimpia.substring(tarjetaLimpia.length - 4)
      };
    }

    const datosCliente = { email, nombre, telefono, direccion, localidad };
    setMontoFinalCobrado(montoFinalAMostrar);

    // Registramos la orden directa en la API de Tiendanube
    const respuestaApi = await crearOrdenTiendanube(datosCliente, carrito, metodoPago, cuponAplicado, datosTarjetaPayload);

    if (respuestaApi === "SUCCESS") {
      console.log("[Aspen] ¡Éxito! Orden impactada en Tiendanube.");

      // 🧼 1. VACIADO DE COMPRA EN EL FRONT-END
      if (typeof setCarrito === 'function') {
        setCarrito([]); 
      }
      localStorage.removeItem('aspen_cart');
      localStorage.removeItem('aspen_costo_envio');

      // 📲 2. EN CASO DE SER EFECTIVO, LANZAMOS EL MENSAJE AUTOMÁTICO DE WHATSAPP
      if (metodoPago === 'efectivo') {
        window.open(obtenerLinkWhatsAppEfectivo(), '_blank');
      } else if (metodoPago === 'transferencia') {
        // Opcional por si querés que les abra el mensaje de transferencia directo
        window.open(obtenerLinkWhatsAppTransferencia(), '_blank');
      }

      // 🏠 3. REDIRECCIÓN ABSOLUTA E INMEDIATA AL HOME PARA EVITAR RUTA ERRÓNEA
      window.location.href = '/';
      return;
    } else {
      alert("No se pudo sincronizar la orden con Tiendanube. Revisá los campos o la consola.");
    }
  };

  // VISTA 1: FALLBACK LOCAL DE ÉXITO (MANTENIDO POR RETROCOMPATIBILIDAD)
  if (compraExitosa) {
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
          Hola <strong>{nombre.toUpperCase()}</strong>, procesamos tu solicitud con éxito. En breve te estaremos enviando un mail formal con la confirmación de tu pedido y los detalles de tu facturación a <span>{email}</span>.
        </p>

        <div style={{ border: '1px solid #000', padding: '24px', textAlign: 'left', backgroundColor: '#fafafa', marginBottom: '32px' }}>
          <h3 style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '1px', margin: '0 0 16px 0', textTransform: 'uppercase', borderBottom: '1px solid #eee', paddingBottom: '8px' }}>
            Resumen del Pago
          </h3>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Método elegido:</strong> {metodoPago === 'tarjeta' ? `Tarjeta de Crédito (${marcaDetectada.toUpperCase()})` : metodoPago === 'transferencia' ? 'Transferencia Bancaria' : 'Efectivo (Rapipago / Pago Fácil)'}</p>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Destino de entrega:</strong> {direccion}, {localidad || 'Mendoza'}</p>
          <p style={{ margin: '6px 0', fontSize: '12px' }}><strong>Costo de Envío:</strong> ${costoEnvio.toLocaleString('es-AR')},00</p>
          <p style={{ margin: '12px 0 0 0', fontSize: '13px', fontWeight: 700, paddingTop: '12px', borderTop: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
            <span>TOTAL DE LA ORDEN:</span>
            <span>${montoFinalCobrado.toLocaleString('es-AR')},00</span>
          </p>
        </div>

        <button 
          type="button" 
          onClick={(e) => {
            e.preventDefault();
            localStorage.clear(); 
            if (typeof setCarrito === 'function') {
              setCarrito([]);
            }
            window.location.href = '/';
          }}
          style={{ width: '100%', background: '#fff', color: '#000', border: '1px solid #000', padding: '16px', fontWeight: 700, fontSize: '11px', letterSpacing: '1.5px', cursor: 'pointer', textTransform: 'uppercase' }}
        >
          VOLVER AL INICIO
        </button>
      </div>
    );
  }

  // VISTA 2: FORMULARIO DE CHECKOUT
  return (
    <div className="checkout-container" style={{ padding: '140px max(4vw, 20px) 40px max(4vw, 20px)', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={handlePagarAhoraSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '80px', alignItems: 'start' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '40px' }}>
          
          {/* BLOQUE 1: IDENTIFICACIÓN Y ENVÍO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <h2 style={{ fontSize: '13px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '12px', margin: 0 }}>
              1. IDENTIFICACIÓN Y ENVÍO
            </h2>
            <input type="email" placeholder="EMAIL *" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="NOMBRE COMPLETO *" required value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="TELÉFONO" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
            <input type="text" placeholder="DIRECCIÓN Y NÚMERO *" required value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
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
                <span style={{ fontSize: '11px', fontWeight: 700, color: '#000', backgroundColor: '#eee', padding: '4px 8px', letterSpacing: '0.5px' }}>3 CUOTAS SIN INTERÉS (+20%)</span>
              </label>
            </div>

            <div style={{ marginTop: '4px' }}>
              {metodoPago === 'tarjeta' && (
                <div style={{ border: '1px solid #000', padding: '24px', backgroundColor: '#fff', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #eee', paddingBottom: '12px', marginBottom: '4px' }}>
                    <span style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '0.5px' }}>TARJETA DE CRÉDITO</span>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <span style={{ fontSize: '9px', fontWeight: 700, border: marcaDetectada === 'Visa' ? '2px solid #000' : '1px solid #ccc', padding: '2px 6px', color: '#1A458B', backgroundColor: marcaDetectada === 'Visa' ? '#f0f4ff' : 'transparent' }}>VISA</span>
                      <span style={{ fontSize: '9px', fontWeight: 700, border: marcaDetectada === 'Mastercard' ? '2px solid #000' : '1px solid #ccc', padding: '2px 6px', color: '#EA3435', backgroundColor: marcaDetectada === 'Mastercard' ? '#fff0f0' : 'transparent' }}>MC</span>
                    </div>
                  </div>

                  <input type="text" placeholder="NÚMERO DE TARJETA" value={numeroTarjeta} onChange={handleNumeroTarjetaChange} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '1px solid #000', padding: '6px 10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8px', color: '#666', fontWeight: 700, letterSpacing: '0.5px' }}>MES</span>
                        <select value={mesVencimiento} onChange={(e) => setMesVencimiento(e.target.value)} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', padding: '4px 0' }}>
                          <option value="">--</option>
                          {meses.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee', paddingLeft: '8px' }}>
                        <span style={{ fontSize: '8px', color: '#666', fontWeight: 700, letterSpacing: '0.5px' }}>AÑO</span>
                        <select value={anioVencimiento} onChange={(e) => setAnioVencimiento(e.target.value)} style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', padding: '4px 0' }}>
                          <option value="">----</option>
                          {anios.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>
                    <input type="text" placeholder="CÓDIGO SEG." value={cvvTarjeta} onChange={handleCvvChange} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
                  </div>

                  <input type="text" placeholder="NOMBRE COMO FIGURA EN LA TARJETA" value={nombreTarjeta} onChange={(e) => setNombreTarjeta(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none', textTransform: 'uppercase' }} />
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

          <button type="submit" style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '18px', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', marginTop: '10px' }}>
            {metodoPago === 'efectivo' ? 'SOLICITAR CUPÓN Y PAGAR' : 'PAGAR AHORA'}
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

          {/* RESUMEN DE COSTOS DETALLADO */}
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