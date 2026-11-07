import { Check } from 'lucide-react';
import type { LensOption } from '../../services/prescriptionService';
import { formatINR } from '../../utils/currency';

type LensSelectorProps = {
  options: LensOption[];
  selectedCodes: string[];
  onChange: (codes: string[]) => void;
};

const groups = [
  { category: 'TYPE', title: 'Lens type' },
  { category: 'COATING', title: 'Optional coatings' },
  { category: 'MATERIAL', title: 'Lens material' },
] as const;

export default function LensSelector({ options, selectedCodes, onChange }: LensSelectorProps) {
  const choose = (option: LensOption) => {
    if (!option.available || option.additionalCost == null) return;
    if (option.category === 'TYPE') {
      onChange([...selectedCodes.filter((code) => !options.some((item) => item.code === code && item.category === 'TYPE')), option.code]);
      return;
    }
    onChange(selectedCodes.includes(option.code)
      ? selectedCodes.filter((code) => code !== option.code)
      : [...selectedCodes, option.code]);
  };

  return (
    <div className="space-y-7">
      {groups.map((group) => {
        const items = options.filter((option) => option.category === group.category);
        if (!items.length) return null;
        return (
          <section key={group.category}>
            <h3 className="text-lg font-semibold text-[var(--text-primary)]">{group.title}</h3>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {items.map((option) => {
                const selected = selectedCodes.includes(option.code);
                const canSelect = option.available && option.additionalCost != null;
                return (
                  <article key={option.code} className={`rounded-2xl border p-4 ${selected ? 'border-cyan-400/60 bg-cyan-400/10' : 'border-[var(--border-subtle)] bg-[var(--bg-card)]'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div><h4 className="font-semibold text-[var(--text-primary)]">{option.name}</h4>
                        <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{option.benefits}</p>
                      </div>
                      {option.recommended ? <span className="shrink-0 rounded-full bg-cyan-400/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-cyan-200">Suggested</span> : null}
                    </div>
                    {option.recommendationReason ? <p className="mt-2 text-xs text-cyan-200">{option.recommendationReason}</p> : null}
                    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                      <div className="text-sm text-cyan-200">
                        {option.additionalCost == null ? 'Price not configured' : option.additionalCost === 0 ? 'Included' : `+${formatINR(option.additionalCost)}`}
                        {option.preparationDays ? <span className="ml-2 text-xs text-[var(--text-secondary)]">· {option.preparationDays} days</span> : null}
                      </div>
                      {canSelect ? <button type="button" onClick={() => choose(option)} className="inline-flex items-center gap-2 rounded-full border border-cyan-400/50 px-3 py-2 text-xs font-semibold text-cyan-100">
                        {selected ? <><Check className="h-4 w-4" />Selected</> : 'Select Lens'}
                      </button> : <span className="text-xs text-[var(--text-secondary)]">Currently unavailable</span>}
                    </div>
                  </article>
                );
              })}
            </div>
          </section>
        );
      })}
      <p className="text-xs leading-5 text-[var(--text-secondary)]">Suggestions are informational and are not medical advice. An optician should review complex prescriptions.</p>
    </div>
  );
}
