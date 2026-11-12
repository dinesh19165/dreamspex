const PICKUP_TYPES = new Set(['PICKUP', 'STORE_PICKUP']);
const KNOWN_ORDER_STATUSES = new Set([
  'PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED',
  'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED',
]);

export function isPickupOrder(fulfillmentType?: string | null) {
  return PICKUP_TYPES.has(fulfillmentType ?? '');
}

export function nextOrderStatuses(status: string, fulfillmentType?: string | null) {
  const pickup = isPickupOrder(fulfillmentType);
  const transitions: Record<string, string[]> = {
    PENDING_PAYMENT: ['CANCELLED'],
    PAID: ['PROCESSING', 'CANCELLED'],
    PROCESSING: pickup ? ['READY_FOR_PICKUP', 'CANCELLED'] : ['SHIPPED', 'CANCELLED'],
    READY_FOR_PICKUP: pickup ? ['PICKED_UP', 'CANCELLED'] : [],
    SHIPPED: pickup ? [] : ['DELIVERED'],
  };
  return transitions[status] ?? [];
}

export function nextFranchiseOrderStatuses(status: string, fulfillmentType?: string | null) {
  return nextOrderStatuses(status, fulfillmentType)
    .filter((nextStatus) => nextStatus !== 'CANCELLED' && nextStatus !== 'DELIVERED');
}

export function orderProgressStatuses(fulfillmentType?: string | null) {
  return isPickupOrder(fulfillmentType)
    ? new Set(['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'READY_FOR_PICKUP', 'PICKED_UP', 'CANCELLED'])
    : new Set(['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']);
}

export function isOrderFulfilled(status: string, fulfillmentType?: string | null) {
  return isPickupOrder(fulfillmentType)
    ? status === 'PICKED_UP'
    : status === 'DELIVERED';
}

export function orderStatusLabel(status: string, _fulfillmentType?: string | null) {
  return KNOWN_ORDER_STATUSES.has(status) ? status.replaceAll('_', ' ') : 'Status needs review';
}
