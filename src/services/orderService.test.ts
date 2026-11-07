import { afterEach, describe, expect, it, vi } from 'vitest';
import { orderService } from './orderService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('checkout quote requests', () => {
  it('sends the backend CheckoutRequest fields and accepts a valid quote', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      subtotal: 800, discount: 0, couponDiscount: 0, membershipDiscount: 0,
      shipping: 99, total: 899, couponCode: null,
      deliveryAvailability: {
        available: true,
        status: 'AVAILABLE',
        distanceKm: 12.34,
        radiusKm: 50,
        storeName: 'Hyderabad Store',
        message: 'Delivery available — Store distance: 12.34 km. Straight-line distance, not road distance.',
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    const quote = await orderService.quote('access-token', 'address-1', null);
    expect(quote.deliveryAvailability).toMatchObject({
      available: true,
      distanceKm: 12.34,
      radiusKm: 50,
    });

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({ addressId: 'address-1', couponCode: null });
  });

  it('preserves the backend validation message and invalid field for HTTP 422', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'One or more fields are invalid.',
      fieldErrors: [{ field: 'addressId', message: 'must not be blank' }],
    }, { status: 422 })));

    await expect(orderService.quote('access-token', '', null)).rejects.toMatchObject({
      name: 'OrderApiError',
      status: 422,
      code: 'VALIDATION_ERROR',
      message: 'One or more fields are invalid. addressId: must not be blank',
    });
  });
});
