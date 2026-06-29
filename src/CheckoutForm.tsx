// src/CheckoutForm.tsx
import { useState } from 'react';
import { useCart } from './CartContext';
import { validarCuponTiendanube, crearOrdenTiendanube, type CuponDescuento } from './services/tiendanube';

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

export const CheckoutForm = () => {
  const { carrito, totalPrecio } = useCart();
  
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

  // Generación de arrays para el cuestionario de fecha (Mes: 01-12 / Año: 2026-2036)
  const meses = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
  const anioActual = new Date().getFullYear(); // 2026
  const anios = Array.from({ length: 11 }, (_, i) => String(anioActual + i));

  // Formateador analítico para espaciar el número cada 4 dígitos
  const handleNumeroTarjetaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); 
    const formateado = input.match(/.{1,4}/g)?.join(' ') || ''; 
    if (formateado.length <= 19) { 
      setNumeroTarjeta(formateado);
    }
  };

  // Limitador estricto para el código de seguridad a máximo 3 dígitos
  const handleCvvChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value.replace(/\D/g, ''); 
    if (input.length <= 3) {
      setCvvTarjeta(input);
    }
  };

  // Función para detectar si es Visa o Mastercard
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

  // Lógica matemática del carro y beneficios
  let descuentoCalculado = 0;
  if (cuponAplicado) {
    if (cuponAplicado.tipo === 'percentage') {
      descuentoCalculado = Math.round(totalPrecio * (cuponAplicado.valor / 100));
    } else {
      descuentoCalculado = cuponAplicado.valor;
    }
  }

  const subtotalConDescuento = Math.max(0, totalPrecio - descuentoCalculado);
  const precioBaseCatalogo = subtotalConDescuento;
  const precioConRecargoTarjeta = Math.round(subtotalConDescuento * 1.20); 
  const montoFinalAMostrar = metodoPago === 'tarjeta' ? precioConRecargoTarjeta : precioBaseCatalogo;

  const obtenerLinkWhatsAppEfectivo = () => {
    const telefonoLocal = '542612515727';
    const nombreCliente = nombre.trim() || '[Ingresar Nombre]';
    const totalPedido = montoFinalAMostrar.toLocaleString('es-AR');
    
    const mensaje = `Hola chicos de Aspen! Necesito el cupón / QR para pagar en Rapipago o Pago Fácil.\n\nMis datos son:\n• Nombre: ${nombreCliente}\n• Total neto: $${totalPedido},00`;
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
        alert("Por favor completa todos los datos de tu tarjeta de crédito, incluyendo el mes y año de vencimiento.");
        return;
      }
      
      const tarjetaLimpia = numeroTarjeta.replace(/\s+/g, '');
      datosTarjetaPayload = {
        marca: marcaDetectada || 'Desconocida',
        ultimosCuatro: tarjetaLimpia.substring(tarjetaLimpia.length - 4)
      };
    }

    const datosCliente = { email, nombre, telefono, direccion, localidad };
    const ordenGuardada = await crearOrdenTiendanube(datosCliente, carrito, metodoPago, cuponAplicado, datosTarjetaPayload);

    if (!ordenGuardada) {
      alert("Tuvimos un problema al sincronizar la venta con Tiendanube. Por favor intenta nuevamente.");
      return;
    }

    if (metodoPago === 'tarjeta') {
      alert(`¡Venta con Tarjeta ${marcaDetectada.toUpperCase()} registrada con éxito en el panel de Tiendanube por $${montoFinalAMostrar.toLocaleString('es-AR')},00!`);
    } else if (metodoPago === 'efectivo') {
      window.open(obtenerLinkWhatsAppEfectivo(), '_blank');
    } else {
      alert(`¡Pedido registrado con éxito en tu panel de Tiendanube! Te enviaremos los detalles para coordinar la transferencia.`);
    }
  };

  return (
    <div className="checkout-container" style={{ padding: '140px max(4vw, 20px) 40px max(4vw, 20px)', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      <form onSubmit={handlePagarAhoraSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '80px', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA */}
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

                  <input 
                    type="text" 
                    placeholder="NÚMERO DE TARJETA" 
                    value={numeroTarjeta} 
                    onChange={handleNumeroTarjetaChange} 
                    style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} 
                  />
                  
                  {/* Fila de Vencimiento Estilo Cuestionario Desplegable y Código de Seguridad */}
                  <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '16px' }}>
                    
                    {/* Contenedor del Cuestionario de Vencimiento Separado */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', border: '1px solid #000', padding: '6px 10px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontSize: '8px', color: '#666', fontWeight: 700, letterSpacing: '0.5px' }}>MES</span>
                        <select 
                          value={mesVencimiento} 
                          onChange={(e) => setMesVencimiento(e.target.value)}
                          style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', padding: '4px 0' }}
                        >
                          <option value="">--</option>
                          {meses.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', borderLeft: '1px solid #eee', paddingLeft: '8px' }}>
                        <span style={{ fontSize: '8px', color: '#666', fontWeight: 700, letterSpacing: '0.5px' }}>AÑO</span>
                        <select 
                          value={anioVencimiento} 
                          onChange={(e) => setAnioVencimiento(e.target.value)}
                          style={{ border: 'none', backgroundColor: 'transparent', outline: 'none', fontSize: '11px', fontFamily: 'Inter, sans-serif', cursor: 'pointer', padding: '4px 0' }}
                        >
                          <option value="">----</option>
                          {anios.map(a => <option key={a} value={a}>{a}</option>)}
                        </select>
                      </div>
                    </div>

                    <input 
                      type="text" 
                      placeholder="CÓDIGO SEG." 
                      value={cvvTarjeta} 
                      onChange={handleCvvChange} 
                      style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} 
                    />
                  </div>

                  <input 
                    type="text" 
                    placeholder="NOMBRE COMO FIGURA EN LA TARJETA" 
                    value={nombreTarjeta} 
                    onChange={(e) => setNombreTarjeta(e.target.value)} 
                    style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none', textTransform: 'uppercase' }} 
                  />

                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', marginTop: '4px' }}>
                    <input type="checkbox" defaultChecked style={{ accentColor: '#000' }} />
                    <span style={{ fontSize: '11px', color: '#555' }}>Utilizar la misma dirección para la facturación</span>
                  </label>
                </div>
              )}

              {metodoPago === 'transferencia' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>DATOS DE NUESTRA CUENTA:</p>
                  <p style={{ margin: 0 }}><strong>BANCO:</strong> MERCADO PAGO</p>
                  <p style={{ margin: 0 }}><strong>ALIAS:</strong> aspen.mdz</p>
                  <p style={{ margin: 0 }}><strong>TITULAR:</strong> GIULIANO MICARELLI</p>
                  <p style={{ margin: '10px 0 0 0', color: '#555', fontSize: '11px' }}>* Transferí el monto neto de <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong> y dale al botón de abajo para finalizar.</p>
                </div>
              )}

              {metodoPago === 'efectivo' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <p style={{ margin: 0, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Solicitud de Cupón de Cobro:</p>
                  <p style={{ margin: 0, color: '#333', lineHeight: '1.6' }}>
                    Al hacer clic en el botón negro de abajo, el sistema enviará tu orden y abrirá el canal directo con nuestro local para despacharte el código de barra o QR de cobro por un total neto de <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong>.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN DEFINITIVO */}
          <button 
            type="submit" 
            style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '18px', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', marginTop: '10px' }}
          >
            {metodoPago === 'efectivo' ? 'SOLICITAR CUPÓN Y PAGAR' : 'PAGAR AHORA'}
          </button>
        </div>

        {/* COLUMNA DERECHA PERMANENTE */}
        <div style={{ background: 'transparent', padding: '35px 0 max(4vw, 20px) 0', border: 'none' }}>
          <h3 style={{ fontSize: '12px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: '25px', color: '#000' }}>
            RESUMEN DEL PEDIDO ({carrito.reduce((acc, item) => acc + item.cantidad, 0)})
          </h3>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '25px', borderBottom: '1px solid #000', paddingBottom: '25px' }}>
            {carrito.map((item, index) => {
              const precioIndividualConRecargo = Math.round(item.precio * 1.20);
              const precioAMostrarPorItem = metodoPago === 'tarjeta' ? precioIndividualConRecargo : item.precio;

              return (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '16px', justifyContent: 'space-between', fontSize: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <img src={item.imagen} alt={item.nombre} style={{ width: '40px', height: '55px', objectFit: 'cover' }} />
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, textTransform: 'uppercase', fontSize: '11px' }}>{item.nombre}</p>
                      <p style={{ margin: '4px 0 0 0', color: '#666', fontSize: '11px' }}>Talle: {item.talle} × {item.cantidad}</p>
                    </div>
                  </div>
                  <strong style={{ fontSize: '12px' }}>${(precioAMostrarPorItem * item.cantidad).toLocaleString('es-AR')},00</strong>
                </div>
              );
            })}
          </div>

          {/* SECCIÓN CUPÓN DE DESCUENTO */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '25px', borderBottom: '1px solid #000', paddingBottom: '25px' }}>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input 
                type="text" 
                placeholder="CÓDIGO DE DESCUENTO" 
                value={cuponInput} 
                onChange={(e) => setCuponInput(e.target.value)} 
                style={{ flex: 1, padding: '12px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', outline: 'none' }}
              />
              <button type="button" onClick={handleAplicarCupon} style={{ background: '#000', color: '#fff', border: 'none', padding: '0 24px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}>
                APLICAR
              </button>
            </div>
            
            {cuponAplicado && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#059669', letterSpacing: '0.5px' }}>
                ✓ CUPÓN {cuponAplicado.codigo} APLICADO ({cuponAplicado.tipo === 'percentage' ? `${cuponAplicado.valor}% OFF` : `$${cuponAplicado.valor.toLocaleString('es-AR')} OFF`})
              </span>
            )}
            {errorCupon && (
              <span style={{ fontSize: '10px', fontWeight: 700, color: '#DC2626', letterSpacing: '0.5px' }}>
                ✕ {errorCupon}
              </span>
            )}
          </div>

          {/* DESGLOSE FINAL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#000', fontWeight: 500 }}>
              <span>SUBTOTAL:</span>
              <span>${totalPrecio.toLocaleString('es-AR')},00</span>
            </div>
            
            {descuentoCalculado > 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#059669', fontWeight: 600 }}>
                <span>DESCUENTO:</span>
                <span>-${descuentoCalculado.toLocaleString('es-AR')},00</span>
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px', borderTop: '1px solid #000', paddingTop: '14px' }}>
              <span>TOTAL NETO:</span>
              <span>${montoFinalAMostrar.toLocaleString('es-AR')},00</span>
            </div>
            
            {metodoPago === 'tarjeta' && (
              <span style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', alignSelf: 'flex-end', marginTop: '-4px' }}>
                O 3 cuotas sin interés de ${(Math.round(precioConRecargoTarjeta / 3)).toLocaleString('es-AR')},00
              </span>
            )}
          </div>
        </div>

      </form>
    </div>
  );
};