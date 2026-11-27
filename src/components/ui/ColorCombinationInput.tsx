import type { Ref } from 'react';
import { canonicalizeColorCombination, formatColorLabel, parseColorComponents, toggleColorComponent } from '../../utils/colorSwatches';
import ColorSwatch from './ColorSwatch';

const palette = [
  'BLACK', 'RED', 'BLUE', 'WHITE', 'BROWN', 'GOLD', 'GREEN', 'GREY', 'SILVER', 'PINK',
  'BURGUNDY', 'NAVY BLUE', 'OLIVE GREEN', 'BLUSH PINK', 'MATTE BLACK', 'TORTOISE',
  'HAVANA', 'GUNMETAL', 'PURPLE', 'ORANGE', 'CLEAR',
];

type ColorCombinationInputProps = {
  value: string;
  onChange: (value: string) => void;
  id?: string;
  inputRef?: Ref<HTMLInputElement>;
  error?: string;
  required?: boolean;
  optional?: boolean;
};

export default function ColorCombinationInput({ value, onChange, id = 'color-combination', inputRef, error, required = false, optional = false }: ColorCombinationInputProps) {
  const selected = new Set(parseColorComponents(value).map((component) => component.toLowerCase()));
  const preview = canonicalizeColorCombination(value);

  return (
    <div className="block text-sm text-[var(--text-secondary)]">
      <label className="block" htmlFor={id}>
        <span>Color combination{required
          ? <span className="ml-1 font-semibold text-red-600" aria-label="required">*</span>
          : optional ? <span className="ml-1 text-xs text-[#68756b]">(optional)</span> : null}</span>
        <input
          id={id}
          ref={inputRef}
          required={required}
          aria-required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
          className={`mt-2 w-full rounded-2xl border bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none ${error ? '!border-red-500' : 'border-[var(--border-subtle)]'}`}
          value={value}
          placeholder="e.g. RED/BLACK"
          onChange={(event) => onChange(event.target.value)}
          onBlur={() => {
            const canonical = canonicalizeColorCombination(value) ?? '';
            if (canonical !== value) onChange(canonical);
          }}
        />
      </label>
      {error ? <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-red-700">{error}</p> : null}
      <details className="mt-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
        <summary className="cursor-pointer px-3 py-2 text-xs font-medium text-[var(--text-primary)]">
          Select colour components
        </summary>
        <div className="grid grid-cols-2 gap-1 border-t border-[var(--border-subtle)] p-2 sm:grid-cols-3">
          {palette.map((component) => (
            <label key={component} className="inline-flex min-w-0 cursor-pointer items-center gap-1.5 rounded-lg px-1.5 py-1 text-xs hover:bg-[var(--bg-secondary)]">
              <input
                type="checkbox"
                checked={selected.has(component.toLowerCase())}
                onChange={(event) => onChange(toggleColorComponent(value, component, event.target.checked) ?? '')}
                className="h-3.5 w-3.5 shrink-0 accent-[#7CBF00]"
              />
              <ColorSwatch color={component} className="h-3.5 w-3.5 border border-black/15" />
              <span className="truncate">{formatColorLabel(component)}</span>
            </label>
          ))}
        </div>
      </details>
      <div className="mt-2 flex min-h-7 items-center gap-2 text-xs">
        {preview ? <ColorSwatch color={preview} className="h-5 w-5 border border-black/15" /> : null}
        <span>{preview ? formatColorLabel(preview) : 'No colour selected'}</span>
      </div>
    </div>
  );
}
