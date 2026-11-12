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
    expect(JSON.parse(String(init.body))).toEqual({
      addressId: 'address-1', couponCode: null, fulfillmentType: 'DELIVERY',
    });
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

  it('sends loyalty points with the order request for backend validation', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      id: 'order-1',
      orderNumber: 'DS-1',
      status: 'PENDING_PAYMENT',
      paymentStatus: 'PENDING',
      subtotal: 1000,
      discount: 0,
      couponDiscount: 0,
      membershipDiscount: 0,
      shipping: 0,
      total: 988,
      couponCode: null,
      createdAt: '2026-11-10T00:00:00Z',
      items: [],
      history: [],
      loyaltyPointsRedeemed: 120,
      loyaltyDiscount: 12,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await orderService.create('access-token', 'address-1', null, 'checkout-key', 120);

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      addressId: 'address-1',
      couponCode: null,
      loyaltyPoints: 120,
      fulfillmentType: 'DELIVERY',
    });
  });

  it('sends pickup without a delivery address and pins the order to the selected store', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      subtotal: 800, discount: 0, couponDiscount: 0, membershipDiscount: 0,
      shipping: 0, total: 800, couponCode: null,
      deliveryAvailability: {
        available: true, status: 'AVAILABLE', distanceKm: null, radiusKm: null,
        storeName: 'Pickup Store', message: 'Pickup is available at Pickup Store.',
      },
    }));
    vi.stubGlobal('fetch', fetchMock);

    await orderService.quote('access-token', null, null, 0, 'store-1', 'PICKUP');

    const [, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({
      couponCode: null, fulfillmentType: 'PICKUP', franchiseId: 'store-1',
    });
  });
});
