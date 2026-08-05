// worker.js en la raíz del proyecto
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // Si la petición va a la API de Tiendanube, la reenviamos en el servidor
    if (url.pathname.startsWith('/api-tiendanube/')) {
      const targetPath = url.pathname.replace('/api-tiendanube', '');
      const targetUrl = `https://api.tiendanube.com${targetPath}${url.search}`;

      const newHeaders = new Headers(request.headers);
      newHeaders.set('Host', 'api.tiendanube.com');

      const response = await fetch(targetUrl, {
        method: request.method,
        headers: newHeaders,
        body: ['GET', 'HEAD'].includes(request.method) ? null : request.body
      });

      return response;
    }

    // Para cualquier otra ruta, entrega la SPA de React
    return env.ASSETS.fetch(request);
  }
};