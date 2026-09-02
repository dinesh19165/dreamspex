import { Minus, Plus, RotateCcw, RotateCw, RotateCcw as ResetIcon, ArrowDown, ArrowUp } from 'lucide-react';
import type { TryOnControls as Controls } from '../../types/virtualTryOn';

type TryOnControlsProps = {
  controls: Controls;
  onChange: (controls: Controls) => void;
  onReset: () => void;
};

export default function TryOnControls({ controls, onChange, onReset }: TryOnControlsProps) {
  const adjust = (key: keyof Controls, amount: number) => onChange({ ...controls, [key]: controls[key] + amount });
  const controlButton = (label: string, onClick: () => void, icon: React.ReactNode) => <button type="button" onClick={onClick} aria-label={label} title={label} className="rounded-full border border-white/10 bg-slate-950/60 p-2 text-slate-200 transition hover:border-[#7CBF00]/60 hover:text-[#9ACD32]">{icon}</button>;

  return <div className="rounded-[20px] border border-white/10 bg-slate-950/50 p-4"><p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-400">Fine tune</p><div className="mt-4 grid gap-3 text-sm text-slate-300"><div className="flex items-center justify-between gap-3"><span>Frame size</span><div className="flex gap-2">{controlButton('Reduce frame size', () => adjust('scale', -0.05), <Minus className="h-4 w-4" />)}{controlButton('Increase frame size', () => adjust('scale', 0.05), <Plus className="h-4 w-4" />)}</div></div><div className="flex items-center justify-between gap-3"><span>Vertical position</span><div className="flex gap-2">{controlButton('Move frame up', () => adjust('offsetY', -0.01), <ArrowUp className="h-4 w-4" />)}{controlButton('Move frame down', () => adjust('offsetY', 0.01), <ArrowDown className="h-4 w-4" />)}</div></div><div className="flex items-center justify-between gap-3"><span>Rotation</span><div className="flex gap-2">{controlButton('Rotate frame left', () => adjust('rotation', -2), <RotateCcw className="h-4 w-4" />)}{controlButton('Rotate frame right', () => adjust('rotation', 2), <RotateCw className="h-4 w-4" />)}</div></div></div><button type="button" onClick={onReset} className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[#9ACD32] hover:text-white"><ResetIcon className="h-4 w-4" />Reset Position</button></div>;
}
