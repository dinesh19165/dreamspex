import { useState } from 'react';

type Preset = 'all' | 'today' | 'yesterday' | 'last7' | 'last30' | 'thisMonth' | 'lastMonth' | 'thisYear' | 'custom';

type Props = {
  startDate: string;
  endDate: string;
  onApply: (startDate: string, endDate: string) => void;
};

function reportDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function shiftDate(value: string, offset: number) {
  const date = new Date(`${value}T00:00:00+05:30`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function presetRange(preset: Exclude<Preset, 'custom'>, today: string) {
  if (preset === 'today') return { start: today, end: today };
  if (preset === 'yesterday') {
    const yesterday = shiftDate(today, -1);
    return { start: yesterday, end: yesterday };
  }
  if (preset === 'last7') return { start: shiftDate(today, -6), end: today };
  if (preset === 'last30') return { start: shiftDate(today, -29), end: today };
  if (preset === 'thisMonth') return { start: `${today.slice(0, 7)}-01`, end: today };
  if (preset === 'lastMonth') {
    const previousMonth = new Date(`${today.slice(0, 7)}-01T00:00:00+05:30`);
    previousMonth.setUTCDate(previousMonth.getUTCDate() - 1);
    const lastDay = previousMonth.toISOString().slice(0, 10);
    return { start: `${lastDay.slice(0, 7)}-01`, end: lastDay };
  }
  return { start: `${today.slice(0, 4)}-01-01`, end: today };
}

const buttonClass = 'rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium hover:border-[var(--brand-green)]';

export default function AdminDateRangeFilter({ startDate, endDate, onApply }: Props) {
  const today = reportDate(new Date());
  const [preset, setPreset] = useState<Preset>(startDate || endDate ? 'custom' : 'all');
  const [from, setFrom] = useState(startDate);
  const [to, setTo] = useState(endDate);
  const [error, setError] = useState('');

  const selectPreset = (value: Preset) => {
    setPreset(value);
    setError('');
    if (value === 'all') {
      setFrom('');
      setTo('');
      onApply('', '');
    } else if (value !== 'custom') {
      const range = presetRange(value, today);
      setFrom(range.start);
      setTo(range.end);
      onApply(range.start, range.end);
    }
  };

  const applyCustomRange = () => {
    if (!from || !to || from > to) {
      setError('Choose a valid date range. The start date must not follow the end date.');
      return;
    }
    if (to > today) {
      setError('The end date cannot be in the future.');
      return;
    }
    setError('');
    onApply(from, to);
  };

  const reset = () => {
    const range = presetRange('last30', today);
    setPreset('last30');
    setFrom(range.start);
    setTo(range.end);
    setError('');
    onApply(range.start, range.end);
  };

  return <div className="flex flex-wrap items-end gap-2" aria-label="Report date range">
    <label className="text-xs font-medium text-[var(--text-secondary)]">Date range
      <select value={preset} onChange={(event) => selectPreset(event.target.value as Preset)} className="mt-1 block h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]">
        <option value="all">All time</option><option value="today">Today</option><option value="yesterday">Yesterday</option>
        <option value="last7">Last 7 days</option><option value="last30">Last 30 days</option>
        <option value="thisMonth">This month</option><option value="lastMonth">Last month</option>
        <option value="thisYear">This year</option><option value="custom">Custom range</option>
      </select>
    </label>
    {preset === 'custom' ? <>
      <label className="text-xs font-medium text-[var(--text-secondary)]">From<input type="date" value={from} max={to || today} onChange={(event) => setFrom(event.target.value)} className="mt-1 block h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" /></label>
      <label className="text-xs font-medium text-[var(--text-secondary)]">To<input type="date" value={to} min={from} max={today} onChange={(event) => setTo(event.target.value)} className="mt-1 block h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" /></label>
      <button type="button" className={buttonClass} onClick={applyCustomRange}>Apply</button>
    </> : null}
    <button type="button" className={buttonClass} onClick={reset}>Reset</button>
    {error ? <p role="alert" className="basis-full text-xs text-red-600">{error}</p> : null}
  </div>;
}
