import { ClipboardCheck } from 'lucide-react';
import type { Prescription } from '../../types';
import PrescriptionTable from './PrescriptionTable';

export default function PrescriptionSummary({ prescription }: { prescription: Prescription }) {
  return <section className="rounded-[24px] border border-cyan-400/30 bg-[var(--bg-card)] p-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-semibold text-[var(--text-primary)]">Prescription Summary</h2></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p className="text-[var(--text-secondary)]">Patient: <span className="text-[var(--text-primary)]">{prescription.patientName || 'Demo Customer'}</span></p><p className="text-[var(--text-secondary)]">Date: <span className="text-[var(--text-primary)]">{prescription.prescriptionDate || '02 Sep 2026'}</span></p></div><div className="mt-5"><PrescriptionTable prescription={prescription} /></div><p className="mt-4 text-sm text-[var(--text-secondary)]">PD: <span className="font-semibold text-[var(--text-primary)]">{prescription.pd || 'Not entered'}{prescription.pd ? ' mm' : ''}</span></p></section>;
}
