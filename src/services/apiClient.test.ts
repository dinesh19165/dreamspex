import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  apiFetch,
  cancelAuthenticatedRequests,
  registerTokenRefreshHandler,
  registerUnauthorizedHandler,
} from './apiClient';

describe('apiFetch', () => {
  let unauthorizedHandler: ReturnType<typeof vi.fn<() => void>>;
  let unregisterHandler: () => void;

  beforeEach(() => {
    cancelAuthenticatedRequests();
    unauthorizedHandler = vi.fn<() => void>();
    unregisterHandler = registerUnauthorizedHandler(unauthorizedHandler);
  });

  afterEach(() => {
    unregisterHandler();
    cancelAuthenticatedRequests();
    vi.unstubAllGlobals();
  });

  it('notifies once when an authenticated request receives 401', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await Promise.all([
      apiFetch('/api/v1/me', { headers: { Authorization: 'Bearer expired' } }),
      apiFetch('/api/v1/orders', { headers: { Authorization: 'Bearer expired' } }),
    ]);

    expect(unauthorizedHandler).toHaveBeenCalledOnce();
  });

  it('does not log out for a 403 response', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 403 })));

    await apiFetch('/api/v1/admin/session', { headers: { Authorization: 'Bearer valid' } });

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  it('does not treat a public 401 as an authenticated session failure', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    await apiFetch('/api/v1/auth/login', { method: 'POST' });

    expect(unauthorizedHandler).not.toHaveBeenCalled();
  });

  it('refreshes and retries an authenticated request once after a 401', async () => {
    const refreshHandler = vi.fn().mockResolvedValue('fresh-access-token');
    const unregisterRefresh = registerTokenRefreshHandler(refreshHandler);
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(null, { status: 401 }))
      .mockResolvedValueOnce(new Response('ok', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const response = await apiFetch('/api/v1/me', {
      headers: { Authorization: 'Bearer expired-access-token' },
    });

    expect(response.status).toBe(200);
    expect(refreshHandler).toHaveBeenCalledOnce();
    expect(refreshHandler).toHaveBeenCalledWith('Bearer expired-access-token');
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(new Headers(fetchMock.mock.calls[1][1]?.headers).get('Authorization'))
      .toBe('Bearer fresh-access-token');
    expect(unauthorizedHandler).not.toHaveBeenCalled();
    unregisterRefresh();
  });

  it('does not log out when a token refresh fails because of a transient network error', async () => {
    const unregisterRefresh = registerTokenRefreshHandler(
      vi.fn().mockRejectedValue(new Error('Network unavailable')),
    );
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 401 })));

    const response = await apiFetch('/api/v1/me', {
      headers: { Authorization: '******' },
    });

    expect(response.status).toBe(401);
    expect(unauthorizedHandler).not.toHaveBeenCalled();
    unregisterRefresh();
  });

  it('aborts pending authenticated requests after logout', async () => {
    vi.stubGlobal('fetch', vi.fn((_input: RequestInfo | URL, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
      })));

    const pendingRequest = apiFetch('/api/v1/me', { headers: { Authorization: 'Bearer valid' } });
    cancelAuthenticatedRequests();

    await expect(pendingRequest).rejects.toMatchObject({ name: 'AbortError' });
  });
});
