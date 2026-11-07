import type { DriverDeliveryBatch } from '../services/deliveryBatchService';

export type ReturnDeliveryAction = { status: string; label: string };

export function getReturnDeliveryActions(
  status: string,
  operationType: DriverDeliveryBatch['operationType'],
): ReturnDeliveryAction[] {
  if (operationType === 'RETURN_PICKUP') {
    if (status === 'PENDING') return [
      { status: 'FAILED_ATTEMPT', label: 'Failed pickup attempt' },
      { status: 'PICKED_UP', label: 'Confirm return pickup' },
    ];
    if (status === 'FAILED_ATTEMPT') return [{ status: 'PICKED_UP', label: 'Confirm return pickup' }];
    return [];
  }
  switch (status) {
    case 'PENDING': return [{ status: 'PACKED', label: 'Mark packed' }];
    case 'PACKED': return [{ status: 'PICKED_UP', label: 'Mark picked up' }];
    case 'PICKED_UP': return [{ status: 'OUT_FOR_DELIVERY', label: 'Out for delivery' }];
    case 'OUT_FOR_DELIVERY': return [
      { status: 'FAILED_ATTEMPT', label: 'Failed attempt' },
      { status: 'DELIVERED', label: 'Mark delivered' },
    ];
    case 'FAILED_ATTEMPT': return [{ status: 'OUT_FOR_DELIVERY', label: 'Retry delivery' }];
    default: return [];
  }
}

export function returnDeliveryRequiresOtp(
  status: string,
  operationType: DriverDeliveryBatch['operationType'],
) {
  return operationType === 'RETURN_PICKUP'
    ? status === 'PICKED_UP'
    : status === 'DELIVERED';
}
