import { apiFetch as fetch } from './apiClient';

import { apiBaseUrl } from '../config/api';

export type CouponResult = {
  code: string;
  discount: number;
};

export class CouponApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'CouponApiError';
    this.status = status;
  }
}

export const couponService = {
  async validate(accessToken: string, code: string): Promise<CouponResult | null> {
    const response = await fetch(`${apiBaseUrl}/api/v1/coupons/validate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({ code: code.trim(), subtotal: 0 }),
    });
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as { message?: string };
      throw new CouponApiError(problem.message ?? `Coupon validation failed (${response.status}).`, response.status);
    }
    const result = await response.json() as { code: string; valid: boolean; discount: number };
    return result.valid ? { code: result.code, discount: result.discount } : null;
  },
};
