import type { EligibleDeliveryOrder } from '../services/deliveryBatchService';

export function getDeliveryBatchFormState(
  eligibleOrders: EligibleDeliveryOrder[],
  selectedIds: string[],
  routeName: string,
  loading: boolean,
  creating: boolean,
) {
  const eligibleIds = new Set(eligibleOrders
    .filter((order) => order.status === 'PROCESSING' && order.paymentStatus === 'PAID')
    .map((order) => order.id));
  const selectedOrderIds = [...new Set(selectedIds)].filter((id) => eligibleIds.has(id));
  const routeNameMissing = routeName.trim().length === 0;

  return {
    selectedOrderIds,
    routeNameMissing,
    canCreate: selectedOrderIds.length > 0 && !routeNameMissing && !loading && !creating,
  };
}
