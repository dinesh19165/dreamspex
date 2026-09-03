export type CouponDefinition = {
  code: string;
  discountPercent: number;
};

export type CouponResult = {
  code: string;
  discountPercent: number;
  discountAmount: number;
  total: number;
};

export const couponDefinitions: CouponDefinition[] = [
  { code: 'LUXE20', discountPercent: 20 },
  { code: 'GLOW15', discountPercent: 15 },
  { code: 'BANK10', discountPercent: 10 },
];

export function findCoupon(code: string) {
  const normalizedCode = code.trim().toUpperCase();
  return couponDefinitions.find((coupon) => coupon.code === normalizedCode);
}

export function calculateCoupon(code: string, subtotal: number): CouponResult | null {
  const coupon = findCoupon(code);
  if (!coupon) return null;
  const discountAmount = Math.round(subtotal * coupon.discountPercent) / 100;
  return { code: coupon.code, discountPercent: coupon.discountPercent, discountAmount, total: subtotal - discountAmount };
}
