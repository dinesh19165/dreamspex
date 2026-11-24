import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, ShieldCheck } from 'lucide-react';
import { DashboardShell } from './FranchiseSystemPages';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import Button from '../components/ui/Button';
import {
  MaintenanceApiError,
  maintenanceService,
  type AdminMaintenanceSettings,
  type MaintenanceAuditLog,
  type MaintenanceScope,
  type MaintenanceType,
} from '../services/maintenanceService';

function toLocalInput(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

function fromLocalInput(value: string) {
  return value ? new Date(value).toISOString() : null;
}

export default function AdminMaintenancePage() {
  const { user, refreshSession } = useAuth();
  const token = user?.accessToken ?? '';
  const [settings, setSettings] = useState<AdminMaintenanceSettings | null>(null);
  const [auditLogs, setAuditLogs] = useState<MaintenanceAuditLog[]>([]);
  const [maintenanceType, setMaintenanceType] = useState<MaintenanceType>('FULL_SYSTEM');
  const [targetScope, setTargetScope] = useState<MaintenanceScope>('ALL');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [adminBypass, setAdminBypass] = useState(true);
  const [isEnabled, setIsEnabled] = useState(false);
  const [startImmediately, setStartImmediately] = useState(true);
  const [noExpiry, setNoExpiry] = useState(true);
  const [remarks, setRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applySettings = (value: AdminMaintenanceSettings) => {
    setSettings(value);
    setMaintenanceType(value.maintenanceType);
    setTargetScope(value.targetScope);
    setTitle(value.title ?? '');
    setMessage(value.message ?? '');
    setStartAt(toLocalInput(value.startAt));
    setEndAt(toLocalInput(value.endAt));
    setAdminBypass(value.adminBypass);
    setIsEnabled(value.isActive);
    setNoExpiry(value.endAt == null);
  };

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Your admin session has expired.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [current, logs] = await Promise.all([
        maintenanceService.getAdmin(token),
        maintenanceService.auditLogs(token),
      ]);
      applySettings(current);
      setAuditLogs(logs);
    } catch (reason) {
      if (reason instanceof MaintenanceApiError && reason.status === 401) await refreshSession();
      setError(reason instanceof Error ? reason.message : 'Unable to load maintenance settings.');
    } finally {
      setLoading(false);
    }
  }, [refreshSession, token]);

  useEffect(() => { void load(); }, [load]);

  const save = async (activate: boolean | null = null) => {
    if (!token) return;
    if (!startImmediately && startAt && endAt && new Date(endAt) <= new Date(startAt)) {
      setError('The maintenance end time must be later than the start time.');
      setNotice('');
      return;
    }
    if (!startImmediately && !startAt) {
      setError('Choose a scheduled start time or enable Start immediately.');
      setNotice('');
      return;
    }
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const payload = {
        isActive: activate === null
          ? isEnabled
          : activate,
        maintenanceType,
        targetScope,
        title: title.trim(),
        message: message.trim(),
        startAt: startImmediately ? null : fromLocalInput(startAt),
        endAt: noExpiry ? null : fromLocalInput(endAt),
        adminBypass,
        remarks: remarks.trim() || null,
      };
      let updated: AdminMaintenanceSettings;
      if (activate === true) {
        updated = await maintenanceService.activate(token, remarks);
      } else if (activate === false) {
        updated = await maintenanceService.deactivate(token, remarks);
      } else {
        updated = await maintenanceService.updateAdmin(token, payload);
      }
      applySettings(updated);
      setAuditLogs(await maintenanceService.auditLogs(token));
      setRemarks('');
      setNotice(activate === true ? 'Maintenance activated.' : activate === false ? 'Maintenance deactivated.' : 'Maintenance settings saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update maintenance settings.');
    } finally {
      setSaving(false);
    }
  };

  const confirmAction = (activate: boolean) => {
    const verb = activate ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${verb} maintenance mode?`)) return;
    void save(activate);
  };

  const field = 'mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none';

  if (loading) {
    return <DashboardShell><SectionTitle eyebrow="Settings" title="Maintenance mode" description="Control centralized website maintenance." /><p className="mt-8 text-sm text-[var(--text-secondary)]">Loading maintenance status...</p></DashboardShell>;
  }

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Settings" title="Maintenance mode" description="Control centralized DreamSpex website maintenance." />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--text-secondary)]">Current status</p>
          <p className={`mt-2 text-xl font-semibold ${settings?.maintenanceActive ? 'text-amber-500' : 'text-emerald-600'}`}>
            {settings?.maintenanceActive ? 'Maintenance active' : 'Website operational'}
          </p>
        </div>
        <Button type="button" variant="ghost" disabled={loading} onClick={() => void load()}>
          <RefreshCw className="mr-2 h-4 w-4" />Refresh
        </Button>
      </div>
      {notice ? <p className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-700">{error}</p> : null}
      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <form className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 lg:col-span-3" onSubmit={(event) => { event.preventDefault(); void save(); }}>
          <div className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-[var(--brand-green-dark)]" /><h2 className="text-xl font-semibold">Configuration</h2></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm sm:col-span-2">Maintenance enabled<input type="checkbox" checked={isEnabled} onChange={(event) => setIsEnabled(event.target.checked)} /></label>
            <label className="text-sm">Maintenance type<select className={field} value={maintenanceType} onChange={(event) => setMaintenanceType(event.target.value as MaintenanceType)}><option value="FULL_SYSTEM">Full system</option><option value="PAYMENT">Payment</option><option value="AUTH">Authentication</option><option value="CATALOG">Catalog</option><option value="API">API</option></select></label>
            <label className="text-sm">Target scope<select className={field} value={targetScope} onChange={(event) => setTargetScope(event.target.value as MaintenanceScope)}><option value="ALL">All</option><option value="WEB">Website</option><option value="API">API</option></select></label>
            <label className="text-sm sm:col-span-2">Maintenance title<input className={field} maxLength={200} value={title} onChange={(event) => setTitle(event.target.value)} /></label>
            <label className="text-sm sm:col-span-2">Customer-facing message<textarea className={`${field} min-h-28 resize-y`} maxLength={10000} value={message} onChange={(event) => setMessage(event.target.value)} /></label>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm">Start immediately<input type="checkbox" checked={startImmediately} onChange={(event) => setStartImmediately(event.target.checked)} /></label>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm">No expiry<input type="checkbox" checked={noExpiry} onChange={(event) => setNoExpiry(event.target.checked)} /></label>
            <label className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm">Admin bypass<input type="checkbox" checked={adminBypass} onChange={(event) => setAdminBypass(event.target.checked)} /></label>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Start date &amp; time<input type="datetime-local" className={field} disabled={startImmediately} value={startAt} onChange={(event) => setStartAt(event.target.value)} /></label>
            <label className="text-sm">Expected end date &amp; time<input type="datetime-local" className={field} disabled={noExpiry} value={endAt} onChange={(event) => setEndAt(event.target.value)} /></label>
            <label className="text-sm sm:col-span-2">Audit remarks<input className={field} maxLength={500} value={remarks} onChange={(event) => setRemarks(event.target.value)} placeholder="Optional change reason" /></label>
          </div>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save settings'}</Button>
            <Button type="button" disabled={saving} onClick={() => confirmAction(true)}>Activate maintenance</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => confirmAction(false)}>Deactivate</Button>
          </div>
        </form>
        <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 lg:col-span-2">
          <h2 className="text-xl font-semibold">Audit history</h2>
          <div className="mt-4 max-h-[560px] space-y-3 overflow-y-auto">
            {auditLogs.length === 0 ? <p className="text-sm text-[var(--text-secondary)]">No maintenance changes recorded.</p> : auditLogs.map((log) => (
              <article key={log.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start justify-between gap-3"><p className="font-semibold">{log.action}</p><time className="text-xs text-[var(--text-secondary)]">{new Date(log.performedAt).toLocaleString()}</time></div>
                {log.performedByName ? <p className="mt-1 text-xs text-[var(--text-secondary)]">By {log.performedByName}</p> : null}
                {log.remarks ? <p className="mt-2 text-sm text-[var(--text-secondary)]">{log.remarks}</p> : null}
              </article>
            ))}
          </div>
        </section>
      </div>
    </DashboardShell>
  );
}
