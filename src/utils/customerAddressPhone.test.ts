import { describe, expect, it } from 'vitest';
import {
  formatPhoneInput,
  phoneInputFromSavedAddress,
  resolveCountryCode,
} from './customerAddressPhone';

describe('customer address phone numbers', () => {
  it('defaults unknown legacy country names to India and resolves India by name', () => {
    expect(resolveCountryCode('India')).toBe('IN');
    expect(resolveCountryCode('unknown')).toBe('IN');
  });

  it('normalizes Indian national numbers and E.164 values', () => {
    expect(formatPhoneInput('9876543210', 'IN')).toMatchObject({
      phone: '+919876543210',
      nationalNumber: '9876543210',
    });
    expect(formatPhoneInput('+919876543210', 'IN')).toMatchObject({
      phone: '+919876543210',
      nationalNumber: '9876543210',
    });
  });

  it('normalizes an international number using its selected country', () => {
    expect(formatPhoneInput('(202) 555-0125', 'US')).toMatchObject({
      phone: '+12025550125',
      nationalNumber: '2025550125',
    });
    expect(formatPhoneInput('+442071838750', 'US')).toBeNull();
    expect(formatPhoneInput('+12025550125', 'CA')).toBeNull();
    expect(formatPhoneInput('+14165550123', 'CA')?.phone).toBe('+14165550123');
  });

  it('loads legacy Indian numbers with or without the +91 prefix for editing', () => {
    expect(phoneInputFromSavedAddress('+919876543210', 'IN')).toEqual({
      countryCode: 'IN',
      phone: '9876543210',
    });
    expect(phoneInputFromSavedAddress('919876543210', 'India')).toEqual({
      countryCode: 'IN',
      phone: '9876543210',
    });
  });

  it('rejects numbers invalid for the selected country', () => {
    expect(formatPhoneInput('123', 'IN')).toBeNull();
  });
});
