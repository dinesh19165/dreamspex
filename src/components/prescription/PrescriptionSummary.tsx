import { ClipboardCheck } from 'lucide-react';
import type { Prescription } from '../../types';
import PrescriptionTable from './PrescriptionTable';

export default function PrescriptionSummary({ prescription }: { prescription: Prescription }) {
  return <section className="rounded-[24px] border border-cyan-400/30 bg-[#151823] p-6"><div className="flex items-center gap-3"><ClipboardCheck className="h-5 w-5 text-cyan-300" /><h2 className="text-lg font-semibold text-white">Prescription Summary</h2></div><div className="mt-5 grid gap-3 text-sm sm:grid-cols-2"><p className="text-slate-400">Patient: <span className="text-white">{prescription.patientName || 'Demo Customer'}</span></p><p className="text-slate-400">Date: <span className="text-white">{prescription.prescriptionDate || '02 Sep 2026'}</span></p></div><div className="mt-5"><PrescriptionTable prescription={prescription} /></div><p className="mt-4 text-sm text-slate-300">PD: <span className="font-semibold text-white">{prescription.pd || 'Not entered'}{prescription.pd ? ' mm' : ''}</span></p></section>;
}
