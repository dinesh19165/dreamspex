import { describe, expect, it } from 'vitest';
import { isValidGstRate, productGstInformation, toGstBreakdown } from './gst';

describe('backend GST response handling', () => {
  it('accepts valid rates from zero through one hundred', () => {
    expect(isValidGstRate(0)).toBe(true);
    expect(isValidGstRate(100)).toBe(true);
    expect(isValidGstRate(-0.1)).toBe(false);
    expect(isValidGstRate(Number.NaN)).toBe(false);
  });

  it('preserves the backend inclusive CGST and SGST breakdown', () => {
    expect(toGstBreakdown({
      taxableAmount: 100,
      gstAmount: 18,
      cgstAmount: 9,
      sgstAmount: 9,
      igstAmount: 0,
      appliedRate: 18,
      priceTreatment: 'INCLUSIVE',
      hsnCode: '900311',
    })).toEqual({
      taxableAmount: 100,
      gstAmount: 18,
      cgstAmount: 9,
      sgstAmount: 9,
      igstAmount: 0,
      appliedRate: 18,
      priceTreatment: 'INCLUSIVE',
      hsnCode: '900311',
    });
  });

  it('preserves a backend interstate IGST breakdown', () => {
    expect(toGstBreakdown({
      taxableAmount: 100,
      gstAmount: 18,
      cgstAmount: 0,
      sgstAmount: 0,
      igstAmount: 18,
      gstRate: 18,
      priceTreatment: 'INCLUSIVE',
    })?.igstAmount).toBe(18);
  });

  it('does not fabricate amounts when the backend omitted GST fields', () => {
    expect(toGstBreakdown({ taxableAmount: 100, gstAmount: 18, gstRate: 18 })).toBeNull();
    expect(toGstBreakdown(null)).toBeNull();
  });

  it('displays the configured product rate without inventing a tax breakdown', () => {
    expect(productGstInformation({ gstEnabled: true, gstRate: 18, hsnCode: '900311' }))
      .toBe('18% GST is included in the displayed price. The tax component breakdown is confirmed at checkout based on your delivery address.');
  });

  it('does not invent a numeric rate when the product uses the global fallback', () => {
    expect(productGstInformation({ gstEnabled: true, gstRate: null, hsnCode: null }))
      .toContain('GST at the applicable global rate is included in the displayed price');
  });

  it('does not claim GST is included when it is disabled for the product', () => {
    expect(productGstInformation({ gstEnabled: false, gstRate: null, hsnCode: null }))
      .toBe('GST is disabled for this product.');
  });
});
