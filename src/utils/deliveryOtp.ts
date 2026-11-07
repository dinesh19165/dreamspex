export function getDeliveryOtpWhatsAppUrl(phone: string) {
  const phoneNumber = phone.replace(/\D/g, '');
  if (phoneNumber.length < 8 || phoneNumber.length > 15) return null;

  return `https://wa.me/${phoneNumber}`;
}

export function getDeliveryOtpWhatsAppMessage(orderNumber: string, otp: string) {
  return `Dream Spex delivery OTP for order ${orderNumber}: ${otp}. Share this code with the delivery person when your order arrives.`;
}

export function canRegenerateDeliveryOtp(batchStatus: string, orderStatus: string) {
  return batchStatus === 'OPEN' && !['DELIVERED', 'REASSIGNED'].includes(orderStatus);
}
