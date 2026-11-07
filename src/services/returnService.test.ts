import { describe, expect, it } from 'vitest';
import {
  getOrderItemReturnAction,
  type CustomerReturn,
  type ReturnEligibility,
} from './returnService';

const orderItemId = 'item-1';
const now = new Date('2026-11-04T12:00:00Z');

function makeEligibility(overrides: Partial<ReturnEligibility> = {}): ReturnEligibility {
  return {
    orderId: 'order-1',
    orderNumber: 'DS-1',
    eligible: true,
    ineligibleReason: null,
    deliveredAt: '2026-10-25T12:00:00Z',
    returnDeadline: '2026-11-20T12:00:00Z',
    items: [{
      orderItemId,
      productName: 'Classic Eyeglasses',
      sku: 'FRAME-1',
      orderedQuantity: 2,
      availableQuantity: 0,
      refundEstimate: 180,
      returnable: true,
    }],
    ...overrides,
  };
}

function makeReturn(status: string, refundStatus?: string, quantity = 2): CustomerReturn {
  return {
    id: 'return-1',
    requestNumber: 'DSR-1',
    orderId: 'order-1',
    orderNumber: 'DS-1',
    resolution: 'REFUND',
    reasonCode: 'DAMAGED',
    description: null,
    status,
    refundAmount: 90,
    createdAt: '2026-11-01T12:00:00Z',
    items: [{ orderItemId, productName: 'Classic Eyeglasses', sku: 'FRAME-1', quantity, refundAmount: 90 }],
    evidence: [],
    history: [],
    refunds: refundStatus ? [{
      amount: 90,
      currency: 'INR',
      status: refundStatus,
      providerRefundId: 'rfnd-1',
      createdAt: '2026-11-01T12:00:00Z',
      processedAt: refundStatus === 'PROCESSED' ? '2026-11-02T12:00:00Z' : null,
      gatewayCreatedAt: null,
    }] : [],
  };
}

describe('customer order return actions', () => {
  it('hides the action and reports a confirmed refund', () => {
    const result = getOrderItemReturnAction(
      makeEligibility(),
      [makeReturn('REFUNDED', 'PROCESSED')],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({ canRequest: false, statusLabel: 'Refunded' });
  });

  it('hides the action while a refund is processing', () => {
    const eligibility = makeEligibility();
    eligibility.items[0].availableQuantity = 1;
    const result = getOrderItemReturnAction(
      eligibility,
      [makeReturn('REFUND_PROCESSING', 'PROCESSING', 1)],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({ canRequest: false, statusLabel: 'Refund Processing' });
  });

  it('hides the action after replacement completion', () => {
    const result = getOrderItemReturnAction(
      makeEligibility(),
      [makeReturn('REPLACED')],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({ canRequest: false, statusLabel: 'Replacement Completed' });
  });

  it('hides the action after the backend return deadline', () => {
    const eligibility = makeEligibility({
      eligible: false,
      ineligibleReason: 'The configured return window has expired.',
      returnDeadline: '2026-11-03T12:00:00Z',
    });

    expect(getOrderItemReturnAction(eligibility, [], orderItemId, now))
      .toMatchObject({ canRequest: false, statusLabel: 'Return Period Expired' });
  });

  it('shows the active request status without allowing duplicate reserved quantity', () => {
    const result = getOrderItemReturnAction(
      makeEligibility(),
      [makeReturn('REQUESTED')],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({ canRequest: false, statusLabel: 'Requested' });
  });

  it('only offers the unreserved remainder while another partial request is pending', () => {
    const eligibility = makeEligibility();
    eligibility.items[0].availableQuantity = 1;
    const result = getOrderItemReturnAction(
      eligibility,
      [makeReturn('REQUESTED', undefined, 1)],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({
      canRequest: true,
      remainingQuantity: 1,
      statusLabel: 'Requested · 1 remaining',
    });
  });

  it('allows only the backend-reported remaining quantity after a partial refund', () => {
    const eligibility = makeEligibility();
    eligibility.items[0].availableQuantity = 1;
    const result = getOrderItemReturnAction(
      eligibility,
      [makeReturn('REFUNDED', 'PROCESSED', 1)],
      orderItemId,
      now,
    );

    expect(result).toMatchObject({
      canRequest: true,
      remainingQuantity: 1,
      statusLabel: 'Refunded · 1 remaining',
    });
  });
});
