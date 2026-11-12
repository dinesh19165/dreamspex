import { describe, expect, it } from 'vitest';
import { isOrderFulfilled, nextFranchiseOrderStatuses, nextOrderStatuses, orderProgressStatuses, orderStatusLabel } from './orderWorkflow';

describe('fulfillment order workflow', () => {
  it('uses the home delivery transitions by default', () => {
    expect(nextOrderStatuses('PROCESSING')).toEqual(['SHIPPED', 'CANCELLED']);
    expect(nextOrderStatuses('SHIPPED', 'DELIVERY')).toEqual(['DELIVERED']);
    expect(nextOrderStatuses('PROCESSING', 'HOME_DELIVERY')).toEqual(['SHIPPED', 'CANCELLED']);
  });

  it('uses pickup-only stages and requires ready before pickup completion', () => {
    expect(nextOrderStatuses('PROCESSING', 'PICKUP')).toEqual(['READY_FOR_PICKUP', 'CANCELLED']);
    expect(nextOrderStatuses('PAID', 'STORE_PICKUP')).toEqual(['PROCESSING', 'CANCELLED']);
    expect(nextOrderStatuses('READY_FOR_PICKUP', 'PICKUP')).toEqual(['PICKED_UP', 'CANCELLED']);
    expect(nextOrderStatuses('PICKED_UP', 'PICKUP')).toEqual([]);
    expect(nextOrderStatuses('PROCESSING', 'STORE_PICKUP')).not.toContain('SHIPPED');
    expect(nextOrderStatuses('PROCESSING', 'HOME_DELIVERY')).not.toContain('READY_FOR_PICKUP');
  });

  it('keeps franchise actions fulfillment-specific', () => {
    expect(nextFranchiseOrderStatuses('PROCESSING', 'PICKUP')).toEqual(['READY_FOR_PICKUP']);
    expect(nextFranchiseOrderStatuses('READY_FOR_PICKUP', 'PICKUP')).toEqual(['PICKED_UP']);
    expect(nextFranchiseOrderStatuses('PROCESSING', 'DELIVERY')).toEqual(['SHIPPED']);
  });

  it('filters incompatible legacy history without rewriting the saved status', () => {
    expect([...orderProgressStatuses('PICKUP')]).not.toContain('SHIPPED');
    expect([...orderProgressStatuses('DELIVERY')]).not.toContain('PICKED_UP');
    expect(orderStatusLabel('SHIPPED', 'PICKUP')).toBe('SHIPPED');
    expect(orderStatusLabel('PICKED_UP', 'HOME_DELIVERY')).toBe('PICKED UP');
    expect(orderStatusLabel('SHIPPED', 'DELIVERY')).toBe('SHIPPED');
    expect(orderStatusLabel('UNKNOWN_STATUS', 'DELIVERY')).toBe('Status needs review');
  });

  it('recognizes completion according to the fulfillment type', () => {
    expect(isOrderFulfilled('PICKED_UP', 'STORE_PICKUP')).toBe(true);
    expect(isOrderFulfilled('DELIVERED', 'HOME_DELIVERY')).toBe(true);
    expect(isOrderFulfilled('DELIVERED', 'STORE_PICKUP')).toBe(false);
    expect(isOrderFulfilled('PICKED_UP', 'HOME_DELIVERY')).toBe(false);
  });
});
