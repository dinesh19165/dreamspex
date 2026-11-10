import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, CheckCircle2, Download, FileImage, Printer, RefreshCw, RotateCcw, ShieldCheck } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import { formatINR } from '../utils/currency';
import { DashboardShell } from './FranchiseSystemPages';
import ReturnDeliveryBatchesPanel from '../components/returns/ReturnDeliveryBatchesPanel';
import {
  returnService,
  ReturnApiError,
  type AdminReturn,
  type CustomerReturn,
  type ReturnEligibility,
  type ReturnPolicy,
  type ReturnableProduct,
} from '../services/returnService';
import AdminDateRangeFilter from '../components/ui/AdminDateRangeFilter';
import { downloadReportExcel, downloadReportPdf, printReport } from '../utils/adminReportExport';

const returnStatuses = [
  'REQUESTED', 'APPROVED', 'REJECTED', 'PICKUP_SCHEDULED', 'PICKED_UP', 'RECEIVED',
  'QUALITY_CHECK', 'REFUND_PROCESSING', 'REFUNDED', 'REPLACEMENT_PROCESSING',
  'REPLACED', 'CANCELLED',
];

const reasonOptions = [
  ['DAMAGED', 'Damaged on delivery'],
  ['DEFECTIVE', 'Product is defective'],
  ['WRONG_ITEM', 'Wrong item received'],
  ['NOT_AS_DESCRIBED', 'Product differs from description'],
  ['OTHER', 'Other'],
];

function statusLabel(status: string) {
  return status.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function reportDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(value);
}

function defaultReturnsRange() {
  const end = reportDate(new Date());
  const start = new Date(`${end}T00:00:00+05:30`);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start: start.toISOString().slice(0, 10), end };
}

function statusClass(status: string) {
  if (['REJECTED', 'CANCELLED'].includes(status)) return 'bg-red-400/10 text-red-300';
  if (['REFUNDED', 'REPLACED'].includes(status)) return 'bg-emerald-400/10 text-emerald-300';
  return 'bg-[var(--brand-green)]/12 text-[var(--brand-green-dark)]';
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : 'Not available';
}

function useCustomerRequest() {
  const { user, refreshSession } = useAuth();
  const accessToken = user?.accessToken;
  return useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!accessToken) throw new Error('Your session has expired. Please sign in again.');
    try {
      return await operation(accessToken);
    } catch (reason) {
      if (!(reason instanceof ReturnApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
      const session = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
      return operation(session.accessToken ?? accessToken);
    }
  }, [accessToken, refreshSession]);
}

function useAdminReturnRequest() {
  const { user, refreshAccessToken } = useAuth();
  const accessToken = user?.accessToken;
  const isAuthenticated = Boolean(user);
  return useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!isAuthenticated) throw new Error('Your admin session has expired. Please sign in again.');
    const token = accessToken ?? await refreshAccessToken();
    if (!token) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return await operation(token);
    } catch (reason) {
      if (!(reason instanceof ReturnApiError) || reason.status !== 401) throw reason;
      const fresh = await refreshAccessToken(token);
      if (!fresh) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(fresh);
    }
  }, [accessToken, isAuthenticated, refreshAccessToken]);
}

