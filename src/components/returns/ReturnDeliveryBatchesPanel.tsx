import { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, MessageCircle, PackageOpen, RefreshCw, X } from 'lucide-react';
import Button from '../ui/Button';
import { useAuth } from '../../context/useAuth';
import { AdminApiError } from '../../services/adminService';
import {
  deliveryBatchService,
  type ActiveDeliveryBatchLink,
  type AdminDeliveryBatchDetails,
  type CreatedDeliveryBatch,
  type DeliveryBatchSummary,
  type EligibleReturnDeliveryRequest,
} from '../../services/deliveryBatchService';

type ReturnDeliveryOperation = 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY';

export default function ReturnDeliveryBatchesPanel() {
  return <section className="mt-7 space-y-6">
    <ReturnDeliveryBatchSection operationType="RETURN_PICKUP" title="Return Pickup Batches" />
    <ReturnDeliveryBatchSection operationType="REPLACEMENT_DELIVERY" title="Replacement Delivery Batches" />
  </section>;
}

function ReturnDeliveryBatchSection({
  operationType, title,
}: {
  operationType: ReturnDeliveryOperation;
  title: string;
}) {
  const { user, refreshAccessToken } = useAuth();
  const [eligible, setEligible] = useState<EligibleReturnDeliveryRequest[]>([]);
  const [batches, setBatches] = useState<DeliveryBatchSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [routeName, setRouteName] = useState('');
  const [created, setCreated] = useState<CreatedDeliveryBatch | null>(null);
  const [details, setDetails] = useState<AdminDeliveryBatchDetails | null>(null);
  const [detailIndex, setDetailIndex] = useState(0);
  const [activeLink, setActiveLink] = useState<ActiveDeliveryBatchLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const request = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!user) throw new Error('Your admin session has expired. Please sign in again.');
    const initialToken = user.accessToken ?? await refreshAccessToken();
    if (!initialToken) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return await operation(initialToken);
    } catch (reason) {
      if (!(reason instanceof AdminApiError) || reason.status !== 401) throw reason;
      const refreshed = await refreshAccessToken(initialToken);
      if (!refreshed) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(refreshed);
    }
  }, [refreshAccessToken, user]);

  const loadBatches = useCallback(async () => {
    setBatches(await request((token) => deliveryBatchService.returnBatches(token, operationType)));
  }, [operationType, request]);

  const loadEligible = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const rows = await request((token) =>
        deliveryBatchService.eligibleReturnRequests(token, operationType, city, state, postalCode));
      setEligible(rows);
      setSelectedIds((ids) => ids.filter((id) => rows.some((row) => row.id === id)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : `Unable to load ${title.toLowerCase()}.`);
    } finally {
      setLoading(false);
    }
  }, [city, operationType, postalCode, request, state, title]);

  useEffect(() => {
    void Promise.all([loadEligible(), loadBatches()]).catch((reason: unknown) => {
      setError(reason instanceof Error ? reason.message : `Unable to load ${title.toLowerCase()}.`);
    });
  }, [loadBatches, loadEligible, title]);

  const createBatch = async () => {
    if (!routeName.trim() || !selectedIds.length) {
      setError('Enter a route name and select at least one eligible request.');
      return;
    }
    setBusy('create');
    setError('');
    try {
      const result = await request((token) => deliveryBatchService.createReturnBatch(
        token, operationType, routeName.trim(), selectedIds,
      ));
      setCreated(result);
      setSelectedIds([]);
      setRouteName('');
      setNotice(`Created ${result.batch.routeName} with ${result.batch.total} requests.`);
      await Promise.all([loadBatches(), loadEligible()]);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the delivery batch.');
    } finally {
      setBusy('');
    }
  };

  const openBatch = async (batchId: string) => {
    setBusy(batchId);
    setError('');
    setNotice('');
    try {
      const next = await request((token) =>
        deliveryBatchService.returnBatchDetails(token, operationType, batchId));
      setDetails(next);
      setDetailIndex(0);
      const link = next.activeLinkAvailable && next.activeLinkRecoverable
        ? await request((token) => deliveryBatchService.returnBatchActiveLink(token, operationType, batchId))
        : { linkPath: null, expiresAt: next.linkExpiresAt, available: next.activeLinkAvailable };
      setActiveLink(link);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load batch details.');
    } finally {
      setBusy('');
    }
  };

  const regenerate = async (batchId: string) => {
    setBusy(batchId);
    setError('');
    try {
      const result = await request((token) =>
        deliveryBatchService.regenerateReturnBatchLink(token, operationType, batchId));
      setCreated(result);
      setDetails(null);
      setActiveLink(null);
      setNotice('A new link and fresh OTPs for unfinished requests are ready.');
      await loadBatches();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to regenerate the batch link.');
    } finally {
      setBusy('');
    }
  };

  const revokeLink = async (batchId: string) => {
    setBusy(batchId);
    setError('');
    try {
      await request((token) => deliveryBatchService.revokeReturnBatchLink(token, operationType, batchId));
      await loadBatches();
      if (details?.batch.id === batchId) {
        setActiveLink({ linkPath: null, expiresAt: null, available: false });
        setDetails((current) => current ? {
          ...current, activeLinkAvailable: false, activeLinkRecoverable: false, linkExpiresAt: null,
        } : null);
      }
      setNotice('The delivery link was revoked.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to revoke the batch link.');
    } finally {
      setBusy('');
    }
  };

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(`${label} copied.`);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the displayed value manually.');
    }
  };

  const linkPath = created ? `${window.location.origin}${created.linkPath}` : '';
  const detailLink = activeLink?.linkPath ? `${window.location.origin}${activeLink.linkPath}` : '';
  const share = (url: string) => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer');

  return <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-semibold">{title}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">
        {operationType === 'RETURN_PICKUP'
          ? 'Approved or pickup-scheduled returns, tracked separately from the return workflow.'
          : 'Replacement requests ready for dispatch, tracked separately from replacement processing.'}
      </p></div>
      <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => void Promise.all([loadEligible(), loadBatches()])}>
        <RefreshCw className="mr-2 h-4 w-4" />Refresh
      </Button>
    </div>
    {error ? <p role="alert" className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}

    {created ? <div className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2"><div><p className="font-semibold">Secure link ready · {created.batch.routeName}</p><p className="mt-1 break-all text-xs">{linkPath}</p></div>
        <div className="flex flex-wrap gap-2"><Button type="button" className="px-3 py-2 text-xs" onClick={() => share(linkPath)}><MessageCircle className="mr-1 h-4 w-4" />WhatsApp Share</Button><Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => void copy(linkPath, 'Link')}><Copy className="mr-1 h-4 w-4" />Copy Link</Button><Button type="button" variant="ghost" className="px-2 py-2" onClick={() => setCreated(null)} aria-label="Close generated link and OTPs"><X className="h-4 w-4" /></Button></div>
      </div>
      <p className="mt-3 text-xs text-amber-200">Share the route link with the delivery person. Send each request’s OTP separately to its customer.</p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{created.deliveryOtps.map((entry) => <div key={entry.orderId} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
        <p className="text-xs text-[var(--text-secondary)]">{entry.requestNumber ?? entry.orderNumber} · {entry.recipientName}</p><p className="mt-1 font-mono text-lg tracking-[0.2em]">{entry.otp}</p>
        <Button type="button" variant="ghost" className="mt-2 px-2 py-1 text-xs" onClick={() => void copy(entry.otp, `${entry.requestNumber ?? entry.orderNumber} OTP`)}><Copy className="mr-1 h-3 w-3" />Copy OTP</Button>
      </div>)}</div>
    </div> : null}

    <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
      <label className="text-xs text-[var(--text-secondary)]">City<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
      <label className="text-xs text-[var(--text-secondary)]">State<input value={state} onChange={(event) => setState(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
      <label className="text-xs text-[var(--text-secondary)]">PIN code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Route name<input value={routeName} onChange={(event) => setRouteName(event.target.value)} maxLength={120} className="mt-1 h-10 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" placeholder="e.g. Madhapur route" /></label>
      <Button type="button" variant="ghost" className="mt-auto h-10 px-3" onClick={() => void loadEligible()}><RefreshCw className="mr-1 h-4 w-4" />Filter</Button>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2"><p className="text-sm">{selectedIds.length} selected · {eligible.length} eligible</p>
      <Button type="button" disabled={busy === 'create' || !routeName.trim() || !selectedIds.length} className="px-4 py-2" onClick={() => void createBatch()}>{busy === 'create' ? 'Creating…' : `Create batch (${selectedIds.length})`}</Button>
    </div>
    {loading ? <p className="mt-3 text-sm text-[var(--text-secondary)]">Loading requests…</p> : eligible.length ? <div className="mt-3 max-h-64 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
      {eligible.map((item) => <label key={item.id} className="flex cursor-pointer items-start gap-3 border-b border-[var(--border-subtle)] p-3 last:border-0">
        <input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => setSelectedIds((ids) => ids.includes(item.id) ? ids.filter((id) => id !== item.id) : [...ids, item.id])} className="mt-1 accent-emerald-500" />
        <span className="min-w-0 flex-1"><span className="block text-sm font-medium">{item.requestNumber} · Order {item.orderNumber}</span><span className="text-xs text-[var(--text-secondary)]">{item.recipientName} · {item.city}, {item.state} {item.postalCode} · {item.status}</span></span>
      </label>)}
    </div> : <p className="mt-3 rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">No eligible requests match these route filters.</p>}

    <h3 className="mt-6 font-semibold">Existing batches</h3>
    {!batches.length ? <p className="mt-2 text-sm text-[var(--text-secondary)]">No batches yet.</p> : <div className="mt-3 grid gap-3 lg:grid-cols-2">{batches.map((batch) => <article key={batch.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
      <div className="flex items-start justify-between gap-2"><div><p className="font-semibold">{batch.routeName}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{batch.status} · {batch.linkExpiresAt ? `Link expires ${new Date(batch.linkExpiresAt).toLocaleString('en-IN')}` : 'No active link'}</p></div></div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><span>Total<strong className="mt-1 block text-base">{batch.total}</strong></span><span>Pending<strong className="mt-1 block text-base">{batch.pending}</strong></span><span>Completed<strong className="mt-1 block text-base">{batch.completed}</strong></span><span>Failed<strong className="mt-1 block text-base">{batch.failed}</strong></span></div>
      <div className="mt-3 flex flex-wrap gap-2"><Button type="button" className="px-3 py-2 text-xs" onClick={() => void openBatch(batch.id)}><PackageOpen className="mr-1 h-3 w-3" />View Batch</Button>
        {batch.status === 'OPEN' ? <Button type="button" variant="ghost" disabled={busy === batch.id} className="px-3 py-2 text-xs" onClick={() => void regenerate(batch.id)}>Regenerate Link</Button> : null}
        {batch.activeLinkAvailable ? <Button type="button" variant="ghost" disabled={busy === batch.id} className="px-3 py-2 text-xs" onClick={() => void revokeLink(batch.id)}>Revoke Link</Button> : null}
      </div>
    </article>)}</div>}

    {details ? <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-3" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) { setDetails(null); setActiveLink(null); } }}>
      <section role="dialog" aria-modal="true" aria-labelledby={`${operationType}-batch-title`} className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-y-auto rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-[var(--text-primary)] sm:p-6">
        <div className="flex items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Delivery batch</p><h3 id={`${operationType}-batch-title`} className="mt-1 text-xl font-semibold">{details.batch.routeName}</h3></div><Button type="button" variant="ghost" className="px-2 py-2" onClick={() => { setDetails(null); setActiveLink(null); }} aria-label="Close batch details"><X className="h-4 w-4" /></Button></div>
        <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">{[['Total', details.batch.total], ['Pending', details.batch.pending], ['Completed', details.batch.completed], ['Failed', details.batch.failed]].map(([label, count]) => <span key={label} className="rounded-xl bg-[var(--bg-primary)] p-2">{label}<strong className="mt-1 block text-base">{count}</strong></span>)}</div>
        {detailLink ? <div className="mt-4 rounded-xl bg-[var(--bg-primary)] p-3"><p className="break-all text-xs">{detailLink}</p><div className="mt-2 flex flex-wrap gap-2"><Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => void copy(detailLink, 'Link')}><Copy className="mr-1 h-3 w-3" />Copy Link</Button><Button type="button" className="px-3 py-2 text-xs" onClick={() => share(detailLink)}><MessageCircle className="mr-1 h-3 w-3" />WhatsApp Share</Button>{details.batch.status === 'OPEN' ? <Button type="button" variant="ghost" disabled={busy === details.batch.id} className="px-3 py-2 text-xs" onClick={() => void regenerate(details.batch.id)}>Regenerate Link</Button> : null}</div></div>
          : <Button type="button" disabled={busy === details.batch.id || details.batch.status !== 'OPEN'} className="mt-4 self-start px-3 py-2 text-xs" onClick={() => void regenerate(details.batch.id)}>Regenerate Link</Button>}
        <h4 className="mt-5 font-semibold">Requests</h4>
        {details.orders.length ? <div className="mt-2 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" disabled={detailIndex === 0} className="px-2 py-2 text-xs" onClick={() => setDetailIndex((index) => Math.max(0, index - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
          <span className="text-xs text-[var(--text-secondary)]">Request {detailIndex + 1} of {details.orders.length}</span>
          <Button type="button" variant="ghost" disabled={detailIndex >= details.orders.length - 1} className="px-2 py-2 text-xs" onClick={() => setDetailIndex((index) => Math.min(details.orders.length - 1, index + 1))}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div> : null}
        <div className="mt-2 space-y-2">{details.orders[detailIndex] ? (() => {
          const item = details.orders[detailIndex];
          return <article key={item.id} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
          <div className="flex flex-wrap justify-between gap-2"><p className="font-medium">{item.requestNumber} · Order {item.orderNumber}</p><span className="text-xs">{item.status.replaceAll('_', ' ')}</span></div>
          <p className="mt-1 text-xs text-[var(--text-secondary)]">{item.recipientName} · {item.phone} · {item.address}, {item.city}, {item.state} {item.postalCode}</p>
          <details className="mt-2 border-t border-[var(--border-subtle)] pt-2"><summary className="cursor-pointer text-xs text-[var(--text-secondary)]">Status history ({item.history.length})</summary>
            {item.history.map((event, index) => <p key={`${event.status}-${event.createdAt}-${index}`} className="mt-2 text-xs"><strong>{event.status.replaceAll('_', ' ')}</strong> · {new Date(event.createdAt).toLocaleString('en-IN')}{event.note ? ` · ${event.note}` : ''}</p>)}
          </details>
        </article>;
        })() : <p className="text-sm text-[var(--text-secondary)]">No requests in this batch.</p>}</div>
        <div className="mt-4 flex justify-end"><Button type="button" variant="ghost" onClick={() => { setDetails(null); setActiveLink(null); }}>Close</Button></div>
      </section>
    </div> : null}
  </section>;
}
