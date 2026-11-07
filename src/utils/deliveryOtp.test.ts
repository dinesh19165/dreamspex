import { describe, expect, it } from 'vitest';
import { canRegenerateDeliveryOtp, getDeliveryOtpWhatsAppMessage, getDeliveryOtpWhatsAppUrl } from './deliveryOtp';

describe('delivery OTP WhatsApp sharing', () => {
  it('opens the individual customer chat without putting the OTP in the URL', () => {
    const url = getDeliveryOtpWhatsAppUrl('+91 99000 00000');
    const parsedUrl = new URL(url!);

    expect(parsedUrl.pathname).toBe('/919900000000');
    expect(parsedUrl.search).toBe('');
    expect(url).not.toContain('123456');
  });

  it('formats the individual order OTP message separately for clipboard pasting', () => {
    expect(getDeliveryOtpWhatsAppMessage('DS-100', '123456'))
      .toBe('Dream Spex delivery OTP for order DS-100: 123456. Share this code with the delivery person when your order arrives.');
  });

  it('does not create a WhatsApp action for an invalid phone number', () => {
    expect(getDeliveryOtpWhatsAppUrl('not a phone')).toBeNull();
  });

  it('only enables OTP regeneration for unfinished orders in open batches', () => {
    expect(canRegenerateDeliveryOtp('OPEN', 'OUT_FOR_DELIVERY')).toBe(true);
    expect(canRegenerateDeliveryOtp('COMPLETED', 'OUT_FOR_DELIVERY')).toBe(false);
    expect(canRegenerateDeliveryOtp('OPEN', 'DELIVERED')).toBe(false);
    expect(canRegenerateDeliveryOtp('OPEN', 'REASSIGNED')).toBe(false);
  });
});