export function ReturnRequestPage() {
  const request = useCustomerRequest();
  const navigate = useNavigate();
  const [search] = useSearchParams();
  const orderId = search.get('orderId') ?? '';
  const { user } = useAuth();
  const [eligibility, setEligibility] = useState<ReturnEligibility | null>(null);
  const [policy, setPolicy] = useState<ReturnPolicy | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [resolution, setResolution] = useState<'REFUND' | 'REPLACEMENT'>('REFUND');
  const [reasonCode, setReasonCode] = useState('DAMAGED');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [created, setCreated] = useState<CustomerReturn | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError('Choose an order from My Orders to start a return.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [nextEligibility, nextPolicy] = await Promise.all([
        request((token) => returnService.eligibility(token, orderId)),
        request(returnService.policy),
      ]);
      setEligibility(nextEligibility);
      setPolicy(nextPolicy);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load return eligibility.');
    } finally {
      setLoading(false);
    }
  }, [orderId, request]);

  useEffect(() => { void load(); }, [load]);

  const selectedItems = useMemo(() => Object.entries(quantities)
    .filter(([, quantity]) => quantity > 0)
    .map(([orderItemId, quantity]) => ({ orderItemId, quantity })), [quantities]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.accessToken || !eligibility || selectedItems.length === 0) {
      setError('Select at least one product and quantity.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const next = await request((token) => returnService.create(token, orderId, {
        resolution, reasonCode, description, items: selectedItems,
      }));
      setCreated(next);
      const failedUploads: string[] = [];
      for (const file of files) {
        try {
          await request((token) => returnService.uploadEvidence(token, next.id, file));
        } catch {
          failedUploads.push(file.name);
        }
      }
      if (failedUploads.length > 0) {
        setError(`Return request was created, but evidence upload failed for: ${failedUploads.join(', ')}. You can try again from return tracking before approval.`);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to submit your return request.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link to="/orders" className="inline-flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"><ArrowLeft className="h-4 w-4" />Back to My Orders</Link>
      <SectionTitle eyebrow="After-sales" title="Return or replace" description="Choose the delivered items and quantities you would like us to review." />
      {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Checking order and policy eligibility...</p> : error && !eligibility ? <ErrorPanel message={error} onRetry={() => void load()} /> : created ? <section className="mt-8 rounded-[28px] border border-emerald-400/30 bg-emerald-400/10 p-8">
        <CheckCircle2 className="h-9 w-9 text-emerald-300" /><h2 className="mt-4 text-2xl font-semibold">Request received</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Your request ID is <strong className="text-[var(--text-primary)]">{created.requestNumber}</strong>. You can track status and refund progress in My Returns.</p>
        <div className="mt-6 flex flex-wrap gap-3"><Button type="button" onClick={() => navigate('/returns')}>Track return</Button><Button type="button" variant="ghost" onClick={() => navigate('/orders')}>Back to orders</Button></div>
        {error ? <p role="alert" className="mt-4 text-sm text-amber-200">{error}</p> : null}
      </section> : eligibility ? <form onSubmit={(event) => void submit(event)} className="mt-8 space-y-6">
        <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex flex-wrap justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">Order {eligibility.orderNumber}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Delivered {formatDate(eligibility.deliveredAt)}</p></div><p className="text-sm text-[var(--text-secondary)]">Return deadline: {formatDate(eligibility.returnDeadline)}</p></div>
          {!eligibility.eligible ? <p role="status" className="mt-5 rounded-xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-100">{eligibility.ineligibleReason ?? 'This order is not eligible for a return.'}</p> : null}
          <div className="mt-5 divide-y divide-[var(--border-subtle)]">
            {eligibility.items.map((item) => <div key={item.orderItemId} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto_auto] sm:items-center">
              <div><p className="font-semibold">{item.productName}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">SKU {item.sku} · {item.availableQuantity} available of {item.orderedQuantity}</p></div>
              <p className="text-sm text-[var(--text-secondary)]">Up to {formatINR(item.refundEstimate)} for all {item.orderedQuantity} units</p>
              <label className="text-sm text-[var(--text-secondary)]">Quantity
                <input type="number" min="0" max={item.availableQuantity} disabled={!eligibility.eligible || !item.returnable || item.availableQuantity === 0} value={quantities[item.orderItemId] ?? 0} onChange={(event) => setQuantities((current) => ({ ...current, [item.orderItemId]: Number(event.target.value) }))} className="ml-3 w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]" />
              </label>
              {!item.returnable ? <p className="text-xs text-amber-200 sm:col-span-3">This product is not currently configured as returnable.</p> : null}
            </div>)}
          </div>
        </section>
        <section className="grid gap-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 md:grid-cols-2">
          <label className="text-sm font-medium">Resolution<select value={resolution} onChange={(event) => setResolution(event.target.value as 'REFUND' | 'REPLACEMENT')} className={inputClass}><option value="REFUND">Refund to original payment method</option><option value="REPLACEMENT">Replacement</option></select></label>
          <label className="text-sm font-medium">Reason<select value={reasonCode} onChange={(event) => setReasonCode(event.target.value)} className={inputClass}>{reasonOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
          <label className="text-sm font-medium md:col-span-2">Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={4} placeholder="Share any useful details for our review" className={inputClass} /></label>
          <label className="text-sm font-medium md:col-span-2">Product images (optional)<input type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={(event) => setFiles(Array.from(event.target.files ?? []))} className={`${inputClass} file:mr-3 file:rounded-full file:border-0 file:bg-[var(--brand-green)] file:px-4 file:py-2 file:text-[#101810]`} /><span className="mt-2 block text-xs text-[var(--text-secondary)]">JPEG, PNG or WebP, up to 10 MB per image.</span>{files.length ? <span className="mt-2 block text-xs text-[var(--text-secondary)]">{files.map((file) => file.name).join(', ')}</span> : null}</label>
          {error ? <p role="alert" className="text-sm text-red-300 md:col-span-2">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-between gap-3 md:col-span-2"><p className="text-xs text-[var(--text-secondary)]"><ShieldCheck className="mr-1 inline h-4 w-4" />Refund estimate is calculated from paid item amounts and order discounts. Final verification follows review.</p><Button type="submit" disabled={saving || !eligibility.eligible || selectedItems.length === 0}>{saving ? 'Submitting...' : 'Submit return request'}</Button></div>
        </section>
        {policy?.enabled ? <p className="text-xs text-[var(--text-secondary)]">Configured return window: {policy.returnWindowDays} days from delivery. Eligibility is validated again when you submit.</p> : null}
      </form> : null}
    </main>
  </div>;
}

export function CustomerReturnsPage() {
  const request = useCustomerRequest();
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [evidenceUploading, setEvidenceUploading] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setReturns(await request(returnService.list)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load return requests.'); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refreshOnFocus = () => { void load(); };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [load]);

  const cancel = async (item: CustomerReturn) => {
    setBusy(item.id);
    setError('');
    try {
      await request((token) => returnService.cancel(token, item.id));
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to cancel this request.'); }
    finally { setBusy(''); }
  };

  const uploadEvidence = async (item: CustomerReturn, files: File[]) => {
    if (!files.length) return;
    setEvidenceUploading(item.id);
    setError('');
    try {
      for (const file of files) {
        await request((token) => returnService.uploadEvidence(token, item.id, file));
      }
      await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to upload return evidence.'); }
    finally { setEvidenceUploading(''); }
  };

  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><main className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
    <SectionTitle eyebrow="After-sales" title="My returns & replacements" description="Track request reviews, pickups, replacements and refund progress." />
    <Link to="/orders" className="mt-5 inline-flex items-center gap-2 text-sm text-[var(--brand-green-dark)]"><ArrowLeft className="h-4 w-4" />My Orders</Link>
    {error ? <div className="mt-5"><ErrorPanel message={error} onRetry={() => void load()} /></div> : null}
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading return requests...</p> : returns.length === 0 ? <div className="mt-8 rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center"><RotateCcw className="mx-auto h-8 w-8 text-[var(--brand-green-dark)]" /><h2 className="mt-3 font-semibold">No return requests yet</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Eligible delivered purchases can be started from My Orders.</p></div> : <div className="mt-8 grid gap-5">{returns.map((item) => <article key={item.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">{item.requestNumber} · Order {item.orderNumber}</p><h2 className="mt-2 text-lg font-semibold">{item.resolution === 'REFUND' ? 'Refund request' : 'Replacement request'}</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Submitted {formatDate(item.createdAt)}</p></div><span className={`rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></div>
      <div className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">{item.items.map((line) => <p key={line.orderItemId}>{line.productName} · Qty {line.quantity}</p>)}{item.resolution === 'REFUND' ? <p>Refund amount: <strong className="text-[var(--text-primary)]">{formatINR(item.refundAmount)}</strong></p> : null}</div>
      <div className="mt-5 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">{item.history.map((entry, index) => <span key={`${entry.status}-${entry.createdAt}-${index}`} className="rounded-full bg-[var(--bg-primary)] px-3 py-1.5 text-xs text-[var(--text-secondary)]">{statusLabel(entry.status)} · {formatDate(entry.createdAt)}</span>)}</div>
      {item.refunds.map((refund, index) => <div key={`${refund.createdAt}-${index}`} className="mt-3 rounded-xl bg-[var(--bg-primary)] p-3 text-sm text-[var(--text-secondary)]"><p>Refund progress: <strong className="text-[var(--text-primary)]">{statusLabel(refund.status)}</strong> · {formatINR(refund.amount)}</p><p className="mt-1">Razorpay reference: <strong className="text-[var(--text-primary)]">{refund.providerRefundId ?? 'Pending provider reference'}</strong></p>{refund.processedAt ? <p className="mt-1">Processed {formatDate(refund.processedAt)}</p> : null}</div>)}
      <div className="mt-5 flex flex-wrap gap-3">{item.evidence.map((file) => <ReturnEvidenceImage key={file.id} url={file.url} name={file.originalName} request={request} />)}{item.status === 'REQUESTED' ? <><label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm"><FileImage className="h-4 w-4" />{evidenceUploading === item.id ? 'Uploading...' : 'Add evidence'}<input type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={evidenceUploading === item.id} onChange={(event) => void uploadEvidence(item, Array.from(event.target.files ?? []))} className="sr-only" /></label><Button type="button" variant="ghost" disabled={busy === item.id} onClick={() => void cancel(item)}>{busy === item.id ? 'Cancelling...' : 'Cancel request'}</Button></> : null}</div>
    </article>)}</div>}
  </main></div>;
}

function ReturnEvidenceImage({ url, name, request }: {
  url: string;
  name: string;
  request: <T,>(operation: (token: string) => Promise<T>) => Promise<T>;
}) {
  const [src, setSrc] = useState('');
  useEffect(() => {
    let active = true;
    let objectUrl = '';
    request((token) => returnService.evidenceBlob(token, url))
      .then((blob) => { if (active) { objectUrl = URL.createObjectURL(blob); setSrc(objectUrl); } })
      .catch(() => undefined);
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [request, url]);
  return src ? <a href={src} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-2 text-xs"><img src={src} alt={name} className="h-12 w-12 rounded-lg object-cover" />{name}</a> : <span className="inline-flex items-center gap-2 rounded-xl border border-[var(--border-subtle)] p-3 text-xs text-[var(--text-secondary)]"><FileImage className="h-4 w-4" />{name}</span>;
}

export function AdminReturnsPage() {
  const request = useAdminReturnRequest();
  const [searchParams] = useSearchParams();
  const requestedStatus = searchParams.get('status') ?? '';
  const requestedOrderId = searchParams.get('orderId') ?? '';
  const requestedRequestId = searchParams.get('requestId') ?? '';
  const [policy, setPolicy] = useState<ReturnPolicy | null>(null);
  const [windowDays, setWindowDays] = useState('');
  const [policyEnabled, setPolicyEnabled] = useState(false);
  const [products, setProducts] = useState<ReturnableProduct[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [selectedId, setSelectedId] = useState(requestedRequestId);
  const [statusFilter, setStatusFilter] = useState(requestedStatus);
  const initialRange = defaultReturnsRange();
  const [fromFilter, setFromFilter] = useState(() => searchParams.get('from') ?? initialRange.start);
  const [toFilter, setToFilter] = useState(() => searchParams.get('to') ?? initialRange.end);
  const [searchQuery, setSearchQuery] = useState('');
  const [refundStatusFilter, setRefundStatusFilter] = useState('');
  const [page, setPage] = useState(0);
  const [productQuery, setProductQuery] = useState('');
  const [appliedProductQuery, setAppliedProductQuery] = useState('');
  const [appliedFilters, setAppliedFilters] = useState({ status: requestedStatus, orderId: requestedOrderId, from: initialRange.start, to: initialRange.end });
  const [adminRemarks, setAdminRemarks] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [refundProcessingId, setRefundProcessingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const initialPolicyLoaded = useRef(false);
  const refundInFlight = useRef<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const nextReturns = await request((token) => returnService.adminList(token, appliedFilters));
      setReturns(nextReturns);
      setSelectedId((current) => nextReturns.some((item) => item.id === current) ? current : nextReturns[0]?.id ?? '');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load return management.');
    } finally { setLoading(false); }
  }, [appliedFilters, request]);

  const loadConfiguration = useCallback(async () => {
    try {
      const [nextPolicy, nextProducts] = await Promise.all([
        request(returnService.adminPolicy),
        request((token) => returnService.adminProducts(token, appliedProductQuery)),
      ]);
      setPolicy(nextPolicy);
      setProducts(nextProducts);
      if (!initialPolicyLoaded.current) {
        setWindowDays(nextPolicy.returnWindowDays?.toString() ?? '');
        setPolicyEnabled(nextPolicy.enabled);
        initialPolicyLoaded.current = true;
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load return policy and product eligibility.');
    }
  }, [appliedProductQuery, request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const refreshOnFocus = () => { void load(); };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [load]);
  useEffect(() => { void loadConfiguration(); }, [loadConfiguration]);
  useEffect(() => {
    const status = searchParams.get('status') ?? '';
    setStatusFilter(status);
    setAppliedFilters((current) => ({ ...current, status }));
  }, [searchParams]);
  const selected = returns.find((item) => item.id === selectedId) ?? null;
  const latestRefund = selected?.refunds.at(-1) ?? null;
  const visibleReturns = useMemo(() => returns.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    const refund = item.refunds.at(-1);
    const matchesSearch = !query || [
      item.customer.displayName, item.customer.email, item.orderNumber, item.requestNumber,
      ...item.refunds.flatMap((entry) => [entry.id, entry.providerRefundId]),
    ].some((value) => value?.toLowerCase().includes(query));
    return matchesSearch && (!refundStatusFilter || refund?.status === refundStatusFilter);
  }), [refundStatusFilter, returns, searchQuery]);
  const returnReport = {
    title: 'Returns and refunds',
    startDate: appliedFilters.from,
    endDate: appliedFilters.to,
    columns: [
      { label: 'Return request ID' }, { label: 'Order number' }, { label: 'Customer name' },
      { label: 'Customer email' }, { label: 'Product' }, { label: 'Return reason' },
      { label: 'Request date', type: 'date' as const }, { label: 'Return status' },
      { label: 'Refund amount', type: 'currency' as const }, { label: 'Refund method' },
      { label: 'Refund transaction reference' }, { label: 'Refund status' },
      { label: 'Refund completion date', type: 'date' as const },
    ],
    rows: visibleReturns.map((item) => {
      const refund = item.refunds.at(-1);
      return [
        item.requestNumber, item.orderNumber, item.customer.displayName ?? '', item.customer.email ?? '',
        item.items.map((entry) => `${entry.productName} × ${entry.quantity}`).join(', '),
        statusLabel(item.reasonCode), reportDate(new Date(item.createdAt)), statusLabel(item.status),
        refund?.amount ?? item.refundAmount, refund?.provider ?? item.resolution,
        refund?.providerRefundId ?? '', refund?.status ?? 'PENDING',
        refund?.processedAt ? reportDate(new Date(refund.processedAt)) : '',
      ];
    }),
    summary: [
      { label: 'Matching return requests', value: visibleReturns.length },
      { label: 'Approved returns', value: visibleReturns.filter((item) => item.status === 'APPROVED').length },
      { label: 'Pending refund amount', value: formatINR(visibleReturns.filter((item) => !['PROCESSED', 'FAILED'].includes(item.refunds.at(-1)?.status ?? '')).reduce((sum, item) => sum + item.refundAmount, 0)) },
      { label: 'Completed refunds', value: visibleReturns.filter((item) => item.refunds.at(-1)?.status === 'PROCESSED').length },
    ],
  };

  const savePolicy = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true); setError(''); setNotice('');
    try {
      const saved = await request((token) => returnService.updatePolicy(token, {
        enabled: policyEnabled, returnWindowDays: windowDays ? Number(windowDays) : null,
      }));
      setPolicy(saved);
      setNotice('Return policy settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save return policy.'); }
    finally { setSaving(false); }
  };

  const toggleProduct = async (product: ReturnableProduct) => {
    setError(''); setNotice('');
    try {
      const saved = await request((token) => returnService.setProductReturnable(token, product.productId, !product.returnable));
      setProducts((current) => current.map((item) => item.productId === saved.productId ? saved : item));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update product eligibility.'); }
  };

  const changeStatus = async (status: string) => {
    if (!selected) return;
    setSaving(true); setError('');
    try {
      const updated = await request((token) => returnService.updateStatus(token, selected.id, status, adminRemarks));
      setReturns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setAdminRemarks(updated.adminRemarks ?? '');
      setNotice(`Request updated to ${statusLabel(updated.status)}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update this return request.'); }
    finally { setSaving(false); }
  };

  const processRefund = async (refresh = false) => {
    if (!selected || refundInFlight.current === selected.id) return;
    const requestId = selected.id;
    refundInFlight.current = requestId;
    setRefundProcessingId(requestId);
    setError(''); setNotice('');
    try {
      const updated = await request((token) => returnService.processRefund(token, requestId, refresh));
      setReturns((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(updated.status === 'REFUNDED' ? 'Gateway confirmed the refund.' : 'Refund status updated from the gateway.');
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Unable to process the refund.';
      try {
        const updated = await request((token) => returnService.adminGet(token, requestId));
        setReturns((current) => current.map((item) => item.id === updated.id ? updated : item));
        setError(message);
      } catch (refreshError) {
        const refreshMessage = refreshError instanceof Error ? refreshError.message : 'Unable to refresh refund status.';
        setError(`${message} ${refreshMessage}`);
      }
    } finally {
      refundInFlight.current = null;
      setRefundProcessingId('');
    }
  };

  const nextStatus: Record<string, string> = {
    REQUESTED: 'APPROVED', APPROVED: 'PICKUP_SCHEDULED', PICKUP_SCHEDULED: 'PICKED_UP',
    PICKED_UP: 'RECEIVED', RECEIVED: 'QUALITY_CHECK', QUALITY_CHECK: 'REPLACEMENT_PROCESSING',
    REPLACEMENT_PROCESSING: 'REPLACED',
  };

  return <DashboardShell>
    <SectionTitle eyebrow="After-sales" title="Return & refund management" description="Configure eligibility, review customer requests, coordinate returns and reconcile gateway refunds." />
    {error ? <div className="mt-5"><ErrorPanel message={error} onRetry={() => void load()} /></div> : null}
    {notice ? <p role="status" className="mt-5 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</p> : null}
    <ReturnDeliveryBatchesPanel />
    <div className="mt-7 grid gap-6 xl:grid-cols-[.8fr_1.2fr]">
      <div className="space-y-6">
        <form onSubmit={(event) => void savePolicy(event)} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <h2 className="text-lg font-semibold">Return policy</h2>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">Returns remain disabled until you configure an approved window.</p>
          <label className="mt-5 flex items-center gap-3 text-sm"><input type="checkbox" checked={policyEnabled} onChange={(event) => setPolicyEnabled(event.target.checked)} className="accent-[#7CBF00]" />Enable return requests</label>
          <label className="mt-4 block text-sm">Return window from delivery (days)<input type="number" min="1" max="365" value={windowDays} onChange={(event) => setWindowDays(event.target.value)} className={inputClass} /></label>
          <Button type="submit" disabled={saving} className="mt-5">{saving ? 'Saving...' : 'Save policy'}</Button>
          {policy ? <p className="mt-3 text-xs text-[var(--text-secondary)]">Current: {policy.enabled ? `Enabled · ${policy.returnWindowDays} days` : 'Disabled / not configured'}</p> : null}
        </form>

        <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-lg font-semibold">Eligible products</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Only explicitly enabled products can be returned.</p></div><div className="flex w-full max-w-md gap-2"><input value={productQuery} onChange={(event) => setProductQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); setAppliedProductQuery(productQuery); } }} placeholder="Search products" className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-2 text-sm" /><Button type="button" variant="secondary" onClick={() => setAppliedProductQuery(productQuery)}>Search</Button></div></div>
          <div className="mt-4 max-h-80 divide-y divide-[var(--border-subtle)] overflow-y-auto">{products.map((product) => <label key={product.productId} className="flex items-center justify-between gap-3 py-3 text-sm"><span className="min-w-0"><span className="block truncate font-medium">{product.name}</span><span className="text-xs text-[var(--text-secondary)]">{product.sku} · {product.status}</span></span><input type="checkbox" checked={product.returnable} onChange={() => void toggleProduct(product)} className="h-4 w-4 accent-[#7CBF00]" aria-label={`Enable returns for ${product.name}`} /></label>)}{products.length === 0 ? <p className="py-4 text-sm text-[var(--text-secondary)]">No matching products.</p> : null}</div>
        </section>
      </div>

      <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-lg font-semibold">Return requests</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{visibleReturns.length} matching request{visibleReturns.length === 1 ? '' : 's'}</p></div><div className="flex flex-wrap gap-2"><Button type="button" variant="secondary" onClick={() => downloadReportExcel(returnReport)}><Download className="mr-2 h-4 w-4" />Excel</Button><Button type="button" variant="secondary" onClick={() => void downloadReportPdf(returnReport)}>PDF</Button><Button type="button" variant="secondary" onClick={() => printReport(returnReport)}><Printer className="mr-2 h-4 w-4" />Print</Button><button type="button" onClick={() => void load()} className="rounded-full border border-[var(--border-subtle)] p-2" aria-label="Refresh return requests"><RefreshCw className="h-4 w-4" /></button></div></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="text-xs text-[var(--text-secondary)]">Status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className={inputClass}><option value="">All statuses</option>{returnStatuses.map((status) => <option key={status} value={status}>{statusLabel(status)}</option>)}</select></label>
          <label className="text-xs text-[var(--text-secondary)]">Search customer, order or refund ID<input value={searchQuery} onChange={(event) => { setSearchQuery(event.target.value); setPage(0); }} className={inputClass} /></label>
          <label className="text-xs text-[var(--text-secondary)]">Refund status<select value={refundStatusFilter} onChange={(event) => { setRefundStatusFilter(event.target.value); setPage(0); }} className={inputClass}><option value="">All refund statuses</option>{['PENDING', 'PROCESSING', 'PROCESSED', 'FAILED', 'CREATED', 'SUBMITTING'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <AdminDateRangeFilter startDate={fromFilter} endDate={toFilter} onApply={(from, to) => { setFromFilter(from); setToFilter(to); setPage(0); setAppliedFilters((current) => ({ ...current, from, to })); }} />
          <div className="flex items-end"><Button type="button" variant="secondary" onClick={() => { setAppliedFilters({ status: statusFilter, orderId: '', from: fromFilter, to: toFilter }); setPage(0); }}>Apply filters</Button></div>
        </div>
        {loading ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading requests...</p> : <div className="mt-5 max-h-[34rem] space-y-2 overflow-y-auto">{visibleReturns.slice(page * 25, (page + 1) * 25).map((item) => <button key={item.id} type="button" onClick={() => { setSelectedId(item.id); setAdminRemarks(item.adminRemarks ?? ''); }} className={`w-full rounded-2xl border p-4 text-left transition ${selectedId === item.id ? 'border-[var(--brand-green)] bg-[var(--brand-green)]/8' : 'border-[var(--border-subtle)] hover:border-[var(--brand-green)]/40'}`}><div className="flex justify-between gap-2"><span className="font-semibold">{item.requestNumber}</span><span className={`rounded-full px-2.5 py-1 text-[10px] ${statusClass(item.status)}`}>{statusLabel(item.status)}</span></div><p className="mt-1 text-xs text-[var(--text-secondary)]">Order {item.orderNumber} · {item.customer.displayName || item.customer.email || 'Customer'} · {formatDate(item.createdAt)}</p></button>)}</div>}
        {!loading && visibleReturns.length === 0 ? <p className="mt-6 rounded-xl bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)]">No return requests match these filters.</p> : null}
        {visibleReturns.length > 25 ? <div className="mt-3 flex items-center justify-between text-xs"><span>Page {page + 1} of {Math.ceil(visibleReturns.length / 25)}</span><div className="flex gap-2"><Button type="button" variant="ghost" disabled={!page} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button type="button" variant="ghost" disabled={(page + 1) * 25 >= visibleReturns.length} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div> : null}
        {selected ? <div className="mt-6 border-t border-[var(--border-subtle)] pt-6">
          <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs uppercase tracking-[0.2em] text-[var(--brand-green-dark)]">{selected.requestNumber}</p><h3 className="mt-1 text-xl font-semibold">Order {selected.orderNumber}</h3></div><span className={`rounded-full px-3 py-1.5 text-xs ${statusClass(selected.status)}`}>{statusLabel(selected.status)}</span></div>
          <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2"><p>Customer: {selected.customer.displayName ?? '—'} · {selected.customer.email ?? 'No email'}</p><p>Resolution: {selected.resolution}</p><p>Reason: {statusLabel(selected.reasonCode)}</p><p>Refund amount: {formatINR(selected.refundAmount)}</p>{selected.payment ? <p className="sm:col-span-2">Payment: {selected.payment.provider} · {selected.payment.providerPaymentId} · {selected.payment.status} · {formatINR(selected.payment.amount)} {selected.payment.currency}</p> : <p className="sm:col-span-2 text-amber-200">No captured payment is available for refund.</p>}</div>
          {selected.description ? <p className="mt-3 rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">{selected.description}</p> : null}
          <div className="mt-4 space-y-2">{selected.items.map((item) => <p key={item.orderItemId} className="rounded-xl bg-[var(--bg-primary)] p-3 text-sm">{item.productName} · SKU {item.sku} · Qty {item.quantity} · {formatINR(item.refundAmount)}</p>)}</div>
          <div className="mt-4 flex flex-wrap gap-3">{selected.evidence.map((file) => <ReturnEvidenceImage key={file.id} url={file.url} name={file.originalName} request={request} />)}</div>
          <div className="mt-4 space-y-2">{selected.history.map((entry, index) => <div key={`${entry.status}-${index}`} className="rounded-xl bg-[var(--bg-primary)] px-3 py-2 text-xs text-[var(--text-secondary)]"><span className="font-semibold text-[var(--text-primary)]">{statusLabel(entry.status)}</span> · {formatDate(entry.createdAt)}{entry.changedBy ? ` · ${entry.changedBy}` : ''}{entry.note ? <p className="mt-1">{entry.note}</p> : null}</div>)}</div>
          {selected.refunds.map((refund) => <div key={refund.id} className="mt-4 rounded-xl border border-[var(--border-subtle)] p-4 text-xs text-[var(--text-secondary)]"><p>Gateway: {refund.provider} · Refund ID: {refund.providerRefundId ?? 'Pending provider ID'}</p><p className="mt-1">Status: {statusLabel(refund.status)} · Amount: {formatINR(refund.amount)}</p><p className="mt-1">Recorded: {formatDate(refund.createdAt)}{refund.processedAt ? ` · Finalized: ${formatDate(refund.processedAt)}` : ''}{refund.gatewayCreatedAt ? ` · Gateway created: ${formatDate(refund.gatewayCreatedAt)}` : ''}</p>{refund.errorMessage ? <p className="mt-1 text-red-300">{refund.errorMessage}</p> : null}</div>)}
          {selected.status !== 'REJECTED' && selected.status !== 'CANCELLED' && selected.status !== 'REFUNDED' && selected.status !== 'REPLACED' ? <div className="mt-5 space-y-3">
            <label className="block text-sm">Internal admin remarks<textarea value={adminRemarks} onChange={(event) => setAdminRemarks(event.target.value)} maxLength={2000} rows={3} className={inputClass} /></label>
            <div className="flex flex-wrap gap-2">
              {selected.status === 'REQUESTED' ? <Button type="button" variant="ghost" disabled={saving} onClick={() => void changeStatus('REJECTED')}>Reject</Button> : null}
              {nextStatus[selected.status] ? <Button type="button" disabled={saving} onClick={() => void changeStatus(nextStatus[selected.status])}>{saving ? 'Saving...' : selected.status === 'QUALITY_CHECK' ? 'Start replacement' : `Set ${statusLabel(nextStatus[selected.status])}`}</Button> : null}
              {selected.status === 'QUALITY_CHECK' && selected.resolution === 'REFUND' ? <Button type="button" disabled={saving || refundProcessingId === selected.id} onClick={() => void processRefund()}>{refundProcessingId === selected.id ? 'Processing...' : 'Process refund'}</Button> : null}
              {selected.status === 'REFUND_PROCESSING' ? <Button type="button" variant="secondary" disabled={saving || refundProcessingId === selected.id} onClick={() => void processRefund(latestRefund?.retryable !== true)}><RefreshCw className="mr-2 h-4 w-4" />{refundProcessingId === selected.id ? 'Processing...' : latestRefund?.retryable === true ? 'Retry failed refund' : 'Check gateway status'}</Button> : null}
            </div>
          </div> : null}
        </div> : null}
      </section>
    </div>
  </DashboardShell>;
}

function ErrorPanel({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="mt-8 rounded-[24px] border border-red-400/30 bg-red-400/10 p-6"><p role="alert" className="text-sm text-red-200">{message}</p><Button type="button" variant="ghost" className="mt-4" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;
}

const inputClass = 'mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]';
