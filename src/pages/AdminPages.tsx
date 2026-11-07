import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, ChevronLeft, ChevronRight, CircleDollarSign, Copy, Download, Eye, MapPin, MessageCircle, PackageOpen, PackageCheck, Pencil, Plus, RefreshCw, RotateCcw, Save, ShoppingCart, Trash2, Users, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import { AdminApiError, adminService, type AdminCustomer, type AdminDashboard, type AdminLensOptionRequest, type AdminOrder, type AdminOrderItem, type LensPreparationDetails } from '../services/adminService';
import { returnService, type AdminReturn } from '../services/returnService';
import type { LensOption } from '../services/prescriptionService';
import { formatINR } from '../utils/currency';
import { DashboardShell } from './FranchiseSystemPages';
import { deliveryBatchService, type ActiveDeliveryBatchLink, type AdminDeliveryBatchDetails, type CreatedDeliveryBatch, type DeliveryBatchSummary, type DeliveryOtp, type EligibleDeliveryOrder } from '../services/deliveryBatchService';
import { getDeliveryBatchFormState } from '../utils/deliveryBatchForm';
import { canRegenerateDeliveryOtp, getDeliveryOtpWhatsAppMessage, getDeliveryOtpWhatsAppUrl } from '../utils/deliveryOtp';

const formatCurrency = (value: number) => new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
}).format(value);

type DashboardMetric = [string, string | number, LucideIcon, string];

function AdminError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return <div className="rounded-2xl border border-red-300/30 bg-red-400/10 p-5 text-sm text-red-200" role="alert"><p>{message}</p><Button type="button" variant="ghost" className="mt-4" onClick={onRetry}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div>;
}

function useAdminRequest() {
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
      try {
        return await operation(accessToken);
      } catch (retryReason) {
        if (retryReason instanceof AdminApiError && retryReason.status === 401) {
          throw new Error('Your admin session could not be authenticated. Please sign in again.');
        }
        throw retryReason;
      }
    }
  }, [refreshAccessToken, user?.accessToken, user?.id]);
}

function adminOrderErrorMessage(reason: unknown, fallback: string) {
  if (reason instanceof AdminApiError && reason.status === 401) return 'Your admin session has expired. Please sign in again.';
  if (reason instanceof AdminApiError && reason.status === 403) return 'You are not authorized to manage orders.';
  return reason instanceof Error ? reason.message : fallback;
}

function nextOrderStatuses(currentStatus: string) {
  const transitions: Record<string, string[]> = {
    PENDING_PAYMENT: ['CANCELLED'],
    PAID: ['PROCESSING', 'CANCELLED'],
    PROCESSING: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
  };
  return transitions[currentStatus] ?? [];
}

