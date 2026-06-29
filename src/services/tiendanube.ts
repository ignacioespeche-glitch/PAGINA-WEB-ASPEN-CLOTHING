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

export const calcularEnvioReal = async (codigoPostal: string, carrito: any[]): Promise<OpcionEnvio[]> => {
  try {
    const itemsPayload = carrito.map(item => ({
      variant_id: item.variantId,
      quantity: item.cantidad
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
      console.error("Error al calcular envío en Tiendanube:", response.statusText);
      return [];
    }

    const data = await response.json();
    
    if (Array.isArray(data)) {
      return data.map((rate: any) => ({
        name: rate.name,
        price: parseFloat(rate.price)
      }));
    }
    
    return [];
  } catch (error) {
    console.error("Error conectando con la calculadora de Tiendanube:", error);
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

    if (!response.ok) {
      return cuponesLocales[codigoLimpio] || null;
    }

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

// 💰 NUEVA FUNCIÓN: Manda la orden con nombre, dirección y artículos directo a las ventas de Tiendanube
export const crearOrdenTiendanube = async (datosCliente: any, carrito: any[], metodoPago: string, cupon: CuponDescuento | null): Promise<boolean> => {
  try {
    const payload = {
      contact_email: datosCliente.email,
      contact_name: datosCliente.nombre,
      contact_phone: datosCliente.telefono,
      shipping_address: {
        address: datosCliente.direccion,
        city: datosCliente.localidad,
        country: 'AR'
      },
      // Pasamos los productos mapeados como variantes de Tiendanube
      products: carrito.map(item => ({
        variant_id: item.variantId,
        quantity: item.cantidad
      })),
      payment_method: metodoPago,
      coupon_code: cupon ? cupon.codigo : undefined
    };

    const response = await fetch(`/api-tiendanube/v1/${STORE_ID}/orders`, {
      method: 'POST',
      headers: {
        'Authentication': `bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
        'User-Agent': 'Aspen (aspenn.mdz@gmail.com)'
      },
      body: JSON.stringify(payload)
    });

    return response.ok;
  } catch (error) {
    console.error("Error registrando la venta en Tiendanube:", error);
    return false;
  }
};