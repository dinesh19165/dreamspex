const configuredApiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim();
const developmentApiBaseUrl = import.meta.env.DEV ? 'http://localhost:8080' : '';

if (!configuredApiBaseUrl && !developmentApiBaseUrl) {
  throw new Error('VITE_API_BASE_URL must be set for production builds.');
}

export const apiBaseUrl = (configuredApiBaseUrl || developmentApiBaseUrl).replace(/\/+$/, '');

export function resolveCmsMediaUrl(value: string | null | undefined): string | null {
  if (!value) return null;
  try {
    const resolved = new URL(value, apiBaseUrl);
    const apiOrigin = new URL(apiBaseUrl);
    if (['localhost', '127.0.0.1', '::1'].includes(resolved.hostname) && resolved.pathname.startsWith('/api/v1/')) {
      resolved.protocol = apiOrigin.protocol;
      resolved.host = apiOrigin.host;
    }
    return resolved.toString();
  } catch {
    return null;
  }
}
