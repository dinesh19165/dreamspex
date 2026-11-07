import type { ChangeEvent } from 'react';
import type { Prescription } from '../../types';

type PrescriptionFormProps = {
  value: Prescription;
  errors: Record<string, string>;
  onChange: (value: Prescription) => void;
};

const fields = [
  ['sph', 'SPH', 'Sphere', '-30', '30', '0.25'],
  ['cyl', 'CYL', 'Cylinder', '-15', '15', '0.25'],
  ['axis', 'AXIS', 'Axis', '0', '180', '1'],
  ['add', 'ADD', 'Addition', '-10', '10', '0.25'],
] as const;

const fieldLabels: Record<string, string> = {
  'rightEye.sph': 'SPH',
  'rightEye.cyl': 'CYL',
  'rightEye.axis': 'AXIS',
  'rightEye.add': 'ADD',
  'leftEye.sph': 'SPH',
  'leftEye.cyl': 'CYL',
  'leftEye.axis': 'AXIS',
  'leftEye.add': 'ADD',
  pd: 'Total PD',
  rightPd: 'Right PD',
  leftPd: 'Left PD',
};

export default function PrescriptionForm({ value, errors, onChange }: PrescriptionFormProps) {
  const updateEye = (eye: 'rightEye' | 'leftEye', field: 'sph' | 'cyl' | 'axis' | 'add', next: string) =>
    onChange({ ...value, [eye]: { ...value[eye], [field]: next } });

  const input = (name: string, fieldValue: string, change: (next: string) => void, min?: string, max?: string, step?: string, readOnly = false) => (
    <label key={name} className="space-y-2 text-sm text-[var(--text-secondary)]">
      <span>{fieldLabels[name] ?? name}</span>
      <input type="number" min={min} max={max} step={step} value={fieldValue}
        onChange={(event: ChangeEvent<HTMLInputElement>) => change(event.target.value)}
        readOnly={readOnly}
        inputMode="decimal" placeholder="Not entered"
        className={`w-full rounded-xl border bg-[var(--bg-card)] px-3 py-3 text-[var(--text-primary)] outline-none transition focus:border-cyan-400 ${errors[name] ? 'border-red-400' : 'border-[var(--border-subtle)]'}`} />
      {errors[name] ? <span className="block text-xs text-red-300">{errors[name]}</span> : null}
    </label>
  );

  return (
    <div className="space-y-6">
      <label className="block space-y-2 text-sm text-[var(--text-secondary)]">
        <span>Patient name</span>
        <input value={value.patientName ?? ''} onChange={(event) => onChange({ ...value, patientName: event.target.value })}
          maxLength={160} className={`w-full rounded-xl border bg-[var(--bg-card)] px-3 py-3 text-[var(--text-primary)] outline-none focus:border-cyan-400 ${errors.patientName ? 'border-red-400' : 'border-[var(--border-subtle)]'}`} />
        {errors.patientName ? <span className="block text-xs text-red-300">{errors.patientName}</span> : null}
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm text-[var(--text-secondary)]"><span>Prescription date</span><input type="date" value={value.prescriptionDate ?? ''} onChange={(event) => onChange({ ...value, prescriptionDate: event.target.value })} className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-3 text-[var(--text-primary)]" /></label>
        <label className="space-y-2 text-sm text-[var(--text-secondary)]"><span>Expiry date</span><input type="date" value={value.expiryDate ?? ''} onChange={(event) => onChange({ ...value, expiryDate: event.target.value })} className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-3 text-[var(--text-primary)]" /></label>
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        {(['rightEye', 'leftEye'] as const).map((eye) => (
          <section key={eye} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
            <h3 className="font-semibold text-[var(--text-primary)]">{eye === 'rightEye' ? 'RIGHT EYE (OD)' : 'LEFT EYE (OS)'}</h3>
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              {fields.map(([field, , , min, max, step]) => {
                const key = `${eye}.${field}`;
                return input(key, value[eye][field], (next) => updateEye(eye, field, next), min, max, step);
              })}
            </div>
          </section>
        ))}
      </div>
      <section className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <h3 className="font-semibold text-[var(--text-primary)]">Pupillary distance (PD)</h3>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">Enter total PD, or both monocular values. Total is calculated only when both eye values are present.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          {input('pd', value.pd, (pd) => onChange({ ...value, pd }), '20', '80', '0.5', Boolean(value.rightPd && value.leftPd))}
          {input('rightPd', value.rightPd ?? '', (rightPd) => onChange({ ...value, rightPd }), '10', '40', '0.5')}
          {input('leftPd', value.leftPd ?? '', (leftPd) => onChange({ ...value, leftPd }), '10', '40', '0.5')}
        </div>
        {errors.pd ? <p className="mt-2 text-xs text-red-300">{errors.pd}</p> : null}
        {errors.rightPd ? <p className="mt-2 text-xs text-red-300">{errors.rightPd}</p> : null}
        {errors.leftPd ? <p className="mt-2 text-xs text-red-300">{errors.leftPd}</p> : null}
      </section>
      <p className="text-xs text-[var(--text-secondary)]">This information is not a diagnosis. Lens options are suggestions only; consult an optician for advice.</p>
    </div>
  );
}
