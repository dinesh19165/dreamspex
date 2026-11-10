export type GstPriceTreatment = 'INCLUSIVE' | 'EXCLUSIVE';

export type GstBreakdownData = {
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  appliedRate: number | null;
  priceTreatment: GstPriceTreatment;
  hsnCode?: string | null;
};

export type ProductGstInformation = {
  gstEnabled: boolean;
  gstRate: number | null;
  hsnCode: string | null;
};

type GstBreakdownFields = {
  taxableAmount?: number | null;
  gstAmount?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  appliedRate?: number | null;
  gstRate?: number | null;
  priceTreatment?: GstPriceTreatment | null;
  hsnCode?: string | null;
} | null | undefined;

export function isValidGstRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 0 && rate <= 100;
}

export function productGstInformation(product: ProductGstInformation): string {
  if (!product.gstEnabled) return 'GST is disabled for this product.';
  if (product.gstRate == null) {
    return 'GST at the applicable global rate is included in the displayed price. The rate and tax component breakdown are confirmed at checkout based on your delivery address.';
  }
  return `${product.gstRate}% GST is included in the displayed price. The tax component breakdown is confirmed at checkout based on your delivery address.`;
}

export function toGstBreakdown(fields: GstBreakdownFields): GstBreakdownData | null {
  if (!fields || fields.priceTreatment !== 'INCLUSIVE' && fields.priceTreatment !== 'EXCLUSIVE') return null;
  const appliedRate = fields.appliedRate ?? fields.gstRate;
  if (typeof fields.taxableAmount !== 'number' || !Number.isFinite(fields.taxableAmount)
    || typeof fields.gstAmount !== 'number' || !Number.isFinite(fields.gstAmount)
    || typeof fields.cgstAmount !== 'number' || !Number.isFinite(fields.cgstAmount)
    || typeof fields.sgstAmount !== 'number' || !Number.isFinite(fields.sgstAmount)
    || typeof fields.igstAmount !== 'number' || !Number.isFinite(fields.igstAmount)
    || appliedRate != null && (typeof appliedRate !== 'number' || !Number.isFinite(appliedRate))) return null;

  return {
    taxableAmount: fields.taxableAmount,
    gstAmount: fields.gstAmount,
    cgstAmount: fields.cgstAmount,
    sgstAmount: fields.sgstAmount,
    igstAmount: fields.igstAmount,
    appliedRate: appliedRate ?? null,
    priceTreatment: fields.priceTreatment,
    hsnCode: fields.hsnCode,
  };
}
