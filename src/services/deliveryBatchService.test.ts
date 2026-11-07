import { afterEach, describe, expect, it, vi } from 'vitest';
import { deliveryBatchService } from './deliveryBatchService';

describe('delivery batch OTP administration', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('requests a fresh OTP for only the selected order through the admin POST endpoint', async () => {
    const otp = {
      orderId: 'order-1',
      orderNumber: 'DS-100',
      recipientName: 'Customer One',
      phone: '+919900000000',
      otp: '123456',
    };
    const fetch = vi.fn().mockResolvedValue(new Response(JSON.stringify(otp), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));
    vi.stubGlobal('fetch', fetch);

    await expect(deliveryBatchService.regenerateOrderOtp('admin-token', 'batch-1', 'order-1')).resolves.toEqual(otp);

    expect(fetch).toHaveBeenCalledOnce();
    const [url, options] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toContain('/api/v1/admin/delivery/batches/batch-1/orders/order-1/otp');
    expect(options.method).toBe('POST');
    expect(new Headers(options.headers).get('Authorization')).toBe('Bearer admin-token');
    expect(options.body).toBeUndefined();
  });
});
