import { useCallback, useEffect, useState } from 'react';
import { Building2, Eye, Mail, Phone, RefreshCw, X } from 'lucide-react';
import { DashboardShell } from './FranchiseSystemPages';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import {
  franchiseApplicationService,
  type AdminFranchiseApplication,
  type FranchiseApplicationStatus,
} from '../services/franchiseApplicationService';
import { formatINR } from '../utils/currency';

const statuses: FranchiseApplicationStatus[] = [
  'PENDING', 'CONTACTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED',
];

function formatApplicationDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function statusStyle(status: FranchiseApplicationStatus) {
  if (status === 'APPROVED') return 'bg-emerald-50 text-emerald-800';
  if (status === 'REJECTED') return 'bg-rose-50 text-rose-800';
  if (status === 'UNDER_REVIEW') return 'bg-blue-50 text-blue-800';
  if (status === 'CONTACTED') return 'bg-amber-50 text-amber-900';
  return 'bg-slate-100 text-slate-700';
}

function ApplicationStatus({ status }: { status: FranchiseApplicationStatus }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${statusStyle(status)}`}>{status.replaceAll('_', ' ')}</span>;
}

function ApplicationDetailsDialog({
  application,
  onClose,
  onSaved,
}: {
  application: AdminFranchiseApplication;
  onClose: () => void;
  onSaved: (updated: AdminFranchiseApplication) => void;
}) {
  const { user } = useAuth();
  const [status, setStatus] = useState(application.status);
  const [internalNote, setInternalNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user?.accessToken) {
      setError('Your Super Admin session has expired. Please sign in again.');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await franchiseApplicationService.adminUpdate(
        user.accessToken, application.id, status, internalNote.trim(),
      );
      setInternalNote('');
      setNotice('Application updated successfully.');
      onSaved(updated);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update the application.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[160] flex items-end justify-center bg-slate-950/60 p-0 backdrop-blur-sm sm:items-center sm:p-5"
      onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="franchise-application-title"
        className="max-h-[94vh] w-full max-w-3xl overflow-y-auto rounded-t-3xl bg-white p-5 text-[var(--text-primary)] shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--brand-green-dark)]">{application.referenceId}</p>
            <h2 id="franchise-application-title" className="mt-2 text-2xl font-semibold">{application.fullName}</h2>
            <div className="mt-2"><ApplicationStatus status={application.status} /></div>
          </div>
          <button type="button" aria-label="Close application details" onClick={onClose}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--bg-secondary)] hover:bg-[var(--border-subtle)]">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:grid-cols-2">
          <p><span className="block text-xs text-[var(--text-secondary)]">Mobile number</span><a className="mt-1 inline-flex items-center gap-2 font-medium text-[var(--brand-green-dark)] hover:underline" href={`tel:${application.mobileNumber}`}><Phone className="h-4 w-4" />{application.mobileNumber}</a></p>
          <p><span className="block text-xs text-[var(--text-secondary)]">Email address</span><a className="mt-1 inline-flex items-center gap-2 break-all font-medium text-[var(--brand-green-dark)] hover:underline" href={`mailto:${application.email}`}><Mail className="h-4 w-4 shrink-0" />{application.email}</a></p>
          <p><span className="block text-xs text-[var(--text-secondary)]">Preferred location</span><span className="mt-1 block font-medium">{application.preferredCity}, {application.state}</span></p>
          <p><span className="block text-xs text-[var(--text-secondary)]">Investment budget</span><span className="mt-1 block font-medium">{formatINR(application.investmentBudget)}</span></p>
          <p><span className="block text-xs text-[var(--text-secondary)]">Preferred store format</span><span className="mt-1 block font-medium">{application.preferredStoreFormat.replaceAll('_', ' ')}</span></p>
          <p><span className="block text-xs text-[var(--text-secondary)]">Application date</span><span className="mt-1 block font-medium">{formatApplicationDate(application.createdAt)}</span></p>
          <p className="sm:col-span-2"><span className="block text-xs text-[var(--text-secondary)]">Full address</span><span className="mt-1 block whitespace-pre-wrap font-medium">{application.fullAddress}</span></p>
          <p className="sm:col-span-2"><span className="block text-xs text-[var(--text-secondary)]">Additional message</span><span className="mt-1 block whitespace-pre-wrap">{application.additionalMessage?.trim() || 'No additional message provided.'}</span></p>
        </div>

        {application.internalNotes ? (
          <section className="mt-5">
            <h3 className="text-sm font-semibold">Internal notes</h3>
            <pre className="mt-2 max-h-40 overflow-auto whitespace-pre-wrap rounded-xl bg-amber-50 p-3 font-sans text-sm leading-6 text-amber-950">{application.internalNotes}</pre>
          </section>
        ) : null}

        <form onSubmit={save} className="mt-6 border-t border-[var(--border-subtle)] pt-5">
          {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-800">{error}</p> : null}
          {notice ? <p role="status" className="mb-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice}</p> : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Application status
              <select value={status} onChange={(event) => setStatus(event.target.value as FranchiseApplicationStatus)}
                className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3 text-sm text-[var(--text-primary)]">
                {statuses.map((item) => <option key={item} value={item}>{item.replaceAll('_', ' ')}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">Add internal note
              <textarea value={internalNote} onChange={(event) => setInternalNote(event.target.value)} maxLength={2000} rows={3}
                placeholder="Record contact attempts or review notes..."
                className="mt-2 w-full resize-y rounded-xl border border-[var(--border-subtle)] bg-white px-3 py-3 text-sm text-[var(--text-primary)] outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]" />
            </label>
          </div>
          <div className="mt-5 flex flex-col-reverse justify-end gap-3 sm:flex-row">
            <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>Close</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : 'Save updates'}</Button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default function AdminFranchiseApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<AdminFranchiseApplication[]>([]);
  const [selected, setSelected] = useState<AdminFranchiseApplication | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadApplications = useCallback(async () => {
    if (!user?.accessToken) {
      setError('Your Super Admin session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setApplications(await franchiseApplicationService.adminList(user.accessToken));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load franchise applications.');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);

  useEffect(() => { void loadApplications(); }, [loadApplications]);

  const updateApplication = (updated: AdminFranchiseApplication) => {
    setApplications((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelected(updated);
  };

  const renderApplicationCard = (application: AdminFranchiseApplication) => (
    <article key={application.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--brand-green-dark)]">{application.referenceId}</p><h2 className="mt-1 truncate font-semibold">{application.fullName}</h2></div>
        <ApplicationStatus status={application.status} />
      </div>
      <p className="mt-3 text-sm text-[var(--text-secondary)]">{application.preferredCity}, {application.state}</p>
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2 text-sm">
        <a href={`tel:${application.mobileNumber}`} className="inline-flex items-center gap-1.5 text-[var(--brand-green-dark)] hover:underline"><Phone className="h-3.5 w-3.5" />{application.mobileNumber}</a>
        <a href={`mailto:${application.email}`} className="inline-flex items-center gap-1.5 break-all text-[var(--brand-green-dark)] hover:underline"><Mail className="h-3.5 w-3.5" />{application.email}</a>
      </div>
      <p className="mt-3 text-sm"><span className="text-[var(--text-secondary)]">Budget:</span> {formatINR(application.investmentBudget)}</p>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
        <span className="text-xs text-[var(--text-secondary)]">{formatApplicationDate(application.createdAt)}</span>
        <button type="button" onClick={() => setSelected(application)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)]"><Eye className="h-3.5 w-3.5" />View details</button>
      </div>
    </article>
  );

  return (
    <DashboardShell>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-[var(--brand-green-dark)]">Franchise pipeline</p><h1 className="mt-2 text-2xl font-semibold">Franchise Applications</h1><p className="mt-1 text-sm text-[var(--text-secondary)]">Review enquiries and follow up before starting franchise onboarding.</p></div>
        <Button type="button" variant="ghost" onClick={() => void loadApplications()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
      </div>

      {error ? <div role="alert" className="mb-5 flex flex-col gap-3 rounded-xl bg-rose-50 p-4 text-sm text-rose-800 sm:flex-row sm:items-center sm:justify-between"><span>{error}</span><button type="button" onClick={() => void loadApplications()} className="font-semibold underline">Try again</button></div> : null}
      {loading ? <p role="status" className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">Loading franchise applications…</p>
        : !applications.length ? <div className="rounded-2xl border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] px-6 py-12 text-center"><Building2 className="mx-auto h-8 w-8 text-[var(--brand-green-dark)]" /><h2 className="mt-3 font-semibold">No applications yet</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">New franchise enquiries will appear here after they are submitted.</p></div>
          : <>
            <div className="space-y-3 lg:hidden">{applications.map(renderApplicationCard)}</div>
            <div className="hidden overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] lg:block">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1050px] border-collapse text-left text-sm">
                  <thead><tr className="border-b border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                    <th className="px-4 py-3">Application ID</th><th className="px-4 py-3">Applicant</th><th className="px-4 py-3">Mobile</th><th className="px-4 py-3">Email</th><th className="px-4 py-3">City / State</th><th className="px-4 py-3">Budget</th><th className="px-4 py-3">Date</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Actions</th>
                  </tr></thead>
                  <tbody>{applications.map((application) => (
                    <tr key={application.id} className="border-b border-[var(--border-subtle)] last:border-0">
                      <td className="px-4 py-3 font-semibold">{application.referenceId}</td>
                      <td className="px-4 py-3">{application.fullName}</td>
                      <td className="px-4 py-3"><a href={`tel:${application.mobileNumber}`} className="hover:underline">{application.mobileNumber}</a></td>
                      <td className="px-4 py-3"><a href={`mailto:${application.email}`} className="hover:underline">{application.email}</a></td>
                      <td className="px-4 py-3">{application.preferredCity}, {application.state}</td>
                      <td className="px-4 py-3">{formatINR(application.investmentBudget)}</td>
                      <td className="px-4 py-3 whitespace-nowrap">{formatApplicationDate(application.createdAt)}</td>
                      <td className="px-4 py-3"><ApplicationStatus status={application.status} /></td>
                      <td className="px-4 py-3"><button type="button" onClick={() => setSelected(application)} className="inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-semibold hover:bg-[var(--bg-secondary)]"><Eye className="h-3.5 w-3.5" />View details</button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          </>}

      {selected ? <ApplicationDetailsDialog key={selected.id} application={selected} onClose={() => setSelected(null)} onSaved={updateApplication} /> : null}
    </DashboardShell>
  );
}
