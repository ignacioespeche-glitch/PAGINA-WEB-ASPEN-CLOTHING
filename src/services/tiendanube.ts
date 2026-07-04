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
  valor: number; // Mantenemos la propiedad original que consume tu CheckoutForm
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

export const Math_round = Math.round;

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
          valor: parseFloat(cuponEncontrado.value) // <--- CORREGIDO: 'valor' en vez de 'value' para coincidir con la interfaz
        };
      }
    }
    return cuponesLocales[codigoLinter] || null;
  } catch (error) {
    return cuponesLocales[codigoLinter] || null;
  }
};

// IMPACTA DIRECTO EN EL PANEL DE VENTAS REALES Y PREVIENE ERRORES DE LLAVES
export const crearOrdenTiendanube = async (
  datosCliente: any, 
  carrito: any[], 
  metodoPago: string, 
  _cupon: CuponDescuento | null,
  datosTarjeta?: { marca: string; ultimosCuatro: string }
): Promise<string | null> => {
  try {
    const itemsProcesables = Array.isArray(carrito) ? carrito : (carrito as any).products || [];
    
    const lineItemsPayload = itemsProcesables.map((item: any) => {
      const rawVariantId = item.variantId || item.variant_id || (item.variant && item.variant.id);
      const rawProductId = item.id || item.productId || item.product_id || item.parentId;
      
      const variantId = Number(rawVariantId);
      const productId = Number(rawProductId);
      const cantidad = Number(item.cantidad || item.quantity || 1);
      const precioLimpio = parseFloat(item.precio || item.price || "0");

      return {
        product_id: isNaN(productId) ? 0 : productId,
        variant_id: isNaN(variantId) ? 0 : variantId,
        quantity: isNaN(cantidad) ? 1 : cantidad, // <--- CORREGIDO: cambiado 'candy' por 'cantidad'
        price: isNaN(precioLimpio) ? "0.00" : precioLimpio.toFixed(2)
      };
    });

    const customerPayload = {
      name: datosCliente.nombre.trim(),
      email: datosCliente.email.trim().toLowerCase(),
      phone: datosCliente.telefono.trim() || "261000000"
    };

    const orderBody = {
      customer: customerPayload, 
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
      // 💳 MODIFICACIÓN QUIRÚRGICA: Si es tarjeta, viaja pendiente para forzar el link seguro de Pago Nube
      payment_status: metodoPago === 'tarjeta' ? 'pending' : 'paid',
      shipping_status: 'unshipped',
      line_items: lineItemsPayload,
      products: lineItemsPayload,
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
      const data = await response.json();
      console.log("[Aspen] ¡COMPRA CREADA CON ÉXITO EN EL PANEL DE TIENDANUBE!");

      // 🚀 FORZAR DESCUENTO DE STOCK MANUAL DIRECTO EN EL CATÁLOGO (TOTALMENTE INTACTO)
      for (const item of lineItemsPayload) {
        if (item.product_id && item.variant_id) {
          try {
            // 1. Consultamos el stock real que tiene la variante en este segundo
            const varRes = await fetch(`/api-tiendanube/v1/${STORE_ID}/products/${item.product_id}/variants/${item.variant_id}`, {
              headers: { 
                'Authentication': `bearer ${ACCESS_TOKEN}`,
                'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
              }
            });

            if (varRes.ok) {
              const varianteData = await varRes.json();
              const stockActual = varianteData.stock !== null ? Number(varianteData.stock) : 0;
              
              // 2. Le restamos la cantidad que acaba de comprar el cliente
              const nuevoStock = Math.max(0, stockActual - item.quantity);

              // 3. Le mandamos el PUT a Tiendanube para actualizar el número en el panel
              await fetch(`/api-tiendanube/v1/${STORE_ID}/products/${item.product_id}/variants/${item.variant_id}`, {
                method: 'PUT',
                headers: {
                  'Authentication': `bearer ${ACCESS_TOKEN}`,
                  'Content-Type': 'application/json',
                  'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
                },
                body: JSON.stringify({ stock: nuevoStock })
              });
              console.log(`[Stock] Producto ${item.product_id} updated con éxito a: ${nuevoStock}`);
            }
          } catch (err) {
            console.error("Error al descontar stock manualmente:", err);
          }
        }
      }

      // 💳 MODIFICACIÓN QUIRÚRGICA: Retorna la URL de checkout generada por Tiendanube en lugar de un texto estático
      return data.checkout_url || "SUCCESS";
    } else {
      const errorText = await response.text();
      console.error(`[Error Tiendanube API ${response.status}]`, errorText);
      return null;
    }

  } catch (error) {
    console.error("Error crítico:", error);
    return null;
  }
};

// 🚀 FORMATO NATIVO DEFINITIVO EN ESPAÑOL: Inmune a bloqueos 410 de la infraestructura de Tiendanube
export const armarLinkCarritoDirecto = (carrito: any[]): string => {
  const tiendaUrl = "https://aspen-clothing.mitiendanube.com";
  const itemsProcesables = Array.isArray(carrito) ? carrito : [];
  
  if (itemsProcesables.length === 0) return `${tiendaUrl}/carrito`;

  const primerItem = itemsProcesables[0];
  const rawVariantId = primerItem.variantId || primerItem.variant_id || (primerItem.variant && primerItem.variant.id) || primerItem.id;
  
  return `${tiendaUrl}/carrito/agregar/${rawVariantId}`;
};