import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Activity, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Download, Eye,
  FileSpreadsheet, LogIn, LogOut, Package, RefreshCw, Search, ShieldAlert, Trash2, X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import {
  AdminApiError, adminService, type AdminActivityLog, type AdminActivityLogFilters,
  type AdminActivityLogPage,
} from '../services/adminService';
import { DashboardShell } from './FranchiseSystemPages';

const ACTIVITY_TYPES = [
  ['LOGIN_SUCCESS', 'Successful login'],
  ['LOGIN_FAILED', 'Failed login'],
  ['LOGOUT', 'Logout'],
  ['CREATE', 'Created'],
  ['UPDATE', 'Updated'],
  ['DELETE', 'Deleted'],
  ['BULK_IMPORT', 'Bulk import'],
  ['BULK_EXPORT', 'Bulk export'],
  ['ACTION', 'Other action'],
] as const;

const MODULES = [
  'Authentication', 'Products', 'Catalog', 'Inventory', 'Orders', 'Customers',
  'Access Control', 'Admin Profile', 'Franchises', 'Growth', 'System Management', 'Admin',
];

const fieldClass = 'h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green-dark)] focus:ring-2 focus:ring-[var(--brand-green)]/15';

function useActivityLogsRequest() {
  const { user, refreshAccessToken } = useAuth();

  return useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!user) throw new Error('Your admin session has expired. Please sign in again.');
    const initialToken = user.accessToken ?? await refreshAccessToken();
    if (!initialToken) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return await operation(initialToken);
    } catch (reason) {
      if (!(reason instanceof AdminApiError) || reason.status !== 401) throw reason;
      if (initialToken !== user.accessToken) {
        throw new Error('Your admin session could not be authenticated. Please sign in again.');
      }
      const accessToken = await refreshAccessToken(initialToken);
      if (!accessToken) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(accessToken);
    }
  }, [refreshAccessToken, user?.accessToken, user?.id]);
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(new Date(value));
}

function activityLabel(value: AdminActivityLog['activityType']) {
  return ACTIVITY_TYPES.find(([type]) => type === value)?.[1] ?? value.replaceAll('_', ' ').toLowerCase();
}

