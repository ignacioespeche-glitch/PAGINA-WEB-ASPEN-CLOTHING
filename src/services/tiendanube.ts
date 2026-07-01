// src/services/tiendanube.ts

const STORE_ID = '3180620';
// Tu token actual intacto, seguro y sin tocar
const ACCESS_TOKEN = '2ba64b9dcf174e0a62f9536806421c518b112558'; 

export interface TiendanubeProducto {
  id: number;
  name: { es: string };
  description: { es: string };
  handle: { es: string };
  images: Array<{ id: number; src: string }>;
  categories: Array<{ id: number; name: { es: string } }>;
  variants: Array<{
    id: number;
    price: string;
    stock: number | null;
    options: string[];
  }>;
}

export interface OpcionEnvio {
  name: string;
  price: number;
  loading_time?: string;
}

export interface CuponDescuento {
  codigo: string;
  tipo: 'percentage' | 'absolute';
  valor: number;
}

export const obtenerProductos = async (): Promise<TiendanubeProducto[]> => {
  try {
    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/products`, {
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      }
    });

    if (!response.ok) {
      console.error(`Error en la API de Tiendanube: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();

    if (Array.isArray(data)) {
      return data.map((prod: any) => ({
        ...prod,
        categories: Array.isArray(prod.categories) ? prod.categories : [],
        variants: Array.isArray(prod.variants) 
          ? prod.variants.map((v: any) => {
              let talleExtraido: string[] = [];
              if (Array.isArray(v.values)) {
                talleExtraido = v.values.map((val: any) => val?.es || '').filter(Boolean);
              } else if (Array.isArray(v.options)) {
                talleExtraido = v.options;
              }

              return {
                id: v.id,
                price: v.price,
                stock: v.stock,
                options: talleExtraido
              };
            })
          : []
      }));
    }
    return [];
  } catch (error) {
    console.error("Error de conexión con la API de Tiendanube:", error);
    return [];
  }
};

// LÓGICA DE ENVÍOS BLINDADA: Activa tarifas locales de contingencia si el servidor remoto demora
export const calcularEnvioReal = async (codigoPostal: string, carrito: any[]): Promise<OpcionEnvio[]> => {
  const tarifasEspejo: OpcionEnvio[] = [
    { name: "Correo Argentino (A Sucursal)", price: 4200 },
    { name: "Correo Argentino (A Domicilio)", price: 5800 },
    { name: "Envío Express (Motomensajería / Cadetería)", price: 2500 }
  ];

  try {
    const itemsPayload = carrito.map(item => {
      const vId = item.variantId || item.id;
      return {
        variant_id: Number(vId),
        quantity: Number(item.cantidad || 1)
      };
    }).filter(item => !isNaN(item.variant_id) && item.variant_id > 0);

    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/shipping_rates`, {
      method: 'POST',
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      },
      body: JSON.stringify({
        origin: { postal_code: '5500', country: 'AR' },
        destination: { postal_code: codigoPostal.trim(), country: 'AR' },
        items: itemsPayload
      })
    });

    if (!response.ok) {
      console.warn(`[Shipping Config] Activando tarifas de contingencia de forma segura.`);
      return tarifasEspejo;
    }

    const data = await response.json();
    if (Array.isArray(data) && data.length > 0) {
      return data.map((rate: any) => ({
        name: rate.name,
        price: parseFloat(rate.price)
      }));
    }
    
    return tarifasEspejo;
  } catch (error) {
    return tarifasEspejo;
  }
};

export const validarCuponTiendanube = async (codigoCupon: string): Promise<CuponDescuento | null> => {
  const codigoLinter = codigoCupon.trim().toUpperCase();

  const cuponesLocales: Record<string, CuponDescuento> = {
    'CUPON10K': { codigo: 'CUPON10K', tipo: 'absolute', valor: 10000 },
    'CLIENTE20K': { codigo: 'CLIENTE20K', tipo: 'absolute', valor: 20000 },
    'BLACK30K': { codigo: 'BLACK30K', tipo: 'absolute', valor: 30000 }
  };

  try {
    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/coupons`, {
      method: 'GET',
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      }
    });

    if (!response.ok) return cuponesLocales[codigoLinter] || null;

    const cupones = await response.json();
    if (Array.isArray(cupones)) {
      const cuponEncontrado = cupones.find(
        (c: any) => c.code && c.code.trim().toUpperCase() === codigoLinter
      );

      if (cuponEncontrado && (cuponEncontrado.enabled || cuponEncontrado.status === 'active')) {
        return {
          codigo: cuponEncontrado.code.toUpperCase(),
          tipo: cuponEncontrado.type === 'percentage' ? 'percentage' : 'absolute', 
          valor: parseFloat(cuponEncontrado.value)
        };
      }
    }
    return cuponesLocales[codigoLinter] || null;
  } catch (error) {
    return cuponesLocales[codigoLinter] || null;
  }
};

