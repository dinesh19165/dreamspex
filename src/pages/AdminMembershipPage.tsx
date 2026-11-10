import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, Pencil, Printer, RefreshCw, Save, X } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import {
  membershipService,
  type AdminMembership,
  type AdminMembershipPayment,
  type MembershipPlan,
  type MembershipPlanRequest,
} from '../services/membershipService';
import { formatINR } from '../utils/currency';
import { DashboardShell } from './FranchiseSystemPages';
import AdminDateRangeFilter from '../components/ui/AdminDateRangeFilter';
import { downloadReportExcel, downloadReportPdf, printReport } from '../utils/adminReportExport';

type MembershipPlanForm = Omit<MembershipPlanRequest, 'price' | 'durationDays' | 'discountPercentage'> & {
  price: string;
  durationDays: string;
  discountPercentage: string;
};

const emptyPlan: MembershipPlanForm = {
  name: '',
  description: '',
  price: '',
  durationDays: '',
  perks: [],
  status: 'ACTIVE',
  discountPercentage: '',
  recommended: false,
};

function shortDate(value: string) {
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium', timeZone: 'Asia/Kolkata' });
}

function reportDate(value: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(value);
}

function defaultMembershipRange() {
  const end = reportDate(new Date());
  const start = new Date(`${end}T00:00:00+05:30`);
  start.setUTCDate(start.getUTCDate() - 29);
  return { start: start.toISOString().slice(0, 10), end };
}

