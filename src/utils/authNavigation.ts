import type { AuthRole } from '../context/AuthContext';

type IntendedLocation = {
  pathname?: unknown;
  search?: unknown;
  hash?: unknown;
};

export function loginPathForRole(role: AuthRole | null) {
  if (role === 'SUPER_ADMIN') return '/admin/login';
  if (role === 'FRANCHISE_ADMIN') return '/franchise/login';
  return '/login';
}

export function intendedPath(state: unknown, fallback: string) {
  if (!state || typeof state !== 'object' || !('from' in state)) return fallback;

  const from = (state as { from?: IntendedLocation }).from;
  if (!from || typeof from.pathname !== 'string' || !from.pathname.startsWith('/') || from.pathname.startsWith('//')) {
    return fallback;
  }

  const search = typeof from.search === 'string' ? from.search : '';
  const hash = typeof from.hash === 'string' ? from.hash : '';
  return `${from.pathname}${search}${hash}`;
}