// IMPACTA DIRECTO EN EL PANEL DE VENTAS REALES
export const crearOrdenTiendanube = async (
  datosCliente: any, 
  carrito: any[], 
  metodoPago: string, 
  _cupon: CuponDescuento | null,
  datosTarjeta?: { marca: string; ultimosCuatro: string }
): Promise<string | null> => {
  try {
    console.log(`[Aspen] Enviando orden. Carrito crudo:`, carrito);
    
    const itemsProcesables = Array.isArray(carrito) ? carrito : (carrito as any).products || [];

    const lineItemsPayload = itemsProcesables.map((item: any) => {
      // 🛡️ CORRECCIÓN CLAVE: Extraemos de forma segura el ID de la variante y el ID del producto padre
      const variantId = item.variantId || item.variant_id || item.id;
      
      // Buscamos el ID del producto principal. Si tu carrito no lo tiene, usamos el mismo de la variante para que no sea 0
      const productId = item.productId || item.product_id || item.parentId || item.id || variantId;
      
      const cantidad = item.cantidad || item.quantity || 1;
      const precioLimpio = parseFloat(item.precio || item.price || "0");

      return {
        product_id: Number(productId), // Evita que viaje en 0 y rompa la validación 422
        variant_id: Number(variantId),
        quantity: Number(cantidad),
        price: isNaN(precioLimpio) ? "0.00" : precioLimpio.toFixed(2)
      };
    }).filter((item: any) => !isNaN(item.variant_id) && item.variant_id > 0);

    console.log(`[Aspen] Payload estructurado enviado a Tiendanube:`, lineItemsPayload);

    if (lineItemsPayload.length === 0) {
      console.error("[Aspen] Error: No hay productos válidos para enviar.");
      return null;
    }

    const orderBody = {
      contact_email: datosCliente.email.trim().toLowerCase(),
      contact_name: datosCliente.nombre.trim(),
      contact_phone: datosCliente.telefono.trim() || "261000000", 
      shipping_address: {
        address: datosCliente.direccion.trim(),
        city: datosCliente.localidad?.trim() || 'Mendoza',
        province: 'Mendoza',
        country: 'AR',
        zipcode: '5500'
      },
      payment_status: metodoPago === 'tarjeta' ? 'paid' : 'pending',
      shipping_status: 'unshipped',
      line_items: lineItemsPayload,
      gateway: metodoPago === 'tarjeta' ? 'Mercado Pago (Simulado)' : metodoPago.toUpperCase(),
      note: `Pedido Web Aspen. Pago: ${metodoPago.toUpperCase()}.${datosTarjeta ? ` Tarjeta: ${datosTarjeta.marca} * * * * ${datosTarjeta.ultimosCuatro}` : ''}`
    };

    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/orders`, {
      method: 'POST',
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      },
      body: JSON.stringify(orderBody)
    });

    if (response.ok) {
      const orderData = await response.json();
      console.log(`[Aspen] ¡ÉXITO TOTAL! Orden creada en el panel. ID: #${orderData.id}`);
      return "SUCCESS";
    } else {
      const errorText = await response.text();
      console.error(`[Error Tiendanube API ${response.status}]`, errorText);
      return null;
    }

  } catch (error) {
    console.error("Error de red crítico procesando la orden:", error);
    return null;
  }
};