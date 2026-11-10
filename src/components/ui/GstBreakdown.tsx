import type { GstBreakdownData } from '../../utils/gst';
import { formatINR } from '../../utils/currency';

export default function GstBreakdown({ breakdown }: { breakdown: GstBreakdownData | null }) {
  if (!breakdown) {
    return <p className="text-xs leading-5 text-[var(--text-secondary)]" role="status">
      GST breakdown is not available from the backend for this item.
    </p>;
  }

  const componentRate = breakdown.appliedRate == null
    ? null
    : Number((breakdown.appliedRate / 2).toFixed(2));
  const rateLabel = (rate: number | null) => rate == null
    ? ''
    : ` (${Number(rate.toFixed(2))}%)`;

  return <div className="space-y-2 text-sm text-[var(--text-secondary)]" aria-label="GST breakdown">
    <div className="flex justify-between gap-4"><span>Taxable value</span><span>{formatINR(breakdown.taxableAmount)}</span></div>
    {breakdown.hsnCode ? <div className="flex justify-between gap-4"><span>HSN</span><span>{breakdown.hsnCode}</span></div> : null}
    {breakdown.cgstAmount > 0 || breakdown.sgstAmount > 0
      ? <>
        <div className="flex justify-between gap-4"><span>CGST{rateLabel(componentRate)}</span><span>{formatINR(breakdown.cgstAmount)}</span></div>
        <div className="flex justify-between gap-4"><span>SGST{rateLabel(componentRate)}</span><span>{formatINR(breakdown.sgstAmount)}</span></div>
      </>
      : null}
    {breakdown.igstAmount > 0
      ? <div className="flex justify-between gap-4"><span>IGST{rateLabel(breakdown.appliedRate)}</span><span>{formatINR(breakdown.igstAmount)}</span></div>
      : null}
  </div>;
}
