// src/CheckoutForm.tsx
import { useState } from 'react';
import { useCart } from './CartContext';
import { initMercadoPago, Payment } from '@mercadopago/sdk-react';

initMercadoPago('YOUR_PUBLIC_KEY_HERE');

interface CheckoutFormProps {
  onCancelar: () => void;
}

type MetodoPago = 'transferencia' | 'tarjeta' | 'efectivo';

export const CheckoutForm = ({ onCancelar }: CheckoutFormProps) => {
  const { carrito, totalPrecio } = useCart();
  
  const [paso, setPaso] = useState<'datos' | 'pago'>('datos');
  const [metodoPago, setMetodoPago] = useState<MetodoPago>('transferencia'); // Por defecto efectivo/transferencia para mantener el precio del catálogo
  
  const [email, setEmail] = useState('');
  const [nombre, setNombre] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [localidad, setLocalidad] = useState('');

  // NUEVA MATEMÁTICA TRANSPARENTE
  const precioBaseCatalogo = totalPrecio; // El del catálogo ($70.000)
  const precioConRecargoTarjeta = Math.round(totalPrecio * 1.20); // Solo sube si elige tarjeta de crédito ($84.000)
  
  const montoFinalAMostrar = metodoPago === 'tarjeta' ? precioConRecargoTarjeta : precioBaseCatalogo;

  const handleProcederAlPago = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !nombre || !direccion) {
      alert("Por favor completa los campos requeridos.");
      return;
    }
    setPaso('pago');
  };

  const handlePaymentSubmit = async (param: any) => {
    try {
      console.log("Datos enviados a backend:", param.formData);
      alert("¡Pago con tarjeta procesado con éxito en Aspen Clothing!");
    } catch (error) {
      console.error("Error al procesar pago con tarjeta:", error);
    }
  };

  const handleFinalizarPedidoDirecto = () => {
    alert(`¡Pedido de Aspen registrado con éxito! Procesado por método: ${metodoPago.toUpperCase()}. Te enviaremos los detalles.`);
  };

  const mercadoPagoCustomization: any = {
    visual: { style: { theme: 'flat' } },
    paymentMethods: {
      maxInstallments: 3,
      types: { excluded: ['ticket', 'bank_transfer'] }
    }
  };

  return (
    <div className="checkout-container" style={{ padding: '40px max(4vw, 20px)', minHeight: '80vh', fontFamily: 'Inter, sans-serif' }}>
      
      <button 
        onClick={onCancelar} 
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', fontWeight: 700, letterSpacing: '1px', marginBottom: '40px', textTransform: 'uppercase' }}
      >
        ← VOLVER A LA TIENDA
      </button>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '80px', alignItems: 'start' }}>
        
        {/* COLUMNA IZQUIERDA */}
        <div>
          {paso === 'datos' ? (
            <form onSubmit={handleProcederAlPago} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', borderBottom: '1px solid #000', paddingBottom: '12px', margin: 0 }}>
                1. IDENTIFICACIÓN Y ENVÍO
              </h2>
              
              <input type="email" placeholder="EMAIL *" required value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
              <input type="text" placeholder="NOMBRE COMPLETO *" required value={nombre} onChange={(e) => setNombre(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
              <input type="text" placeholder="TELÉFONO" value={telefono} onChange={(e) => setTelefono(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
              <input type="text" placeholder="DIRECCIÓN Y NÚMERO *" required value={direccion} onChange={(e) => setDireccion(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
              <input type="text" placeholder="CIUDAD / LOCALIDAD" value={localidad} onChange={(e) => setLocalidad(e.target.value)} style={{ width: '100%', padding: '14px', border: '1px solid #000', fontSize: '11px', outline: 'none' }} />
              
              <button type="submit" style={{ background: '#000', color: '#fff', border: 'none', padding: '16px', fontWeight: 700, fontSize: '12px', letterSpacing: '1.5px', cursor: 'pointer', marginTop: '20px', textTransform: 'uppercase' }}>
                CONTINUAR AL SELECCIONAR PAGO
              </button>
            </form>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #000', paddingBottom: '12px', margin: 0 }}>
                <h2 style={{ fontSize: '14px', fontWeight: 700, letterSpacing: '1.5px', textTransform: 'uppercase', margin: 0 }}>
                  2. MEDIO DE PAGO
                </h2>
                <button onClick={() => setPaso('datos')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '11px', textDecoration: 'underline', fontWeight: 600 }}>
                  Modificar datos
                </button>
              </div>

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

              <div style={{ marginTop: '10px' }}>
                {metodoPago === 'tarjeta' && (
                  <div className="mercadopago-brick-container">
                    <Payment
                      initialization={{ amount: precioConRecargoTarjeta, preferenceId: undefined }}
                      customization={mercadoPagoCustomization}
                      onSubmit={handlePaymentSubmit}
                    />
                  </div>
                )}

                {metodoPago === 'transferencia' && (
                  <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#FAFAFA', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 700, letterSpacing: '0.5px' }}>DATOS DE NUESTRA CUENTA:</p>
                    <p style={{ margin: 0 }}><strong>BANCO:</strong> Galicia</p>
                    <p style={{ margin: 0 }}><strong>ALIAS:</strong> aspen.clothing.mp</p>
                    <p style={{ margin: 0 }}><strong>TITULAR:</strong> Aspen Clothing S.A.</p>
                    <p style={{ margin: '10px 0 0 0', color: '#555', fontSize: '11px' }}>* Por favor, transferí el monto exacto de <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong> y luego presioná el botón de abajo para registrar tu pedido.</p>
                    <button type="button" onClick={handleFinalizarPedidoDirecto} style={{ background: '#000', color: '#fff', border: 'none', padding: '14px', fontWeight: 700, fontSize: '12px', letterSpacing: '1px', cursor: 'pointer', marginTop: '15px', textTransform: 'uppercase' }}>
                      CONFIRMAR TRANSFERENCIA REALIZADA
                    </button>
                  </div>
                )}

                {metodoPago === 'efectivo' && (
                  <div style={{ padding: '24px', border: '1px solid #000', backgroundColor: '#FAFAFA', fontSize: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <p style={{ margin: 0, fontWeight: 700 }}>PAGO EN SUCURSAL:</p>
                    <p style={{ margin: 0 }}>Al confirmar el pedido, te generaremos el cupón correspondiente para abonar <strong>${precioBaseCatalogo.toLocaleString('es-AR')},00</strong> en cualquier Rapipago o Pago Fácil del país.</p>
                    <button type="button" onClick={handleFinalizarPedidoDirecto} style={{ background: '#000', color: '#fff', border: 'none', padding: '14px', fontWeight: 700, fontSize: '12px', letterSpacing: '1px', cursor: 'pointer', marginTop: '15px', textTransform: 'uppercase' }}>
                      GENERAR CUPÓN Y FINALIZAR ORDEN
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* COLUMNA DERECHA */}
        <div style={{ background: '#FBFBFB', padding: '35px', border: '1px solid #EFEFEF' }}>
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

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 700, letterSpacing: '0.5px' }}>
              <span>TOTAL NETO:</span>
              <span>${montoFinalAMostrar.toLocaleString('es-AR')},00</span>
            </div>
            {metodoPago === 'tarjeta' && (
              <span style={{ fontSize: '11px', color: '#555', fontStyle: 'italic', alignSelf: 'flex-end' }}>
                O 3 cuotas sin interés de ${(Math.round(precioConRecargoTarjeta / 3)).toLocaleString('es-AR')},00
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};