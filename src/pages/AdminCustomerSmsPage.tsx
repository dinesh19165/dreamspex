import { useCallback, useEffect, useMemo, useState } from 'react';
import { MessageSquareText, RefreshCw, Search } from 'lucide-react';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { DashboardShell } from './FranchiseSystemPages';
import { useAuth } from '../context/useAuth';
import { customerSmsService, type AdminSmsNotification } from '../services/customerSmsService';

function formatType(type: string) {
  return type.toLowerCase().split('_').map((word) => word[0].toUpperCase() + word.slice(1)).join(' ');
}

function formatTimestamp(timestamp: string) {
  return new Date(timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
}

export default function AdminCustomerSmsPage() {
  const { user, refreshAccessToken } = useAuth();
  const [history, setHistory] = useState<AdminSmsNotification[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const token = useCallback(async () => {
    const value = user?.accessToken ?? await refreshAccessToken();
    if (!value) throw new Error('Your administrator session has expired. Please sign in again.');
    return value;
  }, [refreshAccessToken, user?.accessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setHistory(await customerSmsService.adminHistory(await token()));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load SMS notification history.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);

  const visibleHistory = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return history.filter((item) => (!needle
      || item.orderNumber.toLowerCase().includes(needle)
      || item.maskedPhoneNumber.toLowerCase().includes(needle)
      || formatType(item.notificationType).toLowerCase().includes(needle))
      && (status === 'ALL' || item.status === status));
  }, [history, query, status]);

  const sentCount = history.filter((item) => item.status === 'SENT').length;
  const failedCount = history.filter((item) => item.status === 'FAILED').length;
  const pendingCount = history.filter((item) => item.status === 'PENDING').length;

  return <DashboardShell>
    <SectionTitle eyebrow="Customer communications" title="SMS notification history"
      description="Review delivery outcomes for customer transactional SMS. Mobile numbers are masked and message content is not exposed." />

    <div className="mt-8 grid gap-3 sm:grid-cols-3">
      {[
        ['Sent', sentCount, 'text-emerald-700'],
        ['Failed', failedCount, 'text-red-700'],
        ['Pending', pendingCount, 'text-amber-700'],
      ].map(([label, count, color]) => <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">{label}</p>
        <p className={`mt-2 text-2xl font-semibold ${color}`}>{count}</p>
      </div>)}
    </div>

    <div className="mt-5 flex flex-wrap items-center gap-3">
      <label className="relative min-w-[220px] flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
        <input value={query} onChange={(event) => setQuery(event.target.value)}
          placeholder="Search order, masked mobile or type"
          className="h-11 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] pl-10 pr-4 text-sm outline-none focus:border-[var(--brand-green)]" />
      </label>
      <select value={status} onChange={(event) => setStatus(event.target.value)}
        className="h-11 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 text-sm">
        <option value="ALL">All statuses</option>
        <option value="PENDING">Pending</option>
        <option value="SENT">Sent</option>
        <option value="FAILED">Failed</option>
      </select>
      <Button type="button" variant="ghost" disabled={loading} onClick={() => void load()}>
        <RefreshCw className="mr-2 h-4 w-4" />Refresh
      </Button>
    </div>

    {error ? <div role="alert" className="mt-5 rounded-2xl border border-red-300/40 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
    <div className="mt-5 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-[var(--bg-secondary)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
            <tr>
              <th className="px-5 py-4 font-medium">Order</th>
              <th className="px-5 py-4 font-medium">Mobile</th>
              <th className="px-5 py-4 font-medium">Notification</th>
              <th className="px-5 py-4 font-medium">Status</th>
              <th className="px-5 py-4 font-medium">Timestamp</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border-subtle)]">
            {visibleHistory.map((item) => <tr key={item.id}>
              <td className="px-5 py-4 font-semibold text-[var(--text-primary)]">{item.orderNumber}</td>
              <td className="px-5 py-4 text-[var(--text-secondary)]">{item.maskedPhoneNumber}</td>
              <td className="px-5 py-4 text-[var(--text-primary)]">{formatType(item.notificationType)}</td>
              <td className="px-5 py-4">
                <span className={`rounded-full px-3 py-1 text-xs font-semibold ${item.status === 'SENT'
                  ? 'bg-emerald-100 text-emerald-800'
                  : item.status === 'FAILED' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                  {item.status}
                </span>
              </td>
              <td className="px-5 py-4 text-[var(--text-secondary)]">{formatTimestamp(item.timestamp)}</td>
            </tr>)}
          </tbody>
        </table>
      </div>
      {!loading && visibleHistory.length === 0 ? <div className="px-6 py-14 text-center">
        <MessageSquareText className="mx-auto h-8 w-8 text-[var(--brand-green-dark)]" />
        <p className="mt-3 text-sm font-semibold text-[var(--text-primary)]">No SMS notifications found</p>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">{history.length
          ? 'Try changing your search or status filter.'
          : 'Customer SMS attempts will appear here after transactional events occur.'}</p>
      </div> : null}
      {loading ? <p className="px-6 py-10 text-center text-sm text-[var(--text-secondary)]">Loading SMS history...</p> : null}
    </div>
    <p className="mt-3 text-xs text-[var(--text-secondary)]">Showing the latest {history.length} notifications, up to 500 records.</p>
  </DashboardShell>;
}
