import { afterEach, describe, expect, it, vi } from 'vitest';
import { addressService, type CustomerAddressRequest } from './addressService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('customer address persistence', () => {
  it('saves address edits and coordinates together and returns persisted values on reload', async () => {
    const request: CustomerAddressRequest = {
      label: 'Home',
      recipientName: 'Customer',
      phone: '+919876543210',
      line1: '12 Main Road',
      line2: 'Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500081',
      countryCode: 'IN',
      defaultAddress: true,
      latitude: 17.4,
      longitude: 78.4,
    };
    const saved = { id: 'address-1', ...request };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(Response.json(saved))
      .mockResolvedValueOnce(Response.json([saved]));
    vi.stubGlobal('fetch', fetchMock);

    await addressService.update('token', 'address-1', request);
    const addresses = await addressService.list('token');

    const [, updateRequest] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(JSON.parse(String(updateRequest.body))).toEqual(request);
    expect(addresses[0]).toMatchObject({
      id: 'address-1',
      line1: '12 Main Road',
      postalCode: '500081',
      latitude: 17.4,
      longitude: 78.4,
      defaultAddress: true,
    });
  });

  it('keeps an existing address with no coordinates valid', async () => {
    const address = {
      id: 'address-2', label: 'Home', recipientName: 'Customer', phone: '+919876543210',
      line1: '1 Old Road', line2: null, city: 'Hyderabad', state: 'Telangana',
      postalCode: '500001', countryCode: 'IN', defaultAddress: true, latitude: null, longitude: null,
    };
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json([address])));
    await expect(addressService.list('token')).resolves.toEqual([address]);
  });
});
