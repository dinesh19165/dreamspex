import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  loyaltyService,
  parseLoyaltyPointsInput,
  validateLoyaltyRedemption,
  type LoyaltySettings,
} from './loyaltyService';

afterEach(() => {
  vi.unstubAllGlobals();
});

const settings: LoyaltySettings = {
  enabled: true,
  pointsPerHundred: 5,
  minimumOrderAmount: 0,
  minimumRedemptionPoints: 100,
  redemptionPoints: 100,
  redemptionAmount: 10,
  maximumRedemptionPercent: 20,
  pointsExpiryDays: 365,
  productPurchasePointsEnabled: true,
};

describe('checkout loyalty redemption input', () => {
  it('preserves sequential typing of 1, 12, and 120 points', () => {
    let input = '';
    for (const [digit, expected] of [['1', 1], ['2', 12], ['0', 120]] as const) {
      input += digit;
      expect(parseLoyaltyPointsInput(input)).toBe(expected);
    }
  });

  it('uses the maximum valid points and calculates the conversion immediately', () => {
    const maximum = 120;
    expect(validateLoyaltyRedemption(String(maximum), settings, 120, maximum, 1000))
      .toEqual({ points: 120, discount: 12, error: null });
  });

  it('clears redemption when the input is removed', () => {
    expect(validateLoyaltyRedemption('', settings, 120, 120, 1000))
      .toEqual({ points: 0, discount: 0, error: null });
  });

  it('validates minimum, available balance, and the order redemption cap', () => {
    expect(validateLoyaltyRedemption('12', settings, 120, 120, 1000).error)
      .toBe('Redeem at least 100 points.');
    expect(validateLoyaltyRedemption('120', settings, 100, 120, 1000).error)
      .toBe('You have only 100 points available.');
    expect(validateLoyaltyRedemption('120', settings, 120, 100, 1000).error)
      .toBe('You can redeem at most 100 points on this order.');
  });

  it('does not apply discounts above the configured percentage of the order', () => {
    expect(validateLoyaltyRedemption('120', settings, 120, 120, 50).error)
      .toBe('The requested points exceed the maximum discount for this order.');
  });

  it('requests a server-side redemption preview without changing the displayed balance', async () => {
    const fetchMock = vi.fn().mockResolvedValue(Response.json({
      availablePoints: 120,
      requestedPoints: 120,
      discount: 12,
      maximumRedeemablePoints: 120,
    }));
    vi.stubGlobal('fetch', fetchMock);

    await expect(loyaltyService.previewRedemption('access-token', 120, 1000)).resolves.toMatchObject({
      availablePoints: 120,
      requestedPoints: 120,
      discount: 12,
    });
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain(
      '/me/loyalty/redemption-preview?points=120&eligibleAmount=1000',
    );
  });
});
