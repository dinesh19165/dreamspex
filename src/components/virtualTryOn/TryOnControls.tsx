import { Minus, Plus, RotateCcw, RotateCw, RotateCcw as ResetIcon, ArrowDown, ArrowUp } from 'lucide-react';
import type { TryOnControls as Controls } from '../../types/virtualTryOn';

type TryOnControlsProps = {
  controls: Controls;
  onChange: (controls: Controls) => void;
  onReset: () => void;
};

export default function TryOnControls({ controls, onChange, onReset }: TryOnControlsProps) {
  const adjust = (key: keyof Controls, amount: number) => onChange({ ...controls, [key]: controls[key] + amount });
  const controlButton = (label: string, onClick: () => void, icon: React.ReactNode) => <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-2 text-[var(--text-secondary)] transition hover:border-[#7CBF00]/60 hover:text-[var(--brand-green-dark)]">{icon}</button>;

  return <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--text-secondary)]">Fine tune</p><div className="mt-4 grid gap-3 text-sm text-[var(--text-secondary)]"><div className="flex items-center justify-between gap-3"><span>Frame size</span><div className="flex gap-2">{controlButton('Reduce frame size', () => adjust('scale', -0.05), <Minus className="h-4 w-4" />)}{controlButton('Increase frame size', () => adjust('scale', 0.05), <Plus className="h-4 w-4" />)}</div></div><div className="flex items-center justify-between gap-3"><span>Vertical position</span><div className="flex gap-2">{controlButton('Move frame up', () => adjust('offsetY', -0.01), <ArrowUp className="h-4 w-4" />)}{controlButton('Move frame down', () => adjust('offsetY', 0.01), <ArrowDown className="h-4 w-4" />)}</div></div><div className="flex items-center justify-between gap-3"><span>Rotation</span><div className="flex gap-2">{controlButton('Rotate frame left', () => adjust('rotation', -2), <RotateCcw className="h-4 w-4" />)}{controlButton('Rotate frame right', () => adjust('rotation', 2), <RotateCw className="h-4 w-4" />)}</div></div></div><button type="button" onClick={onReset} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[var(--brand-green-dark)] hover:text-[var(--text-primary)]"><ResetIcon className="h-4 w-4" />Reset Position</button></div>;
}
