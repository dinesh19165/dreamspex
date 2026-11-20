import { describe, expect, it } from 'vitest';
import { isValidEmailOrIndianPhone } from './authIdentifier';

describe('isValidEmailOrIndianPhone', () => {
  it('accepts trimmed email addresses', () => {
    expect(isValidEmailOrIndianPhone('  customer@example.com ')).toBe(true);
  });

  it('accepts ten-digit Indian mobile numbers with an optional +91 prefix', () => {
    expect(isValidEmailOrIndianPhone('8328105293')).toBe(true);
    expect(isValidEmailOrIndianPhone('+91 8328-105-293')).toBe(true);
    expect(isValidEmailOrIndianPhone('918328105293')).toBe(true);
  });

  it('rejects invalid emails and mobile numbers', () => {
    expect(isValidEmailOrIndianPhone('not-an-email')).toBe(false);
    expect(isValidEmailOrIndianPhone('1234567890')).toBe(false);
    expect(isValidEmailOrIndianPhone('+1 415 555 2671')).toBe(false);
  });
});