export default function AdminMembershipPage() {
  const { user, refreshAccessToken } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [payments, setPayments] = useState<AdminMembershipPayment[]>([]);
  const [form, setForm] = useState<MembershipPlanForm>(emptyPlan);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [membershipStatus, setMembershipStatus] = useState(() => searchParams.get('status') ?? 'ALL');
  const [membershipPlanId, setMembershipPlanId] = useState(() => searchParams.get('planId') ?? '');
  const [customerId, setCustomerId] = useState(() => searchParams.get('customerId') ?? '');
  const [customerQuery, setCustomerQuery] = useState('');
  const initialRange = useMemo(defaultMembershipRange, []);
  const [purchaseStart, setPurchaseStart] = useState(() => searchParams.get('startDate') ?? (searchParams.get('customerId') ? '' : initialRange.start));
  const [purchaseEnd, setPurchaseEnd] = useState(() => searchParams.get('endDate') ?? (searchParams.get('customerId') ? '' : initialRange.end));
  const [expiryStart, setExpiryStart] = useState('');
  const [expiryEnd, setExpiryEnd] = useState('');
  const [page, setPage] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const token = useCallback(async () => {
    const value = user?.accessToken ?? await refreshAccessToken();
    if (!value) throw new Error('Your administrator session has expired. Please sign in again.');
    return value;
  }, [refreshAccessToken, user?.accessToken]);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const accessToken = await token();
      const [nextPlans, nextMemberships, nextPayments] = await Promise.all([
        membershipService.adminPlans(accessToken),
        membershipService.adminMemberships(accessToken),
        membershipService.adminPayments(accessToken),
      ]);
      setPlans(nextPlans);
      setMemberships(nextMemberships);
      setPayments(nextPayments);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load membership administration data.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    setMembershipStatus(searchParams.get('status') ?? 'ALL');
    setMembershipPlanId(searchParams.get('planId') ?? '');
    const nextCustomerId = searchParams.get('customerId') ?? '';
    setCustomerId(nextCustomerId);
    setPurchaseStart(searchParams.get('startDate') ?? (nextCustomerId ? '' : initialRange.start));
    setPurchaseEnd(searchParams.get('endDate') ?? (nextCustomerId ? '' : initialRange.end));
  }, [initialRange.end, initialRange.start, searchParams]);

  const editPlan = (plan: MembershipPlan) => {
    setEditingId(plan.id);
    setForm({
      name: plan.name,
      description: plan.description,
      price: String(plan.price),
      durationDays: String(plan.durationDays),
      perks: plan.perks,
      status: plan.status,
      discountPercentage: plan.discountPercentage == null ? '' : String(plan.discountPercentage),
      recommended: plan.recommended,
    });
    setNotice('');
  };

  const save = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await membershipService.savePlan(await token(), {
        ...form,
        price: Number(form.price),
        durationDays: Number(form.durationDays),
        discountPercentage: Number(form.discountPercentage),
        perks: form.perks.map((perk) => perk.trim()).filter(Boolean),
      }, editingId);
      setForm(emptyPlan);
      setEditingId(undefined);
      setNotice('Membership plan saved.');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save membership plan.');
    } finally {
      setSaving(false);
    }
  };

  const updateForm = <K extends keyof MembershipPlanForm>(key: K, value: MembershipPlanForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const visibleMemberships = memberships.filter((membership) => {
    const query = customerQuery.trim().toLowerCase();
    const purchaseDate = membership.purchasedAt.slice(0, 10);
    const expiryDate = membership.expiresAt.slice(0, 10);
    return (!customerId || membership.customerId === customerId)
      && (!query || [membership.customerName, membership.customerEmail, membership.customerPhone].some((value) => value?.toLowerCase().includes(query)))
      && (!purchaseStart || purchaseDate >= purchaseStart)
      && (!purchaseEnd || purchaseDate <= purchaseEnd)
      && (!expiryStart || expiryDate >= expiryStart)
      && (!expiryEnd || expiryDate <= expiryEnd)
      && (membershipStatus === 'ALL' || membership.status === membershipStatus)
      && (!membershipPlanId || membership.planId === membershipPlanId);
  });
  const membershipRows = visibleMemberships.map((membership) => {
    const remainingDays = Math.max(0, Math.ceil((new Date(membership.expiresAt).getTime() - Date.now()) / 86_400_000));
    return [
      membership.customerName ?? 'Customer',
      membership.customerEmail ?? '',
      membership.customerPhone ?? '',
      membership.planName,
      membership.planPrice,
      membership.discountPercentage ?? 0,
      membership.purchasedAt.slice(0, 10),
      membership.startsAt.slice(0, 10),
      membership.expiresAt.slice(0, 10),
      remainingDays,
      membership.status,
      membership.paymentStatus,
      membership.paymentReference ?? '',
    ];
  });
  const membershipReport = {
    title: 'Customer memberships',
    startDate: purchaseStart,
    endDate: purchaseEnd,
    columns: [
      { label: 'Customer name' }, { label: 'Email' }, { label: 'Phone' }, { label: 'Membership plan' },
      { label: 'Membership price', type: 'currency' as const }, { label: 'Discount percentage', type: 'number' as const },
      { label: 'Purchase date', type: 'date' as const }, { label: 'Activation date', type: 'date' as const },
      { label: 'Expiry date', type: 'date' as const }, { label: 'Remaining validity days', type: 'number' as const },
      { label: 'Membership status' }, { label: 'Payment status' }, { label: 'Payment reference' },
    ],
    rows: membershipRows,
    summary: [
      { label: 'Matching memberships', value: visibleMemberships.length },
      { label: 'Active memberships', value: visibleMemberships.filter((item) => item.status === 'ACTIVE').length },
      { label: 'Membership revenue', value: formatINR(visibleMemberships.reduce((sum, item) => sum + item.planPrice, 0)) },
    ],
  };
  const updateMembershipFilters = (status: string, planId: string) => {
    const next = new URLSearchParams(searchParams);
    if (status && status !== 'ALL') next.set('status', status);
    else next.delete('status');
    if (planId) next.set('planId', planId);
    else next.delete('planId');
    setSearchParams(next);
  };
  const membershipMetrics = [
    { label: 'Total plans', value: plans.length, to: '/admin/membership' },
    { label: 'Active memberships', value: memberships.filter((item) => item.status === 'ACTIVE').length, to: '/admin/membership?status=ACTIVE' },
    { label: 'Expired memberships', value: memberships.filter((item) => item.status === 'EXPIRED').length, to: '/admin/membership?status=EXPIRED' },
    { label: 'Pending memberships', value: memberships.filter((item) => item.status === 'PENDING').length, to: '/admin/membership?status=PENDING' },
    { label: 'Membership payments', value: payments.length, to: '/admin/membership#membership-payments' },
  ];

  return (
    <DashboardShell>
      <SectionTitle eyebrow="SUPER ADMIN" title="Membership management" description="Configure plans and review customer memberships and payment status." />
      {error ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-400/10 p-4 text-sm text-red-600" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 font-semibold"><RefreshCw className="h-4 w-4" />Retry</button></div> : null}
      {notice ? <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-700" role="status">{notice}</p> : null}
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {membershipMetrics.map((metric) => <Link key={metric.label} to={metric.to} className="group rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand-green)]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
          <p className="text-xs font-medium text-[var(--text-secondary)]">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{loading ? '—' : metric.value.toLocaleString('en-IN')}</p><span className="mt-2 block text-[11px] font-medium text-[var(--brand-green-dark)]">View details →</span>
        </Link>)}
      </div>

      <div className="mt-8 grid gap-6 xl:grid-cols-[0.85fr_1.15fr]">
        <form onSubmit={(event) => void save(event)} className="h-fit rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">{editingId ? 'Edit membership plan' : 'Create membership plan'}</h2><button type="button" onClick={() => { setForm(emptyPlan); setEditingId(undefined); }} aria-label="Clear membership plan form" className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]"><X className="h-4 w-4" /></button></div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm">Plan name<input required maxLength={120} value={form.name} onChange={(event) => updateForm('name', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm">Price (INR)<input required type="number" min="0" step="0.01" value={form.price} onChange={(event) => updateForm('price', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm">Validity (days)<input required type="number" min="1" max="3650" value={form.durationDays} onChange={(event) => updateForm('durationDays', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm">Product discount (%)<input required type="number" min="0" max="100" step="0.01" value={form.discountPercentage} onChange={(event) => updateForm('discountPercentage', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm sm:col-span-2">Description<textarea required maxLength={1000} value={form.description} onChange={(event) => updateForm('description', event.target.value)} rows={2} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm sm:col-span-2">Benefits and privileges (one per line)<textarea value={form.perks.join('\n')} onChange={(event) => updateForm('perks', event.target.value.split('\n'))} rows={4} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5" /></label>
            <label className="text-sm">Status<select value={form.status} onChange={(event) => updateForm('status', event.target.value)} className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5"><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
            <label className="flex items-center gap-2 self-end pb-3 text-sm"><input type="checkbox" checked={form.recommended} onChange={(event) => updateForm('recommended', event.target.checked)} />Mark as recommended</label>
          </div>
          <Button type="submit" fullWidth className="mt-5" disabled={saving}>{saving ? 'Saving...' : <><Save className="mr-2 h-4 w-4" />{editingId ? 'Save changes' : 'Create plan'}</>}</Button>
        </form>

        <section className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3"><h2 className="text-xl font-semibold">Configured plans</h2><button type="button" onClick={() => void load()} className="rounded-full p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)]" aria-label="Refresh membership data"><RefreshCw className="h-4 w-4" /></button></div>
          {loading ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading plans...</p> : plans.length ? <div className="mt-4 divide-y divide-[var(--border-subtle)]">{plans.map((plan) => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-semibold">{plan.name}{plan.recommended ? <span className="ml-2 text-xs text-cyan-300">Recommended</span> : null}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatINR(plan.price)} · {plan.durationDays} days · {plan.discountPercentage == null ? 'Discount not configured' : `${plan.discountPercentage}%`} · {plan.status}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{plan.perks.length ? plan.perks.join(' · ') : 'Benefits not configured'}</p><Link to={`/admin/membership?planId=${encodeURIComponent(plan.id)}`} className="mt-2 inline-flex rounded-sm text-xs font-medium text-[var(--brand-green-dark)] underline-offset-2 hover:underline">View members ({memberships.filter((membership) => membership.planId === plan.id).length})</Link></div><button type="button" onClick={() => editPlan(plan)} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm"><Pencil className="h-4 w-4" />Edit</button></div>)}</div> : <p className="mt-5 rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">No membership plans are configured. Create plans using approved business pricing and benefit details.</p>}
        </section>
      </div>

      <section className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="mt-4 flex flex-wrap items-end justify-between gap-3">
          <div className="flex flex-wrap items-end gap-3">
            <label className="text-xs text-[var(--text-secondary)]">Search customer<input value={customerQuery} onChange={(event) => { setCustomerQuery(event.target.value); setPage(0); }} placeholder="Name, email or phone" className="mt-1 h-10 w-56 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
            <label className="text-xs text-[var(--text-secondary)]">Plan<select value={membershipPlanId} onChange={(event) => { setMembershipPlanId(event.target.value); updateMembershipFilters(membershipStatus, event.target.value); setPage(0); }} className="mt-1 h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm"><option value="">All plans</option>{plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name}</option>)}</select></label>
            <label className="text-xs text-[var(--text-secondary)]">Status<select value={membershipStatus} onChange={(event) => { setMembershipStatus(event.target.value); updateMembershipFilters(event.target.value, membershipPlanId); setPage(0); }} className="mt-1 h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm"><option value="ALL">All statuses</option>{['ACTIVE', 'EXPIRED', 'CANCELLED', 'PENDING'].map((value) => <option key={value}>{value}</option>)}</select></label>
            <AdminDateRangeFilter key={customerId || 'all-memberships'} startDate={purchaseStart} endDate={purchaseEnd} onApply={(from, to) => { setPurchaseStart(from); setPurchaseEnd(to); setPage(0); const next = new URLSearchParams(searchParams); if (from) next.set('startDate', from); else next.delete('startDate'); if (to) next.set('endDate', to); else next.delete('endDate'); setSearchParams(next, { replace: true }); }} />
            <label className="text-xs text-[var(--text-secondary)]">Expiry from<input type="date" value={expiryStart} onChange={(event) => setExpiryStart(event.target.value)} className="mt-1 h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
            <label className="text-xs text-[var(--text-secondary)]">Expiry to<input type="date" value={expiryEnd} min={expiryStart} onChange={(event) => setExpiryEnd(event.target.value)} className="mt-1 h-10 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-sm" /></label>
          </div>
          <div className="flex gap-2"><Button type="button" variant="secondary" onClick={() => downloadReportExcel(membershipReport)}><Download className="mr-2 h-4 w-4" />Excel</Button><Button type="button" variant="secondary" onClick={() => void downloadReportPdf(membershipReport)}>PDF</Button><Button type="button" variant="secondary" onClick={() => printReport(membershipReport)}><Printer className="mr-2 h-4 w-4" />Print</Button></div>
        </div>
        {customerId ? <button type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('customerId'); setSearchParams(next); }} className="mt-2 text-xs underline">Clear customer history filter</button> : null}
        {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading memberships...</p> : visibleMemberships.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[1400px] text-left text-sm"><thead className="text-[var(--text-secondary)]"><tr>{membershipReport.columns.map((column) => <th key={column.label} className="p-3">{column.label}</th>)}</tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{visibleMemberships.slice(page * 25, (page + 1) * 25).map((membership, index) => <tr key={membership.id}><td className="p-3"><Link to={`/admin/membership?customerId=${encodeURIComponent(membership.customerId)}`} className="font-medium underline-offset-2 hover:underline">{membership.customerName ?? 'Customer'}</Link></td><td className="p-3">{membership.customerEmail ?? '—'}</td><td className="p-3">{membership.customerPhone ?? '—'}</td><td className="p-3">{membership.planName}</td><td className="p-3">{formatINR(membership.planPrice)}</td><td className="p-3">{membership.discountPercentage ?? 0}%</td><td className="p-3">{shortDate(membership.purchasedAt)}</td><td className="p-3">{shortDate(membership.startsAt)}</td><td className="p-3">{shortDate(membership.expiresAt)}</td><td className="p-3">{membershipRows[page * 25 + index][9]}</td><td className="p-3">{membership.status}</td><td className="p-3">{membership.paymentStatus}</td><td className="p-3">{membership.paymentReference ?? '—'}</td></tr>)}</tbody></table><div className="flex items-center justify-between border-t border-[var(--border-subtle)] p-3 text-sm"><span>{visibleMemberships.length} memberships · Page {page + 1} of {Math.max(1, Math.ceil(visibleMemberships.length / 25))}</span><div className="flex gap-2"><Button type="button" variant="ghost" disabled={!page} onClick={() => setPage((current) => current - 1)}>Previous</Button><Button type="button" variant="ghost" disabled={(page + 1) * 25 >= visibleMemberships.length} onClick={() => setPage((current) => current + 1)}>Next</Button></div></div></div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">No memberships match these filters.</p>}
      </section>

      <section id="membership-payments" className="mt-10 scroll-mt-24 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xl font-semibold">Membership payment history</h2>
        {payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[var(--text-secondary)]"><tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Provider</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{payments.map((payment) => <tr key={payment.id}><td className="p-3">{payment.customerName ?? payment.customerEmail ?? payment.customerId}</td><td className="p-3">{payment.planName}</td><td className="p-3">{payment.provider}</td><td className="p-3">{formatINR(payment.amount)}</td><td className="p-3">{payment.status}</td><td className="p-3">{shortDate(payment.createdAt)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">No membership payments have been recorded.</p>}
      </section>
    </DashboardShell>
  );
}
