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

// 🎟️ FUNCIÓN CORREGIDA CON BLINDAJE PARA CUPONES ACTIVOS
export const validarCuponTiendanube = async (codigoCupon: string): Promise<CuponDescuento | null> => {
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
      console.error("Error al traer cupones de Tiendanube:", response.statusText);
      return null;
    }

    const cupones = await response.json();
    console.log("Cupones crudos recibidos de Tiendanube:", cupones); // Log útil para desarrollo
    
    if (Array.isArray(cupones)) {
      const cuponEncontrado = cupones.find(
        (c: any) => c.code && c.code.trim().toUpperCase() === codigoCupon.trim().toUpperCase()
      );

      // Verificamos si existe y si coincide con el estado "Activado" que se ve en tu imagen
      if (cuponEncontrado && (cuponEncontrado.enabled || cuponEncontrado.status === 'active')) {
        return {
          codigo: cuponEncontrado.code.toUpperCase(),
          // Mapea correctamente si es un porcentaje o un valor fijo en pesos ($10000)
          tipo: cuponEncontrado.type === 'percentage' ? 'percentage' : 'absolute', 
          valor: parseFloat(cuponEncontrado.value)
        };
      }
    }
    return null;
  } catch (error) {
    console.error("Error conectando con el validador de cupones de Tiendanube:", error);
    return null;
  }
};