function activityIcon(value: AdminActivityLog['activityType']): LucideIcon {
  if (value === 'LOGIN_SUCCESS') return LogIn;
  if (value === 'LOGIN_FAILED') return ShieldAlert;
  if (value === 'LOGOUT') return LogOut;
  if (value === 'BULK_IMPORT' || value === 'BULK_EXPORT') return FileSpreadsheet;
  if (value === 'CREATE' || value === 'UPDATE' || value === 'DELETE') return Package;
  return Activity;
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function getErrorMessage(reason: unknown) {
  if (reason instanceof AdminApiError && reason.status === 403) {
    return 'You are not authorized to view or manage activity logs.';
  }
  return reason instanceof Error ? reason.message : 'The activity logs could not be loaded.';
}

export default function AdminActivityLogsPage() {
  const request = useActivityLogsRequest();
  const [filters, setFilters] = useState<Omit<AdminActivityLogFilters, 'page' | 'size'>>({});
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);
  const [data, setData] = useState<AdminActivityLogPage | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [detail, setDetail] = useState<AdminActivityLog | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const pageSize = 25;

  useEffect(() => {
    const controller = new AbortController();
    const timeout = window.setTimeout(() => {
      setLoading(true);
      setError('');
      setActionError('');
      void request((token) => adminService.activityLogs.list(token, {
        ...filters,
        page,
        size: pageSize,
      }, controller.signal))
        .then((result) => {
          if (!controller.signal.aborted) {
            setData(result);
            setSelectedIds([]);
          }
        })
        .catch((reason: unknown) => {
          if (!controller.signal.aborted && !(reason instanceof DOMException && reason.name === 'AbortError')) {
            setError(getErrorMessage(reason));
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
    }, 250);
    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [filters, page, refreshKey, request]);

  const updateFilter = (key: keyof Omit<AdminActivityLogFilters, 'page' | 'size'>, value: string) => {
    setPage(0);
    setFilters((current) => ({ ...current, [key]: value || undefined }));
  };

  const matchingIds = useMemo(() => data?.items.map((item) => item.id) ?? [], [data]);
  const allCurrentSelected = matchingIds.length > 0 && matchingIds.every((id) => selectedIds.includes(id));

  const runExport = async (format: 'csv' | 'xlsx') => {
    setBusy(format);
    setActionError('');
    setMessage('');
    try {
      const blob = await request((token) => format === 'csv'
        ? adminService.activityLogs.exportCsv(token, filters)
        : adminService.activityLogs.exportExcel(token, filters));
      downloadBlob(blob, `dream-spex-activity-logs-${new Date().toISOString().slice(0, 10)}.${format}`);
      setMessage(`Activity logs exported as ${format.toUpperCase()}.`);
    } catch (reason) {
      setActionError(getErrorMessage(reason));
    } finally {
      setBusy('');
    }
  };

  const deleteSelected = async () => {
    if (!selectedIds.length || !window.confirm(`Delete ${selectedIds.length} selected activity log${selectedIds.length === 1 ? '' : 's'}? This cannot be undone.`)) return;
    setBusy('delete');
    setActionError('');
    setMessage('');
    try {
      await request((token) => adminService.activityLogs.deleteSelected(token, selectedIds));
      setSelectedIds([]);
      setMessage('Selected activity logs deleted.');
      setPage(0);
      const refreshed = await request((token) => adminService.activityLogs.list(token, { ...filters, page: 0, size: pageSize }));
      setData(refreshed);
    } catch (reason) {
      setActionError(getErrorMessage(reason));
    } finally {
      setBusy('');
    }
  };

  const clearAll = async () => {
    if (!window.confirm('Clear every activity log? This permanently removes all audit records and cannot be undone.')) return;
    setBusy('clear');
    setActionError('');
    setMessage('');
    try {
      await request((token) => adminService.activityLogs.clearAll(token));
      setData(null);
      setSelectedIds([]);
      setPage(0);
      setMessage('All activity logs were cleared.');
      const refreshed = await request((token) => adminService.activityLogs.list(token, { ...filters, page: 0, size: pageSize }));
      setData(refreshed);
    } catch (reason) {
      setActionError(getErrorMessage(reason));
    } finally {
      setBusy('');
    }
  };

  const openDetails = async (log: AdminActivityLog) => {
    setDetail(log);
    setDetailLoading(true);
    try {
      const result = await request((token) => adminService.activityLogs.get(token, log.id));
      setDetail(result);
    } catch (reason) {
      setActionError(getErrorMessage(reason));
    } finally {
      setDetailLoading(false);
    }
  };

  const summary = data?.summary;
  const cards = [
    { label: 'Total activities', value: summary?.totalActivities ?? 0, icon: Activity, tone: 'text-[#285033] bg-[#eaf2e8]' },
    { label: 'Successful logins', value: summary?.successfulLogins ?? 0, icon: CheckCircle2, tone: 'text-emerald-700 bg-emerald-50' },
    { label: 'Failed logins', value: summary?.failedLogins ?? 0, icon: AlertTriangle, tone: 'text-amber-700 bg-amber-50' },
    { label: 'Product changes', value: summary?.productChanges ?? 0, icon: Package, tone: 'text-blue-700 bg-blue-50' },
  ];

  return (
    <DashboardShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <SectionTitle
            eyebrow="System Management"
            title="Activity Logs"
            description="Review administrator sign-ins and actions across the Dream Spex control panel."
          />
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => void runExport('csv')}>
              <Download className="mr-2 h-4 w-4" />CSV
            </Button>
            <Button type="button" variant="secondary" disabled={Boolean(busy)} onClick={() => void runExport('xlsx')}>
              <FileSpreadsheet className="mr-2 h-4 w-4" />Excel
            </Button>
            <Button type="button" variant="ghost" disabled={loading} onClick={() => {
              setRefreshKey((current) => current + 1);
            }} aria-label="Refresh activity logs">
              <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh
            </Button>
          </div>
        </div>

        {actionError ? <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{actionError}</div> : null}
        {message ? <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map(({ label, value, icon: Icon, tone }) => (
            <article key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[var(--text-secondary)]">{label}</p>
                <span className={`flex h-9 w-9 items-center justify-center rounded-xl ${tone}`}><Icon className="h-4 w-4" /></span>
              </div>
              <p className="mt-3 text-2xl font-semibold tracking-tight">{value.toLocaleString('en-IN')}</p>
            </article>
          ))}
        </div>

        <section className="rounded-2xl border border-[var(--border-subtle)] bg-white p-4 shadow-sm" aria-label="Activity log filters">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-6">
            <label className="relative block text-xs font-medium text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
              Search admin
              <Search className="pointer-events-none absolute left-3 top-[34px] h-4 w-4 text-[var(--text-secondary)]" />
              <input value={searchText} onChange={(event) => {
                const value = event.target.value;
                setSearchText(value);
                updateFilter('q', value.trim());
              }} placeholder="Name or email" className={`${fieldClass} mt-1 pl-9`} />
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Activity type
              <select value={filters.activityType ?? ''} onChange={(event) => updateFilter('activityType', event.target.value)} className={`${fieldClass} mt-1`}>
                <option value="">All activity types</option>
                {ACTIVITY_TYPES.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Module
              <select value={filters.module ?? ''} onChange={(event) => updateFilter('module', event.target.value)} className={`${fieldClass} mt-1`}>
                <option value="">All modules</option>
                {MODULES.map((module) => <option key={module} value={module}>{module}</option>)}
              </select>
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">From (IST)
              <input type="date" value={filters.from ?? ''} max={filters.to} onChange={(event) => updateFilter('from', event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">To (IST)
              <input type="date" value={filters.to ?? ''} min={filters.from} onChange={(event) => updateFilter('to', event.target.value)} className={`${fieldClass} mt-1`} />
            </label>
            <label className="text-xs font-medium text-[var(--text-secondary)]">Status
              <select value={filters.status ?? ''} onChange={(event) => updateFilter('status', event.target.value)} className={`${fieldClass} mt-1`}>
                <option value="">All statuses</option>
                <option value="SUCCESS">Success</option>
                <option value="FAILED">Failed</option>
              </select>
            </label>
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] pt-3">
            <p className="text-xs text-[var(--text-secondary)]">{(data?.totalElements ?? 0).toLocaleString('en-IN')} matching records</p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="ghost" disabled={!selectedIds.length || Boolean(busy)} onClick={() => void deleteSelected()}>
                <Trash2 className="mr-2 h-4 w-4" />Delete selected{selectedIds.length ? ` (${selectedIds.length})` : ''}
              </Button>
              <Button type="button" variant="ghost" className="border-red-200 text-red-700 hover:bg-red-50" disabled={Boolean(busy) || !data?.totalElements} onClick={() => void clearAll()}>
                <Trash2 className="mr-2 h-4 w-4" />Clear all logs
              </Button>
            </div>
          </div>
        </section>

        <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-white shadow-sm">
          {error ? (
            <div role="alert" className="m-4 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div className="flex-1"><p>{error}</p><Button type="button" variant="ghost" className="mt-3" onClick={() => setRefreshKey((current) => current + 1)}>Retry</Button></div>
            </div>
          ) : null}
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1160px] border-collapse text-left text-sm">
              <thead className="bg-[#f7f9f6] text-[11px] uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  <th className="w-10 px-3 py-3"><input type="checkbox" aria-label="Select all activity logs on this page" checked={allCurrentSelected} disabled={!matchingIds.length} onChange={(event) => setSelectedIds(event.target.checked ? matchingIds : [])} /></th>
                  <th className="px-3 py-3">Admin Name</th>
                  <th className="px-3 py-3">Admin Email</th>
                  <th className="px-3 py-3">Activity Type</th>
                  <th className="px-3 py-3">Module</th>
                  <th className="px-3 py-3">Description</th>
                  <th className="px-3 py-3">IP Address</th>
                  <th className="px-3 py-3">Date &amp; Time (IST)</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-subtle)]">
                {loading ? (
                  <tr><td colSpan={10} className="px-4 py-12 text-center text-sm text-[var(--text-secondary)]"><span className="inline-flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" />Loading activity logs…</span></td></tr>
                ) : data?.items.length ? data.items.map((log) => {
                  const Icon = activityIcon(log.activityType);
                  return <tr key={log.id} className="hover:bg-[#fafbf9]">
                    <td className="px-3 py-3"><input type="checkbox" aria-label={`Select log by ${log.adminName ?? 'unknown admin'}`} checked={selectedIds.includes(log.id)} onChange={(event) => setSelectedIds((current) => event.target.checked ? [...current, log.id] : current.filter((id) => id !== log.id))} /></td>
                    <td className="px-3 py-3 font-medium">{log.adminName || 'Unknown admin'}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{log.adminEmail || '—'}</td>
                    <td className="px-3 py-3"><span className="inline-flex items-center gap-2 whitespace-nowrap"><Icon className="h-4 w-4 text-[var(--brand-green-dark)]" />{activityLabel(log.activityType)}</span></td>
                    <td className="px-3 py-3">{log.module}</td>
                    <td className="max-w-[260px] truncate px-3 py-3" title={log.description}>{log.description}</td>
                    <td className="px-3 py-3 font-mono text-xs">{log.ipAddress || '—'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-xs">{formatDateTime(log.createdAt)}</td>
                    <td className="px-3 py-3"><span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${log.status === 'SUCCESS' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>{log.status === 'SUCCESS' ? <CheckCircle2 className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}{log.status === 'SUCCESS' ? 'Success' : 'Failed'}</span></td>
                    <td className="px-3 py-3 text-right"><button type="button" onClick={() => void openDetails(log)} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-[var(--brand-green-dark)] hover:bg-[#eaf2e8]" aria-label={`View details for ${log.adminName ?? 'activity log'}`}><Eye className="h-4 w-4" />View</button></td>
                  </tr>;
                }) : !error ? (
                  <tr><td colSpan={10} className="px-4 py-14 text-center">
                    <div className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-[#f1f5ef] text-[var(--brand-green-dark)]"><Clock3 className="h-5 w-5" /></div>
                    <p className="mt-3 font-medium">No activity logs found</p>
                    <p className="mt-1 text-sm text-[var(--text-secondary)]">Try changing the search or filters.</p>
                  </td></tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3">
            <p className="text-xs text-[var(--text-secondary)]">Page {data?.totalPages ? page + 1 : 0} of {data?.totalPages ?? 0}</p>
            <div className="flex items-center gap-2">
              <button type="button" className="flex h-9 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 text-xs disabled:opacity-40" disabled={page === 0 || loading} onClick={() => setPage((current) => current - 1)}><ChevronLeft className="h-4 w-4" />Previous</button>
              <button type="button" className="flex h-9 items-center gap-1 rounded-lg border border-[var(--border-subtle)] px-3 text-xs disabled:opacity-40" disabled={!data || page + 1 >= data.totalPages || loading} onClick={() => setPage((current) => current + 1)}>Next<ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        </section>
      </div>

      {detail ? (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/45 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget) setDetail(null); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="activity-detail-title" className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div><p className="text-xs font-semibold uppercase tracking-wider text-[var(--brand-green-dark)]">Audit record</p><h2 id="activity-detail-title" className="mt-1 text-xl font-semibold">Activity details</h2></div>
              <button type="button" className="rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]" aria-label="Close activity details" onClick={() => setDetail(null)}><X className="h-5 w-5" /></button>
            </div>
            {detailLoading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading details…</p> : (
              <dl className="mt-5 grid gap-4 sm:grid-cols-2">
                {[
                  ['Admin', detail.adminName || 'Unknown admin'],
                  ['Email', detail.adminEmail || '—'],
                  ['Activity', activityLabel(detail.activityType)],
                  ['Module', detail.module],
                  ['Status', detail.status],
                  ['IP address', detail.ipAddress || '—'],
                  ['Date & time (IST)', formatDateTime(detail.createdAt)],
                  ['User agent', detail.userAgent || 'Not recorded'],
                ].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-[#f7f9f6] p-3"><dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{label}</dt><dd className="mt-1 break-words text-sm">{value}</dd></div>)}
                <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Description</dt><dd className="mt-1 text-sm">{detail.description}</dd></div>
                {detail.details ? <div className="sm:col-span-2"><dt className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">Request details</dt><dd className="mt-1 break-all rounded-lg bg-[#f7f9f6] p-3 font-mono text-xs">{detail.details}</dd></div> : null}
              </dl>
            )}
          </section>
        </div>
      ) : null}
    </DashboardShell>
  );
}
