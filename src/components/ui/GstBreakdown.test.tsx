import { isValidElement, type ReactNode } from 'react';
import { describe, expect, it } from 'vitest';
import GstBreakdown from './GstBreakdown';
import type { GstBreakdownData } from '../../utils/gst';

function getText(node: ReactNode): string {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(getText).join('');
  if (isValidElement<{ children?: ReactNode }>(node)) return getText(node.props.children);
  return '';
}

const inclusiveRate = {
  taxableAmount: 2117.8,
  gstAmount: 381.2,
  cgstAmount: 0,
  sgstAmount: 0,
  igstAmount: 381.2,
  appliedRate: 18,
  priceTreatment: 'INCLUSIVE',
} satisfies GstBreakdownData;

describe('GST breakdown display', () => {
  it('shows only taxable value and IGST for an inclusive interstate order', () => {
    const text = getText(GstBreakdown({ breakdown: inclusiveRate }));

    expect(text).toContain('Taxable value');
    expect(text).toContain('IGST (18%)');
    expect(text).not.toMatch(/\bGST \(/);
    expect(text).not.toContain('CGST');
    expect(text).not.toContain('SGST');
  });

  it('shows CGST and SGST separately for an inclusive intrastate order', () => {
    const text = getText(GstBreakdown({
      breakdown: {
        ...inclusiveRate,
        cgstAmount: 190.6,
        sgstAmount: 190.6,
        igstAmount: 0,
      },
    }));

    expect(text).toContain('CGST (9%)');
    expect(text).toContain('SGST (9%)');
    expect(text).not.toMatch(/\bGST \(/);
    expect(text).not.toContain('IGST');
  });
});
