type UnauthorizedHandler = () => void;
type TokenRefreshHandler = (rejectedAccessToken?: string) => Promise<string | null>;

const authenticatedRequests = new Set<AbortController>();
let unauthorizedHandler: UnauthorizedHandler | null = null;
let tokenRefreshHandler: TokenRefreshHandler | null = null;
let requestGeneration = 0;
let unauthorizedGeneration = -1;

export function registerUnauthorizedHandler(handler: UnauthorizedHandler) {
  unauthorizedHandler = handler;
  return () => {
    if (unauthorizedHandler === handler) unauthorizedHandler = null;
  };
}

export function registerTokenRefreshHandler(handler: TokenRefreshHandler) {
  tokenRefreshHandler = handler;
  return () => {
    if (tokenRefreshHandler === handler) tokenRefreshHandler = null;
  };
}

export function cancelAuthenticatedRequests() {
  requestGeneration += 1;
  unauthorizedGeneration = -1;
  authenticatedRequests.forEach((controller) => controller.abort());
  authenticatedRequests.clear();
}

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const request = input instanceof Request ? input : undefined;
  const headers = new Headers(request?.headers);
  new Headers(init.headers).forEach((value, key) => headers.set(key, value));
  const authenticated = headers.has('Authorization');
  const generation = requestGeneration;
  const initialInput = request ? request.clone() : input;
  const retryInput = request ? request.clone() : input;
  const controller = authenticated ? new AbortController() : undefined;
  const signals = [request?.signal, init.signal].filter((signal): signal is AbortSignal => Boolean(signal));
  const abort = () => controller?.abort();

  if (controller) {
    authenticatedRequests.add(controller);
    signals.forEach((signal) => {
      if (signal.aborted) controller.abort();
      else signal.addEventListener('abort', abort, { once: true });
    });
  }

  try {
    let response = await fetch(initialInput, {
      ...init,
      headers,
      ...(controller ? { signal: controller.signal } : {}),
    });

    if (authenticated && generation !== requestGeneration) {
      throw new DOMException('The authenticated session has ended.', 'AbortError');
    }

    if (authenticated && response.status === 401 && tokenRefreshHandler) {
      let accessToken: string | null = null;
      let refreshUnavailable = false;
      try {
        accessToken = await tokenRefreshHandler(headers.get('Authorization') ?? undefined);
      } catch {
        refreshUnavailable = true;
      }
      if (generation !== requestGeneration) {
        throw new DOMException('The authenticated session has ended.', 'AbortError');
      }
      if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`);
        response = await fetch(retryInput, {
          ...init,
          headers,
          ...(controller ? { signal: controller.signal } : {}),
        });
      }
      if (refreshUnavailable) return response;
    }

    if (authenticated && response.status === 401 && unauthorizedGeneration !== generation) {
      unauthorizedGeneration = generation;
      unauthorizedHandler?.();
    }

    return response;
  } finally {
    if (controller) {
      authenticatedRequests.delete(controller);
      signals.forEach((signal) => signal.removeEventListener('abort', abort));
    }
  }
}
