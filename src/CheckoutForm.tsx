// src/CheckoutForm.tsx
import { useState } from 'react';
import { useCart } from './CartContext';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';
import { validarCuponTiendanube, type CuponDescuento } from './services/tiendanube';

initMercadoPago('YOUR_PUBLIC_KEY_HERE');

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

export const CheckoutForm = () => {
  const { carrito, totalPrecio } = useCart();
  
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia'); 
  
  // Campos de datos obligatorios
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');

  // Estados del sistema de cupones
  const [cuponInput, setCuponInput] = useState('');
  const [cuponAplicado, setCuponAplicado] = useState<CuponDescuento | null>(null);
  const [errorCupon, setErrorCupon] = useState('');

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

  // Manejador del botón único final "PAGAR AHORA"
  const handlePagarAhoraSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validación global previa
    if (!email || !nombre || !direccion) {
      alert("Por favor completa los campos obligatorios de identificación y envío primero.");
      return;
    }

    if (metodoPago === 'tarjeta') {
      // Si elige tarjeta, el flujo lo maneja internamente el Brick de Mercado Pago
      alert("Por favor, completá los datos de tu tarjeta en el módulo de Mercado Pago abajo y presioná el botón de la pasarela.");
    } else {
      // Flujo directo para transferencia o efectivo
      alert(`¡Pedido de Aspen registrado con éxito! Procesado por método: ${metodoPago.toUpperCase()}. Te enviaremos los detalles de tu orden.`);
    }
  };

  const handlePaymentSubmit = async (param: any) => {
    try {
      console.log("Datos enviados a backend:", param.formData);
      alert("¡Pago con tarjeta procesado con éxito en Aspen Clothing!");
    } catch (error) {
      console.error("Error al procesar pago con tarjeta:", error);
    }
  };

  const mercadoPagoCustomization: any = {
    visual: { style: { theme: 'flat' } },
    paymentMethods: {
      maxInstallments: 3,
      types: { excluded: ['ticket', 'bank_transfer'] }
    }
  };

  return (
    <div className="checkout-container" style={{ padding: '140px max(4vw, 20px) 40px max(4vw, 20px)', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      
      {/* Todo el checkout envuelto en una estructura única de envío */}
      <form onSubmit={handlePagarAhoraSubmit} style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '80px', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA CONTINUA (Mismo flujo que Captura de pantalla 2026-06-29 143629.png) */}
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

          {/* BLOQUE 2: MEDIO DE PAGO (Aparece inmediatamente abajo sin pasos intermedios) */}
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

            {/* Módulos dinámicos informativos o Bricks de pasarela */}
            <div style={{ marginTop: '4px' }}>
              {metodoPago === 'tarjeta' && (
                <div className="mercadopago-brick-container" style={{ border: '1px solid #000', padding: '16px', backgroundColor: '#fff' }}>
                  <Payment
                    initialization={{ amount: precioConRecargoTarjeta, preferenceId: undefined }}
                    customization={mercadoPagoCustomization}
                    onSubmit={handlePaymentSubmit}
                  />
                </div>
              )}

              {metodoPago === 'transferencia' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>DATOS DE NUESTRA CUENTA:</p>
                  <p style={{ margin: 0 }}><strong>BANCO:</strong> Galicia</p>
                  <p style={{ margin: 0 }}><strong>ALIAS:</strong> aspen.clothing.mp</p>
                  <p style={{ margin: 0 }}><strong>TITULAR:</strong> Aspen Clothing S.A.</p>
                  <p style={{ margin: '10px 0 0 0', color: '#555', fontSize: '11px' }}>* Transferí el monto neto de <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong> y dale al botón de abajo para finalizar.</p>
                </div>
              )}

              {metodoPago === 'efectivo' && (
                <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <p style={{ margin: 0, fontWeight: 700 }}>PAGO EN SUCURSAL:</p>
                  <p style={{ margin: 0 }}>Te generaremos el cupón oficial de Rapipago / Pago Fácil por un total neto de <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong> al enviar la orden.</p>
                </div>
              )}
            </div>
          </div>

          {/* BOTÓN DEFINITIVO GIGANTE (Mismo estilo que Captura de pantalla 2026-06-29 143634.jpg) */}
          {metodoPago !== 'tarjeta' && (
            <button 
              type="submit" 
              style={{ width: '100%', background: '#000', color: '#fff', border: 'none', padding: '18px', fontWeight: 700, fontSize: '12px', letterSpacing: '2px', cursor: 'pointer', textTransform: 'uppercase', marginTop: '10px' }}
            >
              PAGAR AHORA
            </button>
          )}
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
                placeholder="GIFT CARD OR DISCOUNT CODE" 
                value={cuponInput} 
                onChange={(e) => setCuponInput(e.target.value)} 
                style={{ flex: 1, padding: '12px', border: '1px solid #000', backgroundColor: '#fff', fontSize: '10px', letterSpacing: '0.5px', textTransform: 'uppercase', outline: 'none' }}
              />
              <button 
                type="button" 
                onClick={handleAplicarCupon} 
                style={{ background: '#000', color: '#fff', border: 'none', padding: '0 24px', fontSize: '11px', fontWeight: 600, letterSpacing: '1px', cursor: 'pointer', textTransform: 'uppercase' }}
              >
                APPLY
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

          {/* DESGLOSE FINAL DE MONTOS */}
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