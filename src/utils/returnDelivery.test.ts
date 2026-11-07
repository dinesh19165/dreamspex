import { describe, expect, it } from 'vitest';
import { getReturnDeliveryActions, returnDeliveryRequiresOtp } from './returnDelivery';

describe('route return and replacement delivery actions', () => {
  it('requires an independent OTP to complete a return pickup', () => {
    expect(getReturnDeliveryActions('PENDING', 'RETURN_PICKUP').map((action) => action.status))
      .toEqual(['FAILED_ATTEMPT', 'PICKED_UP']);
    expect(returnDeliveryRequiresOtp('PICKED_UP', 'RETURN_PICKUP')).toBe(true);
    expect(returnDeliveryRequiresOtp('DELIVERED', 'RETURN_PICKUP')).toBe(false);
  });

  it('uses the normal delivery lifecycle and OTP for replacement dispatch', () => {
    expect(getReturnDeliveryActions('PENDING', 'REPLACEMENT_DELIVERY')).toEqual([
      { status: 'PACKED', label: 'Mark packed' },
    ]);
    expect(returnDeliveryRequiresOtp('DELIVERED', 'REPLACEMENT_DELIVERY')).toBe(true);
    expect(returnDeliveryRequiresOtp('PICKED_UP', 'REPLACEMENT_DELIVERY')).toBe(false);
  });

  it('preserves normal delivery actions and OTP trigger', () => {
    expect(getReturnDeliveryActions('OUT_FOR_DELIVERY', 'NORMAL_DELIVERY').map((action) => action.status))
      .toEqual(['FAILED_ATTEMPT', 'DELIVERED']);
    expect(returnDeliveryRequiresOtp('DELIVERED', 'NORMAL_DELIVERY')).toBe(true);
  });
});
