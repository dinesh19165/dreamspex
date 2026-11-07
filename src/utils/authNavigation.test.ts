import { describe, expect, it } from 'vitest';
import { intendedPath, loginPathForRole } from './authNavigation';

describe('auth navigation', () => {
  it('selects separate login routes for customer and admin sessions', () => {
    expect(loginPathForRole('CUSTOMER')).toBe('/login');
    expect(loginPathForRole('SUPER_ADMIN')).toBe('/admin/login');
    expect(loginPathForRole('FRANCHISE_ADMIN')).toBe('/franchise/login');
  });

  it('preserves an internal intended destination and rejects external destinations', () => {
    expect(intendedPath({ from: { pathname: '/orders/42', search: '?tab=history', hash: '#details' } }, '/'))
      .toBe('/orders/42?tab=history#details');
    expect(intendedPath({ from: { pathname: '//attacker.example' } }, '/')).toBe('/');
  });
});
