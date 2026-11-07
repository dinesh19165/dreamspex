import { describe, expect, it } from 'vitest';
import { getDeliveryBatchFormState } from './deliveryBatchForm';
import type { EligibleDeliveryOrder } from '../services/deliveryBatchService';

const eligibleOrder: EligibleDeliveryOrder = {
  id: 'order-1',
  orderNumber: 'DS-100',
  status: 'PROCESSING',
  paymentStatus: 'PAID',
  recipientName: 'Test Customer',
  city: 'Hyderabad',
  state: 'Telangana',
  postalCode: '500001',
  createdAt: '2026-11-06T00:00:00Z',
};

describe('delivery batch create form state', () => {
  it('enables create for a selected eligible order and a non-empty route name', () => {
    expect(getDeliveryBatchFormState([eligibleOrder], ['order-1'], ' Madhapur route ', false, false))
      .toEqual({
        selectedOrderIds: ['order-1'],
        routeNameMissing: false,
        canCreate: true,
      });
  });

  it('does not require or depend on the include-assigned checkbox', () => {
    const form = getDeliveryBatchFormState([eligibleOrder], ['order-1'], 'Hyderabad route', false, false);

    expect(form.canCreate).toBe(true);
  });

  it('requires a route name and exposes that validation state', () => {
    const form = getDeliveryBatchFormState([eligibleOrder], ['order-1'], '   ', false, false);

    expect(form.canCreate).toBe(false);
    expect(form.routeNameMissing).toBe(true);
  });

  it('disables create when no selected order is currently eligible', () => {
    expect(getDeliveryBatchFormState([eligibleOrder], ['stale-order'], 'Hyderabad route', false, false).canCreate)
      .toBe(false);
    expect(getDeliveryBatchFormState([], ['order-1'], 'Hyderabad route', false, false).canCreate)
      .toBe(false);
    expect(getDeliveryBatchFormState(
      [{ ...eligibleOrder, paymentStatus: 'PENDING' }], ['order-1'], 'Hyderabad route', false, false,
    ).canCreate).toBe(false);
    expect(getDeliveryBatchFormState(
      [{ ...eligibleOrder, status: 'SHIPPED' }], ['order-1'], 'Hyderabad route', false, false,
    ).canCreate).toBe(false);
  });

  it('disables create while eligible orders load or a create request is in flight', () => {
    expect(getDeliveryBatchFormState([eligibleOrder], ['order-1'], 'Hyderabad route', true, false).canCreate)
      .toBe(false);
    expect(getDeliveryBatchFormState([eligibleOrder], ['order-1'], 'Hyderabad route', false, true).canCreate)
      .toBe(false);
  });

  it('deduplicates selected eligible order identifiers', () => {
    expect(getDeliveryBatchFormState([eligibleOrder], ['order-1', 'order-1'], 'Hyderabad route', false, false)
      .selectedOrderIds).toEqual(['order-1']);
  });
});
