import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AdminOrderFulfillmentDetails } from './AdminOrderFulfillmentDetails';

describe('AdminOrderFulfillmentDetails', () => {
  it('renders pickup store details and status without a delivery address', () => {
    const html = renderToStaticMarkup(<AdminOrderFulfillmentDetails
      fulfillmentType="PICKUP"
      fulfillmentStore={{
        id: 'store-1',
        name: 'Central Store',
        phone: '+911234567890',
        address: '1 Main Road',
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
      }}
      shippingAddress={null}
      status="PROCESSING"
    />);

    expect(html).toContain('Store pickup');
    expect(html).toContain('Central Store');
    expect(html).toContain('1 Main Road, Hyderabad, Telangana, 500001');
    expect(html).toContain('+911234567890');
    expect(html).toContain('Pickup status:');
    expect(html).not.toContain('Delivery address');
  });

  it('renders delivery contact and location while tolerating a missing address', () => {
    const deliveryHtml = renderToStaticMarkup(<AdminOrderFulfillmentDetails
      fulfillmentType="DELIVERY"
      fulfillmentStore={null}
      shippingAddress={{
        recipientName: 'Jane Doe',
        phone: '+919876543210',
        line1: '2 Main Road',
        line2: null,
        city: 'Hyderabad',
        state: 'Telangana',
        postalCode: '500001',
        countryCode: 'IN',
      }}
      status="DELIVERED"
    />);
    const missingAddressHtml = renderToStaticMarkup(<AdminOrderFulfillmentDetails
      fulfillmentType="DELIVERY"
      fulfillmentStore={null}
      shippingAddress={null}
      status="PENDING_PAYMENT"
    />);

    expect(deliveryHtml).toContain('Delivery address');
    expect(deliveryHtml).toContain('Jane Doe · +919876543210');
    expect(deliveryHtml).toContain('2 Main Road');
    expect(missingAddressHtml).toContain('Delivery address unavailable.');
  });
});
