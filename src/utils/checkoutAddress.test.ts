import { describe, expect, it } from 'vitest';
import type { CustomerAddress, CustomerAddressRequest } from '../services/addressService';
import { addressChanged } from './checkoutAddress';

const address: CustomerAddress = {
  id: 'address-1',
  label: 'Home',
  recipientName: 'Customer',
  phone: '+919876543210',
  line1: '1 Test Street',
  line2: null,
  city: 'Hyderabad',
  state: 'Telangana',
  postalCode: '500001',
  countryCode: 'IN',
  defaultAddress: true,
  latitude: 17.385,
  longitude: 78.4867,
};

const draft: CustomerAddressRequest = {
  label: 'Home',
  recipientName: 'Customer',
  phone: '+919876543210',
  line1: '1 Test Street',
  line2: '',
  city: 'Hyderabad',
  state: 'Telangana',
  postalCode: '500001',
  countryCode: 'IN',
  defaultAddress: true,
  latitude: 17.385,
  longitude: 78.4867,
};

describe('checkout address freshness', () => {
  it('accepts a saved address and matching map coordinates', () => {
    expect(addressChanged(address, draft, { latitude: 17.385, longitude: 78.4867 })).toBe(false);
  });

  it('invalidates availability after the customer changes the address', () => {
    expect(addressChanged(address, { ...draft, city: 'Secunderabad' }, { latitude: 17.385, longitude: 78.4867 })).toBe(true);
  });

  it('invalidates availability after the customer moves the map pin', () => {
    expect(addressChanged(address, draft, { latitude: 17.39, longitude: 78.49 })).toBe(true);
  });

  it('recognizes a saved address without coordinates as unchanged until a map pin is selected', () => {
    expect(addressChanged({ ...address, latitude: null, longitude: null }, { ...draft, latitude: null, longitude: null }, null)).toBe(false);
  });
});
