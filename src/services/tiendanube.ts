// src/services/tiendanube.ts

const STORE_ID = '3180620';
const ACCESS_TOKEN = 'bf08a938bccb39b7bb645e9f8a3c3d0b0033ffe4'; 

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

// 🚀 MODIFICACIÓN COMPLETA Y ROBUSTA: Mapea variant_id probando ambas propiedades por seguridad y agrega logs de traza
export const calcularEnvioReal = async (codigoPostal: string, carrito: any[]): Promise<OpcionEnvio[]> => {
  try {
    const itemsPayload = carrito.map(item => {
      // Intentamos con variantId o con id, asegurándonos de que sea un número
      const vId = item.variantId || item.id;
      return {
        variant_id: Number(vId),
        quantity: Number(item.cantidad || 1)
      };
    }).filter(item => !isNaN(item.variant_id) && item.variant_id > 0);

    console.log("[Shipping Debug] Payload enviado a Tiendanube:", JSON.stringify({
      destination: { postal_code: codigoPostal.trim(), country: 'AR' },
      items: itemsPayload
    }));

    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/shipping_rates`, {
      method: 'POST',
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      },
      body: JSON.stringify({
        destination: {
          postal_code: codigoPostal.trim(),
          country: 'AR'
        },
        items: itemsPayload
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Error al calcular envío en Tiendanube:", response.status, errorText);
      return [];
    }

    const data = await response.json();
    console.log("[Shipping Debug] Respuesta de Tiendanube:", data);

    if (Array.isArray(data)) {
      return data.map((rate: any) => ({
        name: rate.name,
        price: parseFloat(rate.price)
      }));
    }
    return [];
  } catch (error) {
    console.error("Error con la calculadora de Tiendanube:", error);
    return [];
  }
};

export const validarCuponTiendanube = async (codigoCupon: string): Promise<CuponDescuento | null> => {
  const codigoLimpio = codigoCupon.trim().toUpperCase();

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

    if (!response.ok) return cuponesLocales[codigoLimpio] || null;

    const cupones = await response.json();
    if (Array.isArray(cupones)) {
      const cuponEncontrado = cupones.find(
        (c: any) => c.code && c.code.trim().toUpperCase() === codigoLimpio
      );

      if (cuponEncontrado && (cuponEncontrado.enabled || cuponEncontrado.status === 'active')) {
        return {
          codigo: cuponEncontrado.code.toUpperCase(),
          tipo: cuponEncontrado.type === 'percentage' ? 'percentage' : 'absolute', 
          valor: parseFloat(cuponEncontrado.value)
        };
      }
    }
    return cuponesLocales[codigoLimpio] || null;
  } catch (error) {
    return cuponesLocales[codigoLimpio] || null;
  }
};

export const crearOrdenTiendanube = async (
  datosCliente: any, 
  carrito: any[], 
  metodoPago: string, 
  cupon: CuponDescuento | null,
  datosTarjeta?: { marca: string; ultimosCuatro: string }
): Promise<string | null> => {
  try {
    console.log(`[Aspen] Procesando pedido de ${datosCliente.nombre}. Método: ${metodoPago}. Cupón usado: ${cupon ? cupon.codigo : 'Ninguno'}`);
    if (datosTarjeta) {
      console.log(`[Aspen] Detalles de tarjeta: ${datosTarjeta.marca} terminada en ${datosTarjeta.ultimosCuatro}`);
    }

    const productsResponse = await fetch(`/api-tiendanube/v1/${STORE_ID}/products`, {
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      }
    });

    if (!productsResponse.ok) {
      console.error("No se pudieron consultar los productos de Tiendanube para mapear el stock.");
      return null;
    }

    const listaProductos = await productsResponse.json();

    for (const item of carrito) {
      const variantId = Number(item.variantId);
      const cantidadComprada = Number(item.cantidad || 1);

      if (!variantId) continue;

      const productoEncontrado = listaProductos.find((p: any) => 
        Array.isArray(p.variants) && p.variants.some((v: any) => Number(v.id) === variantId)
      );

      if (!productoEncontrado) {
        console.error(`[Error Stock] Variante ${variantId} no mapeada en el catálogo activo.`);
        continue;
      }

      const productoId = productoEncontrado.id;

      const getResponse = await fetch(`/api-tiendanube/v1/${STORE_ID}/products/${productoId}/variants/${variantId}`, {
        method: 'GET',
        headers: {
          'Authentication': `bearer ${ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
          'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
        }
      });

      if (getResponse.ok) {
        const variantData = await getResponse.json();
        
        if (variantData.stock !== null) {
          const stockActual = Number(variantData.stock);
          const nuevoStock = Math.max(0, stockActual - cantidadComprada);

          await fetch(`/api-tiendanube/v1/${STORE_ID}/products/${productoId}/variants/${variantId}`, {
            method: 'PUT',
            headers: {
              'Authentication': `bearer ${ACCESS_TOKEN}`,
              'Content-Type': 'application/json',
              'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
            },
            body: JSON.stringify({ stock: nuevoStock })
          });
          
          console.log(`[Stock Aspen] ¡Éxito! Producto: ${productoId} - Variante: ${variantId}. Stock previo: ${stockActual} -> Nuevo: ${nuevoStock}`);
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error de red modificando el stock en Tiendanube:", error);
    return null;
  }
};