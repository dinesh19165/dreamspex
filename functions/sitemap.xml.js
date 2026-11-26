export async function onRequest({ request, env }) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response('Method not allowed', { status: 405 });
  }

  const apiBaseUrl = env.DREAMSPEX_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return new Response('Sitemap API origin is not configured.', { status: 500 });
  }

  let sitemapUrl;
  try {
    const apiOrigin = new URL(apiBaseUrl);
    if (apiOrigin.protocol !== 'https:') throw new Error('API origin must use HTTPS.');
    sitemapUrl = new URL('/api/v1/sitemap.xml', apiOrigin);
  } catch {
    return new Response('Sitemap API origin must be a valid HTTPS URL.', { status: 500 });
  }

  const response = await fetch(sitemapUrl, {
    method: request.method,
    headers: { Accept: 'application/xml' },
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: response.headers,
  });
}
