import { describe, expect, it } from 'vitest';
import {
  calculateDistanceKm,
  formatStoreOpeningHours,
  getStoreOpenStatus,
} from './storeLocator';

describe('store locator utilities', () => {
  it('calculates the distance between two map coordinates', () => {
    expect(calculateDistanceKm(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 1 },
    )).toBeCloseTo(111.2, 0);
  });

  it('formats the saved schedule styles used by franchise records', () => {
    expect(formatStoreOpeningHours('MOn-sat:09am-8 pm/sun -holiday'))
      .toBe('Monday–Saturday: 09:00 AM – 08:00 PM · Sunday: Closed');
    expect(formatStoreOpeningHours(
      'Monday–Saturday: 09:00 AM–08:00 PM; Sunday: Closed; Holiday: Closed',
    )).toBe('Monday–Saturday: 09:00 AM – 08:00 PM · Sunday: Closed · Holiday: Closed');
  });

  it('distinguishes missing hours from saved but malformed hours', () => {
    expect(formatStoreOpeningHours(null)).toBeNull();
    expect(formatStoreOpeningHours('  ')).toBeNull();
    expect(formatStoreOpeningHours('Hours vary; please call')).toBe('Hours vary; please call');
    expect(getStoreOpenStatus('Hours vary; please call', new Date('2026-11-09T04:30:00Z'))).toBe('unknown');
    expect(getStoreOpenStatus(null, new Date('2026-11-09T04:30:00Z'))).toBe('unknown');
  });

  it('calculates status using the store timezone, including local day boundaries', () => {
    const hours = 'Mon-Sat: 09:00 AM - 08:00 PM; Sun: Closed; Holiday: Closed';
    expect(getStoreOpenStatus(hours, new Date('2026-11-09T03:30:00Z'))).toBe('open');
    expect(getStoreOpenStatus(hours, new Date('2026-11-09T14:30:00Z'))).toBe('closed');
    expect(getStoreOpenStatus(hours, new Date('2026-11-08T03:30:00Z'))).toBe('closed');
    expect(getStoreOpenStatus('Mon: nine to eight', new Date('2026-11-09T04:30:00Z'))).toBe('unknown');
  });
});