export function AdminDashboardPage() {
  const request = useAdminRequest();
  const [dashboard, setDashboard] = useState<AdminDashboard | null>(null);
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [returns, setReturns] = useState<AdminReturn[]>([]);
  const [activityError, setActivityError] = useState('');
  const [returnsError, setReturnsError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [nextDashboard, nextOrders] = await Promise.all([
        request(adminService.dashboard),
        request(adminService.orders),
      ]);
      setDashboard(nextDashboard);
      setOrders(nextOrders);
      const [customerResult, returnResult] = await Promise.allSettled([
        request((token) => adminService.customers(token, '', 0, 5)),
        request((token) => returnService.adminList(token, {})),
      ]);
      if (customerResult.status === 'fulfilled') {
        setCustomers(customerResult.value.items);
        setActivityError('');
      } else {
        setActivityError(customerResult.reason instanceof Error ? customerResult.reason.message : 'Unable to load recent customer activity.');
      }
      if (returnResult.status === 'fulfilled') {
        setReturns(returnResult.value);
        setReturnsError('');
      } else {
        setReturnsError(returnResult.reason instanceof Error ? returnResult.reason.message : 'Unable to load return requests.');
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load the admin dashboard.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const metrics: DashboardMetric[] = dashboard ? [
    ['Total revenue', formatCurrency(dashboard.revenue), CircleDollarSign, '/admin/reports'],
    ['Total orders', dashboard.orders, ShoppingCart, '/admin/orders'],
    ['Customers', dashboard.customers, Users, '/admin/customers'],
    ['Products', dashboard.products, PackageOpen, '/admin/products'],
    ['Pending orders', dashboard.pendingOrders, RefreshCw, '/admin/orders?status=PENDING_PAYMENT'],
    ['Low-stock variants', dashboard.lowStockVariants, PackageOpen, '/admin/inventory?filter=low-stock'],
    ['New return requests', returns.filter((item) => item.status === 'REQUESTED').length, RotateCcw, '/admin/returns?status=REQUESTED'],
  ] : [];

  const revenueByMonth = useMemo(() => {
    const now = new Date();
    return Array.from({ length: 6 }, (_, index) => {
      const month = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      const value = orders
        .filter((order) => {
          const createdAt = new Date(order.createdAt);
          return order.paymentStatus === 'PAID'
            && order.status !== 'CANCELLED'
            && createdAt.getFullYear() === month.getFullYear()
            && createdAt.getMonth() === month.getMonth();
        })
        .reduce((sum, order) => sum + order.total, 0);
      return { label: month.toLocaleDateString('en-IN', { month: 'short' }), value };
    });
  }, [orders]);
  const chartMax = Math.max(1, ...revenueByMonth.map((month) => month.value));

  return <DashboardShell>
    <SectionTitle eyebrow="SUPER ADMIN" title="Operations overview" description="Current sales, orders, customers, catalogue, returns and stock signals from the admin services." />
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]" role="status">Loading dashboard...</p>
      : error ? <div className="mt-8"><AdminError message={error} onRetry={() => void load()} /></div>
        : dashboard ? <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {metrics.map(([label, value, Icon, to]) => <Link key={label} to={to} className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition duration-150 hover:-translate-y-0.5 hover:border-[var(--brand-green)]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2">
              <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p><Icon className="h-4 w-4 text-[var(--brand-green-dark)]" /></div>
              <p className="mt-3 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p>
            </Link>)}
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-[1.25fr_.75fr]">
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5" aria-labelledby="admin-revenue-heading">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div><h2 id="admin-revenue-heading" className="font-semibold">Paid order revenue</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">Monthly totals based on paid, non-cancelled orders</p></div>
                <Link to="/admin/reports" className="text-sm font-semibold text-[var(--brand-green-dark)]">View reports <ArrowRight className="ml-1 inline h-4 w-4" /></Link>
              </div>
              <Link to="/admin/reports" className="mt-5 grid h-48 grid-cols-6 items-end gap-3 border-b border-[var(--border-subtle)] px-1 transition hover:bg-[var(--bg-secondary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2" aria-label="Open reports for paid order revenue">
                {revenueByMonth.map((month) => <div key={month.label} className="flex h-full flex-col items-center justify-end gap-2">
                  <span className="text-[10px] text-[var(--text-secondary)]">{month.value ? formatCurrency(month.value) : '—'}</span>
                  <div className="w-full max-w-12 rounded-t-md bg-[#6b946d]" style={{ height: `${month.value ? Math.max(8, (month.value / chartMax) * 112) : 2}px` }} />
                  <span className="text-[11px] text-[var(--text-secondary)]">{month.label}</span>
                </div>)}
              </Link>
            </section>
            <section className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
              <div className="flex items-center justify-between gap-3"><h2 className="font-semibold">Inventory attention</h2><Link to="/admin/inventory" className="text-sm font-semibold text-[var(--brand-green-dark)]">Open inventory</Link></div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Live count of variants flagged as low stock</p>
              <Link to="/admin/inventory?filter=low-stock" className="mt-5 block rounded-xl transition hover:bg-[var(--bg-secondary)]/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)] focus-visible:ring-offset-2">
                <p className="text-3xl font-semibold">{dashboard.lowStockVariants.toLocaleString('en-IN')}</p>
                <p className="text-sm text-[var(--text-secondary)]">Low-stock variants</p>
              </Link>
              <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                <div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold">Return requests</h3><Link to="/admin/returns?status=REQUESTED" className="text-xs font-semibold text-[var(--brand-green-dark)]">Review</Link></div>
                {returnsError ? <p role="alert" className="mt-2 text-xs">{returnsError}</p> : <Link to="/admin/returns?status=REQUESTED" className="mt-2 block rounded-lg text-sm text-[var(--text-secondary)] transition hover:text-[var(--text-primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">{returns.length.toLocaleString('en-IN')} total · {returns.filter((item) => item.status === 'REQUESTED').length.toLocaleString('en-IN')} awaiting review</Link>}
              </div>
            </section>
          </div>
          <div className="mt-5 grid gap-5 xl:grid-cols-2">
            <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-4"><h2 className="font-semibold">Recent orders</h2><Link to="/admin/orders" className="text-sm font-semibold text-[var(--brand-green-dark)]">View all</Link></div>
              {orders.length ? <div className="divide-y divide-[var(--border-subtle)]">{orders.slice(0, 5).map((order) => <Link key={order.id} to="/admin/orders" className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 hover:bg-[var(--bg-secondary)]">
                <div><p className="text-sm font-semibold">{order.orderNumber}</p><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div>
                <div className="text-right"><p className="text-sm font-semibold">{formatCurrency(order.total)}</p><p className="mt-0.5 text-xs text-[var(--text-secondary)]">{order.paymentStatus} · {order.status}</p></div>
              </Link>)}</div> : <p className="p-5 text-sm text-[var(--text-secondary)]">No orders have been created yet.</p>}
            </section>
            <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <div className="flex items-center justify-between gap-3 border-b border-[var(--border-subtle)] p-4"><h2 className="font-semibold">Recent customer activity</h2><Link to="/admin/customers" className="text-sm font-semibold text-[var(--brand-green-dark)]">View customers</Link></div>
              {activityError ? <p role="alert" className="p-4 text-sm">{activityError}</p> : customers.length ? <div className="divide-y divide-[var(--border-subtle)]">{customers.map((customer) => <div key={customer.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0"><p className="truncate text-sm font-semibold">{customer.displayName}</p><p className="truncate text-xs text-[var(--text-secondary)]">{customer.email ?? customer.phone ?? 'Contact unavailable'}</p></div>
                <div className="shrink-0 text-right"><p className="text-xs text-[var(--text-secondary)]">{new Date(customer.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p><p className="text-xs">{customer.orderCount} orders</p></div>
              </div>)}</div> : <p className="p-5 text-sm text-[var(--text-secondary)]">No customer activity is available.</p>}
            </section>
          </div>
        </> : null}
  </DashboardShell>;
}

export function AdminOrdersPage() {
  const request = useAdminRequest();
  const [searchParams] = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState(() => searchParams.get('status') ?? 'ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOrders(await request(adminService.orders));
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to load orders.'));
    } finally {
      setLoading(false);
    }

  }, [request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setStatus(searchParams.get('status') ?? 'ALL'); }, [searchParams]);

  const visibleOrders = useMemo(() => orders.filter((order) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery || order.orderNumber.toLowerCase().includes(normalizedQuery) || (order.customer?.displayName ?? '').toLowerCase().includes(normalizedQuery) || (order.customer?.email ?? '').toLowerCase().includes(normalizedQuery) || (order.customer?.phone ?? '').includes(normalizedQuery);
    return matchesQuery && (status === 'ALL' || order.status === status) && (paymentStatus === 'ALL' || order.paymentStatus === paymentStatus);
  }), [orders, paymentStatus, query, status]);

  const updateStatus = async (order: AdminOrder, nextStatus: string) => {
    setSavingId(order.id);
    setError('');
    setNotice('');
    try {
      const updated = await request((token) => adminService.updateOrderStatus(token, order.id, nextStatus));
      setOrders((current) => current.map((item) => item.id === updated.id
        ? { ...item, status: updated.status, paymentStatus: updated.paymentStatus, history: updated.history }
        : item));
      setSelectedOrder((current) => current?.id === updated.id
        ? { ...current, status: updated.status, paymentStatus: updated.paymentStatus, history: updated.history }
        : current);
      setNotice(`${updated.orderNumber} updated to ${updated.status}.`);
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to update order status.'));
    } finally {
      setSavingId('');
    }
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Orders" title="Customer orders" description="Review live orders and update their fulfilment status." />
    <div className="mt-6 flex min-h-[100px] flex-wrap items-center gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order number or customer" className="h-12 min-w-0 flex-1 basis-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none sm:basis-[280px]" />
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="h-12 min-w-0 basis-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm sm:basis-[210px] sm:flex-none"><option value="ALL">All order statuses</option>{['PENDING_PAYMENT', 'PAID', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((value) => <option key={value}>{value}</option>)}</select>
      <select value={paymentStatus} onChange={(event) => setPaymentStatus(event.target.value)} className="h-12 min-w-0 basis-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm sm:basis-[210px] sm:flex-none"><option value="ALL">All payment statuses</option>{['PENDING', 'PAID', 'FAILED'].map((value) => <option key={value}>{value}</option>)}</select>
      <Button type="button" variant="ghost" className="h-12 w-[140px] flex-none px-3 py-2" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </div>
    <DeliveryBatchesPanel />
    {error ? <div className="mt-4"><AdminError message={error} onRetry={() => void load()} /></div> : null}
    {notice ? <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading orders...</p> : <div className="mt-6">
      <div className="hidden overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] lg:block">
        <table className="w-full table-fixed text-left text-sm">
          <colgroup><col className="w-[12%]" /><col className="w-[16%]" /><col className="w-[11%]" /><col className="w-[19%]" /><col className="w-[9%]" /><col className="w-[9%]" /><col className="w-[10%]" /><col className="w-[14%]" /></colgroup>
          <thead><tr className="border-b border-[var(--border-subtle)] text-xs text-[var(--text-secondary)]"><th className="px-3 py-4">Order</th><th className="px-3 py-4">Customer</th><th className="px-3 py-4">Date</th><th className="px-3 py-4">Products</th><th className="px-3 py-4">Total</th><th className="px-3 py-4">Payment</th><th className="px-3 py-4">Status</th><th className="px-3 py-4">Actions</th></tr></thead>
          <tbody>{visibleOrders.map((order) => <tr key={order.id} className="border-b border-[var(--border-subtle)] align-top last:border-0"><td className="break-words px-3 py-4 font-semibold">{order.orderNumber}</td><td className="break-words px-3 py-4"><p>{order.customer?.displayName || 'Customer information unavailable'}</p><p className="mt-1 break-all text-xs text-[var(--text-secondary)]">{order.customer?.email ?? order.customer?.phone ?? 'No contact'}</p></td><td className="px-3 py-4 text-xs text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td><td className="break-words px-3 py-4 text-xs text-[var(--text-secondary)]">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}</td><td className="whitespace-nowrap px-3 py-4 font-semibold">{formatCurrency(order.total)}</td><td className="break-words px-3 py-4 text-xs">{order.paymentStatus}</td><td className="break-words px-3 py-4 text-xs">{order.status}</td><td className="px-3 py-4"><div className="flex flex-col items-stretch gap-2"><Button type="button" variant="ghost" className="whitespace-nowrap px-3 py-2 text-xs" onClick={() => setSelectedOrder(order)}>View details</Button><select aria-label={`Update ${order.orderNumber} status`} disabled={savingId === order.id} value={order.status} onChange={(event) => void updateStatus(order, event.target.value)} className="min-w-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-2 text-xs"><option value={order.status}>{order.status}</option>{nextOrderStatuses(order.status).map((value) => <option key={value}>{value}</option>)}</select></div></td></tr>)}</tbody>
        </table>
      </div>
      <div className="grid gap-4 lg:hidden">{visibleOrders.map((order) => <article key={order.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="break-words font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><p className="whitespace-nowrap font-semibold">{formatCurrency(order.total)}</p></div><div className="mt-4 grid gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm"><div><p className="text-xs text-[var(--text-secondary)]">Customer</p><p className="break-words">{order.customer?.displayName || 'Customer information unavailable'}</p><p className="break-all text-xs text-[var(--text-secondary)]">{order.customer?.email ?? order.customer?.phone ?? 'No contact'}</p></div><div><p className="text-xs text-[var(--text-secondary)]">Products and quantity</p><p className="break-words">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ')}</p></div><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-[var(--text-secondary)]">Payment</p><p>{order.paymentStatus}</p></div><div><p className="text-xs text-[var(--text-secondary)]">Order status</p><p>{order.status}</p></div></div><div className="grid grid-cols-[1fr_auto] items-center gap-3"><select aria-label={`Update ${order.orderNumber} status`} disabled={savingId === order.id} value={order.status} onChange={(event) => void updateStatus(order, event.target.value)} className="min-w-0 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-xs"><option value={order.status}>{order.status}</option>{nextOrderStatuses(order.status).map((value) => <option key={value}>{value}</option>)}</select><Button type="button" variant="ghost" className="whitespace-nowrap px-3 py-2 text-xs" onClick={() => setSelectedOrder(order)}>View details</Button></div></div></article>)}</div>
      {!visibleOrders.length ? <p className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">No orders match the selected filters.</p> : null}
    </div>}
    {selectedOrder ? <AdminOrderDetails order={selectedOrder} onClose={() => setSelectedOrder(null)} /> : null}
  </DashboardShell>;
}

function DeliveryBatchesPanel() {
  const request = useAdminRequest();
  const [eligibleOrders, setEligibleOrders] = useState<EligibleDeliveryOrder[]>([]);
  const [batches, setBatches] = useState<DeliveryBatchSummary[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [postalCode, setPostalCode] = useState('');
  const [city, setCity] = useState('');
  const [routeName, setRouteName] = useState('');
  const [includeAssigned, setIncludeAssigned] = useState(false);
  const [created, setCreated] = useState<CreatedDeliveryBatch | null>(null);
  const [selectedBatch, setSelectedBatch] = useState<AdminDeliveryBatchDetails | null>(null);
  const [selectedBatchLink, setSelectedBatchLink] = useState<ActiveDeliveryBatchLink | null>(null);
  const [batchOtpReveal, setBatchOtpReveal] = useState<{ batchId: string; otps: DeliveryOtp[] } | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const formState = getDeliveryBatchFormState(
    eligibleOrders, selectedIds, routeName, loading, busy === 'create',
  );

  const loadBatches = useCallback(async () => {
    setBatches(await request(deliveryBatchService.list));
  }, [request]);

  const loadEligible = useCallback(async () => {
    setLoading(true);
    setError('');
    setEligibleOrders([]);
    try {
      const result = await request((token) =>
        deliveryBatchService.eligibleOrders(token, postalCode, city, includeAssigned));
      setEligibleOrders(result);
      setSelectedIds((ids) => ids.filter((id) => result.some((order) => order.id === id)));
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to load eligible delivery orders.'));
    } finally {
      setLoading(false);
    }
  }, [city, includeAssigned, postalCode, request]);

  useEffect(() => {
    void Promise.all([loadEligible(), loadBatches()]).catch((reason: unknown) => {
      setError(adminOrderErrorMessage(reason, 'Unable to load delivery batches.'));
      setLoading(false);
    });
  }, [loadBatches, loadEligible]);

  const toggleOrder = (orderId: string) => {
    setSelectedIds((ids) => ids.includes(orderId) ? ids.filter((id) => id !== orderId) : [...ids, orderId]);
  };

  const createBatch = async () => {
    if (formState.routeNameMissing) {
      setError('Enter a route name before creating the delivery batch.');
      return;
    }
    if (formState.selectedOrderIds.length === 0) {
      setError('Select at least one currently eligible order before creating the delivery batch.');
      return;
    }
    setBusy('create');
    setError('');
    setNotice('');
    try {
      const result = await request((token) =>
        deliveryBatchService.create(token, routeName.trim(), formState.selectedOrderIds, includeAssigned));
      setCreated(result);
      setSelectedIds([]);
      setRouteName('');
      await Promise.all([loadBatches(), loadEligible()]);
      setNotice(`Created ${result.batch.routeName} with ${result.batch.total} orders.`);
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to create the delivery batch.'));
    } finally {
      setBusy('');
    }
  };

  const regenerateLink = async (batchId: string) => {
    setBusy(batchId);
    setError('');
    try {
      const result = await request((token) => deliveryBatchService.regenerateLink(token, batchId));
      setSelectedBatch((current) => current?.batch.id === batchId ? {
        ...current,
        batch: result.batch,
        activeLinkAvailable: true,
        activeLinkRecoverable: true,
        linkExpiresAt: result.linkExpiresAt,
      } : current);
      setSelectedBatchLink({
        linkPath: result.linkPath,
        expiresAt: result.linkExpiresAt,
        available: true,
      });
      setBatchOtpReveal({ batchId, otps: result.deliveryOtps });
      await loadBatches();
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to regenerate the delivery link.'));
    } finally {
      setBusy('');
    }
  };

  const regenerateOrderOtp = async (batchId: string, orderId: string) => {
    setBusy(orderId);
    setError('');
    try {
      const otp = await request((token) => deliveryBatchService.regenerateOrderOtp(token, batchId, orderId));
      setBatchOtpReveal((current) => ({
        batchId,
        otps: [...(current?.batchId === batchId ? current.otps.filter((entry) => entry.orderId !== orderId) : []), otp],
      }));
      setNotice(`A fresh delivery OTP is ready for ${otp.orderNumber}. The previous OTP is invalid.`);
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to regenerate the delivery OTP.'));
    } finally {
      setBusy('');
    }
  };

  const openBatch = async (batchId: string) => {
    setDetailsLoading(true);
    setError('');
    setNotice('');
    setCreated(null);
    setBatchOtpReveal(null);
    setSelectedBatch(null);
    setSelectedBatchLink(null);
    try {
      const details = await request((token) => deliveryBatchService.details(token, batchId));
      let activeLink: ActiveDeliveryBatchLink;
      if (details.activeLinkAvailable && details.activeLinkRecoverable) {
        activeLink = await request((token) => deliveryBatchService.activeLink(token, batchId));
      } else {
        activeLink = {
          linkPath: null,
          expiresAt: details.linkExpiresAt,
          available: details.activeLinkAvailable,
        };
      }
      setSelectedBatchLink(activeLink);
      setSelectedBatch(details);
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to load batch details.'));
    } finally {
      setDetailsLoading(false);
    }
  };

  const revokeBatchLink = async (batchId: string) => {
    if (!window.confirm('Revoke the active batch link? You can generate a new link later.')) return;
    setBusy(batchId);
    setError('');
    try {
      await request((token) => deliveryBatchService.revokeLink(token, batchId));
      await loadBatches();
      if (created?.batch.id === batchId) setCreated(null);
      setNotice('The delivery batch link has been revoked. The batch can receive a new link.');
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to revoke the delivery batch.'));
    } finally {
      setBusy('');
    }
  };

  const closeBatch = async (batchId: string) => {
    if (!window.confirm('Close this batch and release orders that have not been picked up? In-progress batches cannot be closed.')) return;
    setBusy(batchId);
    setError('');
    try {
      await request((token) => deliveryBatchService.revoke(token, batchId));
      await Promise.all([loadBatches(), loadEligible()]);
      if (created?.batch.id === batchId) setCreated(null);
      setNotice('The batch is closed. Orders not yet picked up are available for another batch.');
    } catch (reason) {
      setError(adminOrderErrorMessage(reason, 'Unable to close the delivery batch.'));
    } finally {
      setBusy('');
    }
  };

  const batchLink = created ? `${window.location.origin}${created.linkPath}` : '';
  const copyText = async (value: string, successMessage: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice(successMessage);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the displayed value manually.');
    }
  };
  const shareOtp = async (phone: string, orderNumber: string, otp: string) => {
    const url = getDeliveryOtpWhatsAppUrl(phone);
    if (!url) {
      setError(`No valid customer phone number is available for ${orderNumber}.`);
      return;
    }
    window.open(url, '_blank', 'noopener,noreferrer');
    try {
      await navigator.clipboard.writeText(getDeliveryOtpWhatsAppMessage(orderNumber, otp));
      setNotice(`OTP for ${orderNumber} copied. Paste it into the customer’s WhatsApp chat to send it.`);
    } catch {
      setError(`WhatsApp opened for ${orderNumber}. Clipboard access is unavailable; copy the displayed OTP and paste it into the chat.`);
    }
  };

  return <section className="mt-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 sm:p-6">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">Route delivery</p>
        <h2 className="mt-2 text-xl font-semibold">Delivery batches</h2>
        <p className="mt-1 max-w-3xl text-sm text-[var(--text-secondary)]">Select paid orders in processing for one city, state and PIN code. Each order has its own OTP.</p>
      </div>
      <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => void Promise.all([loadBatches(), loadEligible()])}>
        <RefreshCw className="mr-2 h-4 w-4" />Refresh
      </Button>
    </div>
    {error ? <p role="alert" aria-live="polite" className="mt-4 rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
    {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}

    {created ? <div className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/5 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="font-semibold">Secure link ready: {created.batch.routeName}</p><p className="mt-1 break-all text-xs text-[var(--text-secondary)]">{batchLink}</p></div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" className="px-3 py-2 text-xs" onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(batchLink)}`, '_blank', 'noopener,noreferrer')}>
            <MessageCircle className="mr-2 h-4 w-4" />WhatsApp Share
          </Button>
          <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => void copyText(batchLink, 'Delivery link copied.')}>
            <Copy className="mr-2 h-4 w-4" />Copy Link
          </Button>
          <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => setCreated(null)} aria-label="Close link and OTP details"><X className="h-4 w-4" /></Button>
        </div>
      </div>
      <p className="mt-3 text-xs text-amber-200">Link expires {new Date(created.linkExpiresAt).toLocaleString('en-IN')}. Share each customer’s OTP separately; do not send OTPs with the driver link.</p>
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {created.deliveryOtps.map((entry) => <div key={entry.orderId} className="flex items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
          <div className="min-w-0"><p className="truncate text-sm font-medium">{entry.orderNumber} · {entry.recipientName}</p><p className="font-mono text-lg tracking-[0.2em]">{entry.otp}</p></div>
          <div className="flex shrink-0 gap-1">
            <Button type="button" variant="ghost" className="px-2 py-2 text-xs" onClick={() => void copyText(entry.otp, `OTP copied for ${entry.orderNumber}.`)}><Copy className="mr-1 h-3 w-3" />Copy OTP</Button>
            <Button type="button" variant="ghost" className="px-2 py-2 text-xs" onClick={() => shareOtp(entry.phone, entry.orderNumber, entry.otp)}><MessageCircle className="mr-1 h-3 w-3" />WhatsApp customer</Button>
          </div>
        </div>)}
      </div>
    </div> : null}

    <div className="mt-6 grid gap-3 md:grid-cols-[1fr_1fr_1.2fr_auto]">
      <label className="text-xs text-[var(--text-secondary)]">PIN code<input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} inputMode="numeric" maxLength={16} className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" placeholder="e.g. 500001" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Delivery city<input value={city} onChange={(event) => setCity(event.target.value)} className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" placeholder="Hyderabad" /></label>
      <label className="text-xs text-[var(--text-secondary)]">Route name<input value={routeName} onChange={(event) => setRouteName(event.target.value)} maxLength={120} aria-invalid={formState.routeNameMissing && selectedIds.length > 0} aria-describedby={formState.routeNameMissing && selectedIds.length > 0 ? 'delivery-route-name-error' : undefined} className="mt-1 h-11 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm text-[var(--text-primary)]" placeholder="e.g. Madhapur morning route" /></label>
      <Button type="button" variant="ghost" className="mt-auto h-11 px-4" onClick={() => void loadEligible()}><MapPin className="mr-2 h-4 w-4" />Filter</Button>
    </div>
    <label className="mt-3 flex items-start gap-2 text-xs text-[var(--text-secondary)]">
      <input type="checkbox" checked={includeAssigned} onChange={(event) => setIncludeAssigned(event.target.checked)} className="mt-0.5 accent-emerald-500" />
      Include orders already assigned to an active batch. Creating this batch will explicitly reassign eligible orders that have not been picked up.
    </label>

    <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm"><span className="font-semibold">{formState.selectedOrderIds.length}</span> selected · {eligibleOrders.length} eligible orders</p>
      <Button type="button" disabled={!formState.canCreate} onClick={() => void createBatch()} className="px-4 py-2">
        <PackageCheck className="mr-2 h-4 w-4" />{busy === 'create' ? 'Creating…' : `Create batch (${formState.selectedOrderIds.length})`}
      </Button>
    </div>
    {formState.routeNameMissing && formState.selectedOrderIds.length > 0 ? <p id="delivery-route-name-error" role="status" className="mt-2 text-sm text-amber-200">Enter a route name to enable batch creation.</p> : null}
    {!formState.selectedOrderIds.length && selectedIds.length > 0 ? <p className="mt-2 text-sm text-amber-200">Your selection is no longer eligible. Refresh the order list and select an eligible order.</p> : null}
    {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading eligible orders…</p> : eligibleOrders.length ? <div className="mt-3 max-h-80 overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
      {eligibleOrders.map((order) => <label key={order.id} className="flex cursor-pointer items-start gap-3 border-b border-[var(--border-subtle)] p-3 last:border-0">
        <input type="checkbox" checked={selectedIds.includes(order.id)} onChange={() => toggleOrder(order.id)} className="mt-1 accent-emerald-500" />
        <span className="min-w-0 flex-1"><span className="block font-medium">{order.orderNumber} · {order.recipientName}</span><span className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-[var(--text-secondary)]"><MapPin className="h-3 w-3" />{order.city}, {order.state} · {order.postalCode}</span></span>
        <span className="shrink-0 text-xs text-[var(--text-secondary)]">{order.status} / {order.paymentStatus}</span>
      </label>)}
    </div> : <p className="mt-4 rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">No paid orders in processing match this route filter.</p>}

    <h3 className="mt-7 font-semibold">Existing batches</h3>
    {!batches.length ? <p className="mt-2 text-sm text-[var(--text-secondary)]">No delivery batches have been created.</p> : <div className="mt-3 grid gap-3 lg:grid-cols-2">
      {batches.map((batch) => <article key={batch.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
        <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold">{batch.routeName}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{batch.orders.map((order) => order.postalCode).filter((value, index, values) => values.indexOf(value) === index).join(', ')}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{batch.linkExpiresAt ? `Link expires ${new Date(batch.linkExpiresAt).toLocaleString('en-IN')}` : 'No active link'}</p></div><span className="rounded-full border border-[var(--border-subtle)] px-2 py-1 text-xs">{batch.status}</span></div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center text-xs"><span>Total<strong className="mt-1 block text-base">{batch.total}</strong></span><span>Pending<strong className="mt-1 block text-base">{batch.pending}</strong></span><span>Delivered<strong className="mt-1 block text-base">{batch.delivered}</strong></span><span>Failed<strong className="mt-1 block text-base">{batch.failed}</strong></span></div>
        <div className="mt-3 flex flex-wrap gap-2">
          {batch.status !== 'REVOKED' ? <Button type="button" variant="ghost" disabled={busy === batch.id} className="px-3 py-2 text-xs text-red-300" onClick={() => void revokeBatchLink(batch.id)}>Revoke link</Button> : null}
          {batch.status === 'OPEN' ? <Button type="button" variant="ghost" disabled={busy === batch.id} className="px-3 py-2 text-xs text-red-300" onClick={() => void closeBatch(batch.id)}>Close batch</Button> : null}
          <Button type="button" className="px-3 py-2 text-xs" onClick={() => void openBatch(batch.id)}>
            <PackageOpen className="mr-1 h-3 w-3" />View Batch
          </Button>
        </div>
      </article>)}
    </div>}
    {detailsLoading ? <div role="status" className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 p-4"><p className="rounded-2xl bg-[var(--bg-card)] p-6 text-sm">Loading batch details…</p></div> : null}
    {selectedBatch ? <DeliveryBatchDetailsModal
      details={selectedBatch}
      activeLink={selectedBatchLink}
      revealedOtps={batchOtpReveal?.batchId === selectedBatch.batch.id ? batchOtpReveal.otps : []}
      error={error}
      notice={notice}
      busy={busy === selectedBatch.batch.id}
      otpBusyOrderId={busy}
      onClose={() => { setSelectedBatch(null); setSelectedBatchLink(null); setBatchOtpReveal(null); }}
      onCopy={(value, message) => void copyText(value, message)}
      onShare={(url) => window.open(`https://wa.me/?text=${encodeURIComponent(url)}`, '_blank', 'noopener,noreferrer')}
      onRegenerate={() => void regenerateLink(selectedBatch.batch.id)}
      onRegenerateOtp={(orderId) => void regenerateOrderOtp(selectedBatch.batch.id, orderId)}
      onShareOtp={shareOtp}
    /> : null}
  </section>;
}

function DeliveryBatchDetailsModal({
  details, activeLink, revealedOtps, error, notice, busy, otpBusyOrderId, onClose, onCopy, onShare, onRegenerate, onRegenerateOtp, onShareOtp,
}: {
  details: AdminDeliveryBatchDetails;
  activeLink: ActiveDeliveryBatchLink | null;
  revealedOtps: DeliveryOtp[];
  error: string;
  notice: string;
  busy: boolean;
  otpBusyOrderId: string;
  onClose: () => void;
  onCopy: (value: string, message: string) => void;
  onShare: (url: string) => void;
  onRegenerate: () => void;
  onRegenerateOtp: (orderId: string) => void;
  onShareOtp: (phone: string, orderNumber: string, otp: string) => void;
}) {
  const [activeOrderIndex, setActiveOrderIndex] = useState(0);
  const batch = details.batch;
  const linkUrl = activeLink?.linkPath ? `${window.location.origin}${activeLink.linkPath}` : '';
  const canRegenerate = batch.status === 'OPEN' && (!details.activeLinkAvailable || !details.activeLinkRecoverable);
  const order = details.orders[activeOrderIndex];
  const revealedOtp = order && !['DELIVERED', 'REASSIGNED'].includes(order.status)
    ? revealedOtps.find((entry) => entry.orderId === order.id)
    : undefined;
  const canRegenerateOtp = order && canRegenerateDeliveryOtp(batch.status, order.status);

  return <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/75 p-3 sm:p-6" role="presentation" onMouseDown={(event) => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <section role="dialog" aria-modal="true" aria-labelledby="delivery-batch-details-title" className="my-3 flex max-h-[calc(100dvh-1.5rem)] w-full max-w-5xl flex-col overflow-y-auto rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-[var(--text-primary)] shadow-2xl sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div><p className="text-xs uppercase tracking-[0.18em] text-[var(--text-secondary)]">Delivery batch</p><h2 id="delivery-batch-details-title" className="mt-1 text-2xl font-semibold">{batch.routeName}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">Created {new Date(batch.createdAt).toLocaleString('en-IN')}</p></div>
        <div className="flex items-center gap-2"><span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs">{batch.status}</span><Button type="button" variant="ghost" className="px-3 py-2" onClick={onClose} aria-label="Close batch details"><X className="h-4 w-4" /></Button></div>
      </div>
      {error ? <p role="alert" className="mt-3 rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{error}</p> : null}
      {notice ? <p role="status" className="mt-3 rounded-xl border border-emerald-300/30 bg-emerald-400/10 p-3 text-sm text-emerald-200">{notice}</p> : null}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([['Total', batch.total], ['Pending', batch.pending], ['Delivered', batch.delivered], ['Failed', batch.failed]] as const).map(([label, count]) =>
          <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3"><p className="text-xs text-[var(--text-secondary)]">{label}</p><p className="mt-1 text-2xl font-semibold">{count}</p></div>)}
      </div>
      {batch.status !== 'COMPLETED' && batch.status !== 'REVOKED' ? <div className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
        {linkUrl ? <>
          <p className="text-xs text-[var(--text-secondary)]">{activeLink?.expiresAt ? `Active link expires ${new Date(activeLink.expiresAt).toLocaleString('en-IN')}.` : 'Active batch link'}</p>
          <p className="mt-1 break-all text-sm">{linkUrl}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => onCopy(linkUrl, 'Active delivery link copied.')}><Copy className="mr-2 h-4 w-4" />Copy Active Link</Button>
            <Button type="button" className="px-3 py-2 text-xs" onClick={() => onShare(linkUrl)}><MessageCircle className="mr-2 h-4 w-4" />WhatsApp Share</Button>
          </div>
        </> : canRegenerate ? <>
          {details.activeLinkAvailable && !details.activeLinkRecoverable
            ? <p className="mb-3 text-sm text-amber-200">This batch has an older active link that cannot be retrieved securely. Regenerating will revoke it and issue a new link and fresh OTPs for unfinished orders.</p>
            : <p className="mb-3 text-sm text-[var(--text-secondary)]">The active batch link is expired or revoked.</p>}
          <Button type="button" disabled={busy} className="px-4 py-2" onClick={onRegenerate}><RefreshCw className="mr-2 h-4 w-4" />{busy ? 'Generating…' : 'Regenerate Link'}</Button>
        </> : <p className="text-sm text-[var(--text-secondary)]">No active delivery link is available.</p>}
      </div> : <p className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">This batch is read-only. Link generation and delivery updates are unavailable.</p>}

      <h3 className="mt-6 text-lg font-semibold">Orders in this batch</h3>
      {order ? <>
        <div className="mt-2 flex items-center justify-between gap-2">
          <Button type="button" variant="ghost" disabled={activeOrderIndex === 0} className="px-3 py-2 text-xs" onClick={() => setActiveOrderIndex((index) => Math.max(0, index - 1))}><ChevronLeft className="mr-1 h-4 w-4" />Previous</Button>
          <span className="text-xs text-[var(--text-secondary)]">Order {activeOrderIndex + 1} of {details.orders.length}</span>
          <Button type="button" variant="ghost" disabled={activeOrderIndex >= details.orders.length - 1} className="px-3 py-2 text-xs" onClick={() => setActiveOrderIndex((index) => Math.min(details.orders.length - 1, index + 1))}>Next<ChevronRight className="ml-1 h-4 w-4" /></Button>
        </div>
        <article key={order.id} className="mt-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
          <div className="flex flex-wrap items-start justify-between gap-2"><div><p className="font-semibold">{order.orderNumber}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{order.items.map((item) => `${item.productName} × ${item.quantity}`).join(', ') || 'No item details'}</p></div><span className="rounded-full border border-[var(--border-subtle)] px-3 py-1 text-xs">{order.status.replaceAll('_', ' ')}</span></div>
          <div className="mt-3 grid gap-3 text-sm sm:grid-cols-2">
            <div><p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Customer</p><p className="mt-1 font-medium">{order.recipientName}</p><p><a className="underline" href={`tel:${order.phone}`}>{order.phone}</a></p></div>
            <div><p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">Delivery address</p><p className="mt-1">{order.address}, {order.city}, {order.state} {order.postalCode}</p></div>
          </div>
          <div className="mt-3 rounded-xl border border-[var(--border-subtle)] p-3">
            {revealedOtp ? <>
              <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">One-time delivery OTP</p>
              <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-lg tracking-[0.2em]" aria-label={`Delivery OTP for ${order.orderNumber}`}>{revealedOtp.otp}</p>
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="ghost" className="px-3 py-2 text-xs" onClick={() => onCopy(revealedOtp.otp, `OTP copied for ${order.orderNumber}.`)}><Copy className="mr-1 h-3 w-3" />Copy OTP</Button>
                  <Button type="button" variant="ghost" disabled={!order.phone} className="px-3 py-2 text-xs" onClick={() => onShareOtp(order.phone, order.orderNumber, revealedOtp.otp)}><MessageCircle className="mr-1 h-3 w-3" />WhatsApp customer</Button>
                </div>
              </div>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Send only to this customer. They can share it with the delivery person when the order arrives.</p>
            </> : canRegenerateOtp ? <>
              <p className="text-sm text-[var(--text-secondary)]">Existing OTPs cannot be recovered. Generate a fresh OTP if this order’s code was lost.</p>
              <Button type="button" disabled={otpBusyOrderId === order.id} className="mt-2 px-3 py-2 text-xs" onClick={() => onRegenerateOtp(order.id)}><RefreshCw className="mr-2 h-4 w-4" />{otpBusyOrderId === order.id ? 'Generating…' : 'Generate fresh OTP'}</Button>
            </> : <p className="text-sm text-[var(--text-secondary)]">No OTP is available for this completed order.</p>}
          </div>
          <details className="mt-3 border-t border-[var(--border-subtle)] pt-3">
            <summary className="cursor-pointer text-xs text-[var(--text-secondary)]">Status history ({order.history.length})</summary>
            {order.history.length ? <ol className="mt-3 space-y-2">{order.history.map((entry, index) => <li key={`${entry.status}-${entry.createdAt}-${index}`} className="text-xs"><span className="font-medium">{entry.previousStatus ? `${entry.previousStatus.replaceAll('_', ' ')} → ` : ''}{entry.status.replaceAll('_', ' ')}</span><span className="text-[var(--text-secondary)]"> · {new Date(entry.createdAt).toLocaleString('en-IN')}{entry.note ? ` · ${entry.note}` : ''} · {entry.source}</span></li>)}</ol>
              : <p className="mt-2 text-xs text-[var(--text-secondary)]">No status history recorded.</p>}
          </details>
        </article>
      </> : <p className="mt-3 text-sm text-[var(--text-secondary)]">No orders are available in this batch.</p>}
      <div className="mt-5 flex justify-end"><Button type="button" variant="ghost" className="px-4 py-2" onClick={onClose}>Close</Button></div>
    </section>
  </div>;
}

function AdminOrderDetails({ order, onClose }: { order: AdminOrder; onClose: () => void }) {
  const request = useAdminRequest();
  const [details, setDetails] = useState(order);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState('');
  const [drafts, setDrafts] = useState<Record<string, { status: LensPreparationDetails['status']; notes: string }>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setDetails(await request((token) => adminService.order(token, order.id)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load prescription and lens details.');
    } finally {
      setLoading(false);
    }
  }, [order.id, request]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setDrafts(Object.fromEntries(details.items.filter((item) => item.lensPreparation).map((item) => [
      item.id,
      { status: item.lensPreparation!.status, notes: item.lensPreparation!.notes ?? '' },
    ])));
  }, [details]);

  const savePreparation = async (item: AdminOrderItem) => {
    const draft = drafts[item.id];
    if (!draft) return;
    setBusy(item.id);
    setError('');
    setNotice('');
    try {
      const saved = await request((token) => adminService.updateLensPreparation(token, details.id, item.id, draft.status, draft.notes));
      setDetails((current) => ({ ...current, items: current.items.map((row) => row.id === item.id ? { ...row, lensPreparation: saved } : row) }));
      setNotice(`Lens preparation updated for ${item.productName}.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update lens preparation.');
    } finally {
      setBusy('');
    }
  };

  const openDocument = async (item: AdminOrderItem, fileId: string, fileName: string, download: boolean) => {
    const key = `${item.id}-${fileId}-${download ? 'download' : 'view'}`;
    const previewWindow = download ? null : window.open('', '_blank');
    if (!download && !previewWindow) {
      setError('Allow pop-ups to securely view the prescription document.');
      return;
    }
    if (previewWindow) previewWindow.opener = null;
    setBusy(key);
    setError('');
    try {
      const blob = await request((token) => adminService.prescriptionDocument(token, details.id, item.id, fileId, download));
      const url = URL.createObjectURL(blob);
      if (download) {
        const anchor = document.createElement('a');
        anchor.href = url;
        anchor.download = fileName;
        anchor.click();
      } else {
        previewWindow!.location.href = url;
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      previewWindow?.close();
      setError(reason instanceof Error ? reason.message : 'Unable to open the prescription document.');
    } finally {
      setBusy('');
    }
  };

  const downloadSummary = async (item: AdminOrderItem) => {
    setBusy(`${item.id}-summary`);
    setError('');
    try {
      const blob = await request((token) => adminService.prescriptionSummary(token, details.id, item.id));
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `prescription-${details.orderNumber}.pdf`;
      anchor.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to download the prescription summary.');
    } finally {
      setBusy('');
    }
  };

  const address = details.shippingAddress;
  return <div className="fixed inset-0 z-50 flex justify-end bg-black/50" onClick={onClose}>
    <aside className="h-full w-full max-w-3xl overflow-y-auto bg-[var(--bg-card)] p-5 shadow-2xl sm:p-6" onClick={(event) => event.stopPropagation()}>
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-[var(--brand-green-dark)]">Order details</p><h2 className="mt-2 text-2xl font-semibold">{details.orderNumber}</h2></div><Button type="button" variant="ghost" onClick={onClose}>Close</Button></div>
      {error ? <div className="mt-5"><AdminError message={error} onRetry={() => void load()} /></div> : null}
      {notice ? <p className="mt-4 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{notice}</p> : null}
      {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading order and prescription details...</p> : <>
        <div className="mt-6 grid gap-5 sm:grid-cols-2"><section><h3 className="font-semibold">Customer</h3><p className="mt-2 text-sm">{details.customer?.displayName || 'Customer information unavailable'}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{details.customer?.email ?? 'No email'}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{details.customer?.phone ?? 'No phone'}</p></section><section><h3 className="font-semibold">Delivery address</h3><p className="mt-2 text-sm">{address.recipientName} · {address.phone}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{address.line1}{address.line2 ? `, ${address.line2}` : ''}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{address.city}, {address.state} {address.postalCode}, {address.countryCode}</p></section></div>
        <section className="mt-6 border-t border-[var(--border-subtle)] pt-6"><h3 className="font-semibold">Products</h3><div className="mt-3 space-y-3">{details.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 text-sm"><div><p>{item.productName}</p><p className="text-[var(--text-secondary)]">SKU {item.sku} · Qty {item.quantity}</p></div><p className="font-semibold">{formatCurrency(item.lineTotal)}</p></div>)}</div></section>
        {details.items.filter((item) => item.prescription).map((item) => {
          const prescription = item.prescription!;
          const preparation = item.lensPreparation;
          const draft = drafts[item.id];
          return <section key={item.id} className="mt-6 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 sm:p-5">
            <h3 className="text-lg font-semibold">Prescription &amp; Lens Details</h3>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">{item.productName} · {prescription.source === 'UPLOAD' ? 'Uploaded prescription' : 'Manually entered prescription'}</p>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <PrescriptionEyeDetails title="Right Eye (OD)" sph={prescription.rightSph} cyl={prescription.rightCyl} axis={prescription.rightAxis} add={prescription.rightAdd} />
              <PrescriptionEyeDetails title="Left Eye (OS)" sph={prescription.leftSph} cyl={prescription.leftCyl} axis={prescription.leftAxis} add={prescription.leftAdd} />
            </div>
            <div className="mt-4 grid gap-3 rounded-2xl border border-[var(--border-subtle)] p-4 text-sm sm:grid-cols-3">
              <p>Total PD: <strong>{prescription.pd ?? '—'} mm</strong></p><p>Right monocular PD: <strong>{prescription.rightPd ?? '—'} mm</strong></p><p>Left monocular PD: <strong>{prescription.leftPd ?? '—'} mm</strong></p>
            </div>
            <div className="mt-4">
              <h4 className="text-sm font-semibold">Selected lenses</h4>
              <div className="mt-2 flex flex-wrap gap-2">{prescription.selectedLenses.map((lens) => <span key={lens.code} className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs">{lens.category ? `${lens.category === 'TYPE' ? 'Lens type' : lens.category === 'MATERIAL' ? 'Material' : 'Coating'}: ` : ''}{lens.name}</span>)}</div>
              <div className="mt-3 grid gap-2 text-sm sm:grid-cols-2"><p>Lens additional price: <strong>{formatINR(item.lensAdditionalPrice)}</strong></p><p>Preparation time: <strong>{prescription.preparationDays ? `${prescription.preparationDays} days` : 'Not specified'}</strong></p></div>
            </div>
            <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
              <h4 className="text-sm font-semibold">Original prescription document</h4>
              {prescription.files.length ? <div className="mt-2 space-y-2">{prescription.files.map((file) => <div key={file.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--border-subtle)] p-3"><span className="min-w-0 flex-1 break-all text-xs">{file.originalName}</span><div className="flex gap-2"><Button type="button" variant="ghost" className="px-3 py-2 text-xs" disabled={busy !== ''} onClick={() => void openDocument(item, file.id, file.originalName, false)}><Eye className="mr-1 h-4 w-4" />Secure View</Button><Button type="button" variant="ghost" className="px-3 py-2 text-xs" disabled={busy !== ''} onClick={() => void openDocument(item, file.id, file.originalName, true)}><Download className="mr-1 h-4 w-4" />Download</Button></div></div>)}</div> : <p className="mt-2 text-sm text-[var(--text-secondary)]">{prescription.source === 'MANUAL' ? 'No upload is required for a manually entered prescription.' : 'No uploaded document is attached.'}</p>}
              {prescription.source === 'MANUAL' ? <Button type="button" variant="secondary" className="mt-3" disabled={busy !== ''} onClick={() => void downloadSummary(item)}><Download className="mr-2 h-4 w-4" />Download prescription summary PDF</Button> : null}
            </div>
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
              <h4 className="font-semibold">Lens Preparation</h4>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Current status: {preparation?.status?.replaceAll('_', ' ') ?? 'PENDING'}{preparation?.updatedBy ? ` · Updated by ${preparation.updatedBy}` : ''}{preparation?.updatedAt ? ` · ${new Date(preparation.updatedAt).toLocaleString('en-IN')}` : ''}</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_1.5fr]">
                <select aria-label={`Lens preparation status for ${item.productName}`} disabled={!draft || busy !== ''} value={draft?.status ?? 'PENDING'} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], status: event.target.value as LensPreparationDetails['status'] } }))} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm"><option value="PENDING">Pending</option><option value="IN_PREPARATION">In Preparation</option><option value="READY_FOR_DISPATCH">Ready for Dispatch</option></select>
                <textarea aria-label={`Internal lens preparation notes for ${item.productName}`} disabled={!draft || busy !== ''} value={draft?.notes ?? ''} onChange={(event) => setDrafts((current) => ({ ...current, [item.id]: { ...current[item.id], notes: event.target.value } }))} maxLength={1000} rows={2} placeholder="Internal preparation notes" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm" />
              </div>
              <Button type="button" className="mt-3" disabled={!draft || busy !== ''} onClick={() => void savePreparation(item)}><Save className="mr-2 h-4 w-4" />{busy === item.id ? 'Saving...' : 'Save preparation update'}</Button>
            </div>
          </section>;
        })}
        <section className="mt-6 border-t border-[var(--border-subtle)] pt-6 text-sm"><div className="flex justify-between"><span>Subtotal</span><span>{formatCurrency(details.subtotal)}</span></div><div className="mt-2 flex justify-between"><span>Discount</span><span>-{formatCurrency(details.discount)}</span></div><div className="mt-2 flex justify-between"><span>Shipping</span><span>{formatCurrency(details.shipping)}</span></div><div className="mt-3 flex justify-between border-t border-[var(--border-subtle)] pt-3 text-lg font-semibold"><span>Total</span><span>{formatCurrency(details.total)}</span></div><p className="mt-4">Payment: <strong>{details.paymentStatus}</strong> · Order: <strong>{details.status}</strong></p></section>
        <section className="mt-6 border-t border-[var(--border-subtle)] pt-6"><h3 className="font-semibold">Status timeline</h3><div className="mt-3 space-y-3">{details.history.map((entry) => <div key={`${entry.status}-${entry.createdAt}`}><p className="text-sm font-medium">{entry.status}</p><p className="text-xs text-[var(--text-secondary)]">{new Date(entry.createdAt).toLocaleString('en-IN')}</p>{entry.note ? <p className="text-xs text-[var(--text-secondary)]">{entry.note}</p> : null}</div>)}</div></section>
      </>}
    </aside>
  </div>;
}

function PrescriptionEyeDetails({ title, sph, cyl, axis, add }: { title: string; sph: number | null; cyl: number | null; axis: number | null; add: number | null }) {
  return <div className="rounded-2xl border border-[var(--border-subtle)] p-4"><h4 className="text-sm font-semibold">{title}</h4><div className="mt-3 grid grid-cols-2 gap-3 text-sm"><p>SPH: <strong>{sph ?? '—'}</strong></p><p>CYL: <strong>{cyl ?? '—'}</strong></p><p>AXIS: <strong>{axis ?? '—'}</strong></p><p>ADD: <strong>{add ?? '—'}</strong></p></div></div>;
}

export function AdminCustomersPage() {
  const request = useAdminRequest();
  const [customers, setCustomers] = useState<AdminCustomer[]>([]);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const pageSize = 25;

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const result = await request((token) => adminService.customers(token, appliedQuery, page, pageSize));
      setCustomers(result.items);
      setTotal(result.total);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load customers.');
    } finally {
      setLoading(false);
    }
  }, [appliedQuery, page, request]);

  useEffect(() => { void load(); }, [load]);

  const pageCount = Math.max(1, Math.ceil(total / pageSize));
  const submitSearch = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(0);
    setAppliedQuery(query);
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Customers" title="Registered customers" description="Browse customer accounts and order activity from the live Dream Spex database." />
    <form onSubmit={submitSearch} className="mt-6 flex flex-wrap gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
      <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email or phone" className="min-w-0 flex-1 basis-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none sm:basis-auto" />
      <Button type="submit">Search</Button>
      <Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
    </form>
    {error ? <div className="mt-4"><AdminError message={error} onRetry={() => void load()} /></div> : null}
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading customers...</p> : <div className="mt-6 overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)]">
      {customers.length ? <div className="overflow-x-auto"><table className="min-w-full text-left text-sm"><thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]"><tr>{['Name', 'Email', 'Phone', 'Joined', 'Orders', 'Status'].map((header) => <th key={header} className="whitespace-nowrap px-4 py-4 font-medium">{header}</th>)}</tr></thead><tbody>{customers.map((customer) => <tr key={customer.id} className="border-t border-[var(--border-subtle)]"><td className="max-w-[220px] break-words px-4 py-4 font-medium">{customer.displayName}</td><td className="max-w-[240px] break-all px-4 py-4 text-[var(--text-secondary)]">{customer.email ?? 'No email'}</td><td className="whitespace-nowrap px-4 py-4 text-[var(--text-secondary)]">{customer.phone ?? 'No phone'}</td><td className="whitespace-nowrap px-4 py-4 text-[var(--text-secondary)]">{new Date(customer.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</td><td className="px-4 py-4">{customer.orderCount}</td><td className="px-4 py-4"><span className="rounded-full bg-[var(--brand-green)]/12 px-3 py-1 text-xs font-medium">{customer.status}</span></td></tr>)}</tbody></table></div> : <div className="p-10 text-center"><Users className="mx-auto h-8 w-8 text-[var(--text-secondary)]" /><p className="mt-3 font-medium">No customers registered</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{appliedQuery ? 'No customers match your search.' : 'Registered customer accounts will appear here.'}</p></div>}
      {total > 0 ? <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-4 text-sm"><p className="text-[var(--text-secondary)]">Showing {page * pageSize + 1}-{Math.min((page + 1) * pageSize, total)} of {total}</p><div className="flex items-center gap-2"><Button type="button" variant="ghost" disabled={page === 0} onClick={() => setPage((current) => current - 1)}>Previous</Button><span className="text-[var(--text-secondary)]">Page {page + 1} of {pageCount}</span><Button type="button" variant="ghost" disabled={page + 1 >= pageCount} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div> : null}
    </div>}
  </DashboardShell>;
}

type LensCategory = LensOption['category'];
type LensOptionDraft = {
  code: string;
  name: string;
  category: LensCategory;
  benefits: string;
  additionalCost: string;
  preparationDays: string;
  available: boolean;
  displayOrder: string;
};

const lensCategories: Array<{ value: LensCategory; label: string }> = [
  { value: 'TYPE', label: 'Lens Types' },
  { value: 'COATING', label: 'Optional Coatings' },
  { value: 'MATERIAL', label: 'Lens Materials' },
];

const blankLensOption = (category: LensCategory): LensOptionDraft => ({
  code: '',
  name: '',
  category,
  benefits: '',
  additionalCost: '',
  preparationDays: '',
  available: true,
  displayOrder: '0',
});

const fieldClass = 'mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]';

export function AdminLensManagementPage() {
  const { user, refreshAccessToken } = useAuth();
  const [options, setOptions] = useState<LensOption[]>([]);
  const [category, setCategory] = useState<LensCategory>('TYPE');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modalOption, setModalOption] = useState<LensOption | null | undefined>(undefined);
  const [draft, setDraft] = useState<LensOptionDraft>(() => blankLensOption('TYPE'));
  const [formError, setFormError] = useState('');

  const request = useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
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

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setOptions(await request(adminService.lensOptions));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load lens options.');
    } finally {
      setLoading(false);
    }
  }, [request]);

  useEffect(() => { void load(); }, [load]);

  const visibleOptions = useMemo(() => options
    .filter((option) => option.category === category)
    .slice()
    .sort((first, second) => first.displayOrder - second.displayOrder || first.name.localeCompare(second.name)), [category, options]);

  const openCreate = () => {
    setDraft(blankLensOption(category));
    setFormError('');
    setModalOption(null);
  };

  const openEdit = (option: LensOption) => {
    setDraft({
      code: option.code,
      name: option.name,
      category: option.category,
      benefits: option.benefits,
      additionalCost: option.additionalCost == null ? '' : String(option.additionalCost),
      preparationDays: option.preparationDays == null ? '' : String(option.preparationDays),
      available: option.available,
      displayOrder: String(option.displayOrder),
    });
    setFormError('');
    setModalOption(option);
  };

  const saveOption = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError('');
    const code = draft.code.trim().toUpperCase();
    const price = Number(draft.additionalCost);
    const displayOrder = Number(draft.displayOrder);
    const preparationDays = draft.preparationDays.trim() ? Number(draft.preparationDays) : null;
    if (!/^[A-Z0-9_]{2,64}$/.test(code)) {
      setFormError('Use 2–64 uppercase letters, numbers, or underscores for the unique code.');
      return;
    }
    if (!draft.name.trim() || draft.name.trim().length > 120 || !draft.benefits.trim() || draft.benefits.trim().length > 1000) {
      setFormError('Enter a name (up to 120 characters) and description (up to 1000 characters).');
      return;
    }
    if (!Number.isFinite(price) || price < 0 || !/^\d+(\.\d{1,2})?$/.test(draft.additionalCost.trim())) {
      setFormError('Enter a non-negative price with no more than two decimal places.');
      return;
    }
    if (!Number.isInteger(displayOrder) || displayOrder < 0 || displayOrder > 10000) {
      setFormError('Display order must be a whole number between 0 and 10000.');
      return;
    }
    if (preparationDays !== null && (!Number.isInteger(preparationDays) || preparationDays < 1 || preparationDays > 365)) {
      setFormError('Preparation time must be between 1 and 365 days.');
      return;
    }
    const payload: AdminLensOptionRequest = {
      code,
      name: draft.name.trim(),
      category: draft.category,
      benefits: draft.benefits.trim(),
      additionalCost: price,
      preparationDays,
      available: draft.available,
      displayOrder,
    };
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const saved = modalOption
        ? await request((token) => adminService.updateLensOption(token, modalOption.id, payload))
        : await request((token) => adminService.createLensOption(token, payload));
      setOptions((current) => modalOption
        ? current.map((option) => option.id === saved.id ? saved : option)
        : [...current, saved]);
      setCategory(saved.category);
      setNotice(`${saved.name} ${modalOption ? 'updated' : 'created'}.`);
      setModalOption(undefined);
    } catch (reason) {
      setFormError(reason instanceof Error ? reason.message : 'Unable to save this lens option.');
    } finally {
      setSaving(false);
    }
  };

  const deleteOption = async (option: LensOption) => {
    if (!window.confirm(`Delete "${option.name}"? Customers will no longer be able to select it.`)) return;
    setDeletingId(option.id);
    setError('');
    setNotice('');
    try {
      await request((token) => adminService.deleteLensOption(token, option.id));
      setOptions((current) => current.filter((item) => item.id !== option.id));
      setNotice(`${option.name} deleted.`);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete this lens option.');
    } finally {
      setDeletingId('');
    }
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Catalogue" title="Lens management" description="Configure the live lens types, coatings and materials offered to customers." />
    <div className="mt-7 flex flex-wrap items-center justify-between gap-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Lens option categories">
        {lensCategories.map((item) => <button key={item.value} type="button" role="tab" aria-selected={category === item.value} onClick={() => setCategory(item.value)} className={`rounded-full px-4 py-2.5 text-sm font-semibold transition ${category === item.value ? 'bg-[var(--brand-green)] text-[#101810]' : 'border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'}`}>{item.label}</button>)}
      </div>
      <Button type="button" onClick={openCreate}><Plus className="mr-2 h-4 w-4" />Add option</Button>
    </div>
    {notice ? <p role="status" className="mt-4 rounded-xl border border-emerald-400/30 bg-emerald-400/10 p-4 text-sm text-emerald-200">{notice}</p> : null}
    {error ? <div className="mt-4"><AdminError message={error} onRetry={() => void load()} /></div> : null}
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading lens options...</p> : <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {visibleOptions.map((option) => <article key={option.id} className="flex flex-col rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div className="flex items-start justify-between gap-3">
          <div><p className="text-xs font-semibold tracking-wide text-[var(--brand-green-dark)]">{option.code}</p><h2 className="mt-2 text-lg font-semibold">{option.name}</h2></div>
          <span className={`rounded-full px-3 py-1 text-xs font-semibold ${option.available ? 'bg-emerald-400/10 text-emerald-200' : 'bg-slate-400/10 text-[var(--text-secondary)]'}`}>{option.available ? 'Available' : 'Unavailable'}</span>
        </div>
        <p className="mt-3 flex-1 text-sm leading-6 text-[var(--text-secondary)]">{option.benefits}</p>
        <div className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--border-subtle)] pt-4 text-sm">
          <div><p className="text-xs text-[var(--text-secondary)]">Additional price</p><p className="mt-1 font-semibold">{option.additionalCost == null ? 'Not priced' : formatINR(option.additionalCost)}</p></div>
          <div><p className="text-xs text-[var(--text-secondary)]">Display order</p><p className="mt-1 font-semibold">{option.displayOrder}</p></div>
        </div>
        {option.preparationDays ? <p className="mt-3 text-xs text-[var(--text-secondary)]">Preparation: {option.preparationDays} days</p> : null}
        <div className="mt-5 flex gap-2">
          <Button type="button" variant="secondary" className="flex-1" onClick={() => openEdit(option)}><Pencil className="mr-2 h-4 w-4" />Edit</Button>
          <Button type="button" variant="ghost" className="text-red-300" disabled={deletingId === option.id} aria-label={`Delete ${option.name}`} onClick={() => void deleteOption(option)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      </article>)}
      {!visibleOptions.length ? <div className="rounded-[24px] border border-dashed border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center md:col-span-2 xl:col-span-3"><p className="font-semibold">No options in this section</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Create a lens option to make it available in the customer prescription flow.</p></div> : null}
    </div>}
    {modalOption !== undefined ? <div className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-black/60 p-4" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) setModalOption(undefined); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="lens-option-modal-title" className="my-auto max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl sm:p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-[var(--brand-green-dark)]">Lens catalogue</p><h2 id="lens-option-modal-title" className="mt-2 text-2xl font-semibold">{modalOption ? 'Edit lens option' : 'Create lens option'}</h2></div><button type="button" aria-label="Close dialog" disabled={saving} onClick={() => setModalOption(undefined)} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]"><X className="h-5 w-5" /></button></div>
        <form className="mt-6 space-y-4" noValidate onSubmit={(event) => void saveOption(event)}>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">Name<input required maxLength={120} value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} className={fieldClass} /></label>
            <label className="text-sm font-medium">Unique code<input required maxLength={64} pattern="[A-Z0-9_]{2,64}" value={draft.code} onChange={(event) => setDraft((current) => ({ ...current, code: event.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, '_') }))} className={fieldClass} /></label>
            <label className="text-sm font-medium">Category<select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as LensCategory }))} className={fieldClass}>{lensCategories.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select></label>
            <label className="text-sm font-medium">Price (INR)<input required type="number" min="0" step="0.01" value={draft.additionalCost} onChange={(event) => setDraft((current) => ({ ...current, additionalCost: event.target.value }))} className={fieldClass} /></label>
            <label className="text-sm font-medium">Display order<input required type="number" min="0" max="10000" step="1" value={draft.displayOrder} onChange={(event) => setDraft((current) => ({ ...current, displayOrder: event.target.value }))} className={fieldClass} /></label>
            <label className="text-sm font-medium">Preparation time (days, optional)<input type="number" min="1" max="365" step="1" value={draft.preparationDays} onChange={(event) => setDraft((current) => ({ ...current, preparationDays: event.target.value }))} className={fieldClass} /></label>
          </div>
          <label className="block text-sm font-medium">Description and benefits<textarea required maxLength={1000} rows={4} value={draft.benefits} onChange={(event) => setDraft((current) => ({ ...current, benefits: event.target.value }))} className={fieldClass} /></label>
          <label className="flex items-center gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm"><input type="checkbox" checked={draft.available} onChange={(event) => setDraft((current) => ({ ...current, available: event.target.checked }))} className="h-4 w-4 accent-[#7CBF00]" />Available for customer selection</label>
          {formError ? <p role="alert" className="rounded-xl border border-red-300/30 bg-red-400/10 p-3 text-sm text-red-200">{formError}</p> : null}
          <div className="flex flex-wrap justify-end gap-3 pt-2"><Button type="button" variant="ghost" disabled={saving} onClick={() => setModalOption(undefined)}>Cancel</Button><Button type="submit" disabled={saving}>{saving ? 'Saving...' : modalOption ? 'Save changes' : 'Create option'}</Button></div>
        </form>
      </section>
    </div> : null}
  </DashboardShell>;
}
