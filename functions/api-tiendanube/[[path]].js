export async function onRequest(context) {
  const url = new URL(context.request.url);
  const targetPath = url.pathname.replace(/^\/api-tiendanube/, '');
  const targetUrl = `https://api.tiendanube.com${targetPath}${url.search}`;

  // Clonar encabezados y forzar el Host
  const modifiedHeaders = new Headers(context.request.headers);
  modifiedHeaders.set('Host', 'api.tiendanube.com');

  const response = await fetch(targetUrl, {
    method: context.request.method,
    headers: modifiedHeaders,
    body: ['GET', 'HEAD'].includes(context.request.method) ? null : context.request.body
  });

  const responseHeaders = new Headers(response.headers);
  responseHeaders.set('Access-Control-Allow-Origin', '*');
  responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  responseHeaders.set('Access-Control-Allow-Headers', '*');

  if (context.request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: responseHeaders });
  }

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders
  });
}