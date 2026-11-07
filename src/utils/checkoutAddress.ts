import type { CustomerAddress, CustomerAddressRequest } from '../services/addressService';
import type { Coordinates } from './deliveryNavigation';

export function addressChanged(
  address: CustomerAddress,
  draft: CustomerAddressRequest,
  coordinates: Coordinates | null,
): boolean {
  const fields: Array<keyof CustomerAddressRequest> = [
    'label', 'recipientName', 'phone', 'line1', 'line2', 'city', 'state', 'postalCode', 'countryCode',
  ];
  return fields.some((field) => String(address[field] ?? '').trim() !== String(draft[field] ?? '').trim())
    || (coordinates?.latitude ?? null) !== address.latitude
    || (coordinates?.longitude ?? null) !== address.longitude;
}
