import { useCallback, useEffect, useState } from 'react';
import { Pencil, RefreshCw, Save, X } from 'lucide-react';
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
  return new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' });
}

export default function AdminMembershipPage() {
  const { user, refreshAccessToken } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [memberships, setMemberships] = useState<AdminMembership[]>([]);
  const [payments, setPayments] = useState<AdminMembershipPayment[]>([]);
  const [form, setForm] = useState<MembershipPlanForm>(emptyPlan);
  const [editingId, setEditingId] = useState<string | undefined>();
  const [membershipStatus, setMembershipStatus] = useState('ALL');
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

  const visibleMemberships = memberships.filter((membership) =>
    membershipStatus === 'ALL' || membership.status === membershipStatus);

  return (
    <DashboardShell>
      <SectionTitle eyebrow="SUPER ADMIN" title="Membership management" description="Configure plans and review customer memberships and payment status." />
      {error ? <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-red-400/10 p-4 text-sm text-red-600" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} className="inline-flex items-center gap-2 font-semibold"><RefreshCw className="h-4 w-4" />Retry</button></div> : null}
      {notice ? <p className="mt-5 rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-700" role="status">{notice}</p> : null}

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
          {loading ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading plans...</p> : plans.length ? <div className="mt-4 divide-y divide-[var(--border-subtle)]">{plans.map((plan) => <div key={plan.id} className="flex flex-wrap items-center justify-between gap-4 py-4"><div><p className="font-semibold">{plan.name}{plan.recommended ? <span className="ml-2 text-xs text-cyan-300">Recommended</span> : null}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{formatINR(plan.price)} · {plan.durationDays} days · {plan.discountPercentage == null ? 'Discount not configured' : `${plan.discountPercentage}%`} · {plan.status}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{plan.perks.length ? plan.perks.join(' · ') : 'Benefits not configured'}</p></div><button type="button" onClick={() => editPlan(plan)} className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm"><Pencil className="h-4 w-4" />Edit</button></div>)}</div> : <p className="mt-5 rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">No membership plans are configured. Create plans using approved business pricing and benefit details.</p>}
        </section>
      </div>

      <section className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold">Customer memberships</h2><select value={membershipStatus} onChange={(event) => setMembershipStatus(event.target.value)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm"><option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="EXPIRED">Expired</option><option value="PENDING">Pending</option></select></div>
        {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]">Loading memberships...</p> : visibleMemberships.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[var(--text-secondary)]"><tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Status</th><th className="p-3">Purchase date</th><th className="p-3">Expiry</th></tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{visibleMemberships.map((membership) => <tr key={membership.id}><td className="p-3"><p>{membership.customerName ?? 'Customer'}</p><p className="text-xs text-[var(--text-secondary)]">{membership.customerEmail ?? membership.customerId}</p></td><td className="p-3">{membership.planName}</td><td className="p-3">{membership.status}</td><td className="p-3">{shortDate(membership.purchasedAt)}</td><td className="p-3">{shortDate(membership.expiresAt)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">No memberships match this status.</p>}
      </section>

      <section className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xl font-semibold">Membership payment history</h2>
        {payments.length ? <div className="mt-4 overflow-x-auto"><table className="w-full min-w-[700px] text-left text-sm"><thead className="text-[var(--text-secondary)]"><tr><th className="p-3">Customer</th><th className="p-3">Plan</th><th className="p-3">Provider</th><th className="p-3">Amount</th><th className="p-3">Status</th><th className="p-3">Date</th></tr></thead><tbody className="divide-y divide-[var(--border-subtle)]">{payments.map((payment) => <tr key={payment.id}><td className="p-3">{payment.customerName ?? payment.customerEmail ?? payment.customerId}</td><td className="p-3">{payment.planName}</td><td className="p-3">{payment.provider}</td><td className="p-3">{formatINR(payment.amount)}</td><td className="p-3">{payment.status}</td><td className="p-3">{shortDate(payment.createdAt)}</td></tr>)}</tbody></table></div> : <p className="mt-4 text-sm text-[var(--text-secondary)]">No membership payments have been recorded.</p>}
      </section>
    </DashboardShell>
  );
}
