const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const indianMobilePattern = /^[6-9]\d{9}$/;

export function isValidEmailOrIndianPhone(value: string) {
  const identifier = value.trim();
  if (identifier.includes('@')) {
    return emailPattern.test(identifier);
  }
  if (!/^\+?[\d\s().-]+$/.test(identifier)) {
    return false;
  }
  const compact = identifier.replace(/[\s().-]/g, '');
  const digits = compact.startsWith('+') ? compact.slice(1) : compact;
  const nationalNumber = digits.startsWith('91') && digits.length === 12
    ? digits.slice(2)
    : digits;
  return indianMobilePattern.test(nationalNumber);
}
