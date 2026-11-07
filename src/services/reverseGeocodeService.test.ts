import { afterEach, describe, expect, it, vi } from 'vitest';
import { mergeReverseGeocodedAddress, reverseGeocodeCoordinates } from './reverseGeocodeService';

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('reverse geocoding', () => {
  it('maps available street, area, city, state, and postal fields', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      address: {
        house_number: '12',
        road: 'Main Road',
        suburb: 'Madhapur',
        city: 'Hyderabad',
        state: 'Telangana',
        postcode: '500081',
        country_code: 'in',
      },
    })));

    await expect(reverseGeocodeCoordinates({ latitude: 17.4, longitude: 78.4 })).resolves.toEqual({
      line1: '12 Main Road',
      line2: 'Madhapur',
      city: 'Hyderabad',
      state: 'Telangana',
      postalCode: '500081',
      countryCode: 'IN',
    });
  });

  it('returns only fields provided by the geocoder so manual values remain usable', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({
      address: { road: 'Lake Road', state: 'Telangana' },
    })));
    await expect(reverseGeocodeCoordinates({ latitude: 17.4, longitude: 78.4 })).resolves.toEqual({
      line1: 'Lake Road',
      state: 'Telangana',
    });
  });

  it('preserves customer-entered fields when reverse geocoding has no value for them', () => {
    expect(mergeReverseGeocodedAddress({
      line1: 'Manually entered street',
      city: 'Customer city',
      postalCode: '500001',
    }, { state: 'Telangana' })).toEqual({
      line1: 'Manually entered street',
      city: 'Customer city',
      postalCode: '500001',
      state: 'Telangana',
    });
  });

  it('reports network and no-result failures without fabricating address data', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
    await expect(reverseGeocodeCoordinates({ latitude: 17.4, longitude: 78.4 }))
      .rejects.toThrow('Address lookup failed (503).');

    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json({})));
    await expect(reverseGeocodeCoordinates({ latitude: 17.4, longitude: 78.4 }))
      .rejects.toThrow('No address details were found');
  });
});
