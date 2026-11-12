import type { AdminOrder } from '../../services/adminService';
import { orderStatusLabel } from '../../utils/orderWorkflow';

type Props = Pick<AdminOrder, 'fulfillmentType' | 'fulfillmentStore' | 'shippingAddress' | 'status'>;

export function AdminOrderFulfillmentDetails({
  fulfillmentType,
  fulfillmentStore,
  shippingAddress,
  status,
}: Props) {
  if (fulfillmentType === 'PICKUP' || fulfillmentType === 'STORE_PICKUP') {
    const pickupAddress = fulfillmentStore
      ? [fulfillmentStore.address, fulfillmentStore.city, fulfillmentStore.state, fulfillmentStore.postalCode]
        .filter(Boolean)
        .join(', ')
      : '';

    return <section aria-labelledby="admin-pickup-heading">
      <h3 id="admin-pickup-heading" className="font-semibold">Store pickup</h3>
      <p className="mt-2 text-sm">{fulfillmentStore?.name || 'Pickup store information unavailable'}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{pickupAddress || 'Pickup address unavailable'}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">Store phone: {fulfillmentStore?.phone || 'Not available'}</p>
      <p className="mt-2 text-sm">Pickup status: <span className="font-medium">{orderStatusLabel(status, fulfillmentType)}</span></p>
      <p className="mt-2 text-sm text-[var(--text-secondary)]">Pickup instructions: Bring your order confirmation and a valid photo ID to the store. Store staff will confirm the handover.</p>
    </section>;
  }

  return <section aria-labelledby="admin-delivery-heading">
    <h3 id="admin-delivery-heading" className="font-semibold">Delivery address</h3>
    {shippingAddress ? <>
      <p className="mt-2 text-sm">{[shippingAddress.recipientName, shippingAddress.phone].filter(Boolean).join(' · ') || 'Delivery contact unavailable'}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{[shippingAddress.line1, shippingAddress.line2].filter(Boolean).join(', ') || 'Street address unavailable'}</p>
      <p className="mt-1 text-sm text-[var(--text-secondary)]">{[shippingAddress.city, shippingAddress.state, shippingAddress.postalCode, shippingAddress.countryCode].filter(Boolean).join(', ') || 'Delivery location unavailable'}</p>
    </> : <p className="mt-2 text-sm text-[var(--text-secondary)]">Delivery address unavailable.</p>}
  </section>;
}
