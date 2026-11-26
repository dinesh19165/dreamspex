export default async function sitemapHandler(request, response) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.setHeader('Allow', 'GET, HEAD');
    return response.status(405).send('Method not allowed');
  }

  const apiBaseUrl = process.env.VITE_API_BASE_URL?.trim();
  if (!apiBaseUrl) {
    return response.status(500).send('Sitemap API origin is not configured.');
  }

  let sitemapUrl;
  try {
    const apiOrigin = new URL(apiBaseUrl);
    if (apiOrigin.protocol !== 'https:') throw new Error('API origin must use HTTPS.');
    sitemapUrl = new URL('/api/v1/sitemap.xml', apiOrigin);
  } catch {
    return response.status(500).send('Sitemap API origin must be a valid HTTPS URL.');
  }

  try {
    const upstream = await fetch(sitemapUrl, {
      method: request.method,
      headers: { Accept: 'application/xml' },
    });
    response.status(upstream.status);
    response.setHeader(
      'Content-Type',
      upstream.headers.get('content-type') ?? 'application/xml; charset=UTF-8',
    );
    const cacheControl = upstream.headers.get('cache-control');
    if (cacheControl) response.setHeader('Cache-Control', cacheControl);
    if (request.method === 'HEAD') return response.end();
    return response.send(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    return response.status(502).send('Sitemap service is unavailable.');
  }
}
