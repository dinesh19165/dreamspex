import { describe, expect, it } from 'vitest';
import {
  geolocationErrorMessage,
  googleMapsDirectionsUrl,
  googleMapsLocationUrl,
  isValidCoordinates,
  normalizeCoordinates,
} from './deliveryNavigation';

describe('delivery navigation coordinates', () => {
  it('validates latitude and longitude boundaries and rejects invalid values', () => {
    expect(isValidCoordinates(-90, -180)).toBe(true);
    expect(isValidCoordinates(90, 180)).toBe(true);
    expect(isValidCoordinates(90.0001, 0)).toBe(false);
    expect(isValidCoordinates(0, -180.001)).toBe(false);
    expect(isValidCoordinates(Number.NaN, 0)).toBe(false);
  });

  it('uses no location for missing, partial, or invalid address coordinates', () => {
    expect(normalizeCoordinates(null)).toBeNull();
    expect(normalizeCoordinates(undefined)).toBeNull();
    expect(normalizeCoordinates({ latitude: 17.4 })).toBeNull();
    expect(normalizeCoordinates({ latitude: 91, longitude: 78 })).toBeNull();
    expect(normalizeCoordinates({ latitude: 17.4, longitude: 78.4 }))
      .toEqual({ latitude: 17.4, longitude: 78.4 });
  });

  it('builds map and driving directions from the saved coordinates', () => {
    const coordinates = { latitude: 17.385, longitude: 78.4867 };
    expect(googleMapsLocationUrl(coordinates))
      .toBe('https://www.google.com/maps/search/?api=1&query=17.385,78.4867');
    expect(googleMapsDirectionsUrl(coordinates))
      .toBe('https://www.google.com/maps/dir/?api=1&destination=17.385,78.4867&travelmode=driving');
  });

  it('explains denied, unavailable, and timed-out location requests', () => {
    expect(geolocationErrorMessage(1)).toContain('permission was denied');
    expect(geolocationErrorMessage(2)).toContain('unavailable');
    expect(geolocationErrorMessage(3)).toContain('timed out');
  });
});
