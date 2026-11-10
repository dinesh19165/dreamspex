import { useCallback, useEffect, useState } from 'react';
import { RefreshCw, Save, Search } from 'lucide-react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import { useAuth } from '../context/useAuth';
import { loyaltyService, LoyaltyApiError, type LoyaltyReport, type ProgramSettings } from '../services/loyaltyService';
import { formatINR } from '../utils/currency';
import { DashboardShell } from './FranchiseSystemPages';

function useLoyaltyAdminRequest() {
  const { user, refreshAccessToken } = useAuth();
  const accessToken = user?.accessToken;
  const isAuthenticated = Boolean(user);
  return useCallback(async <T,>(operation: (token: string) => Promise<T>) => {
    if (!isAuthenticated) throw new Error('Your admin session has expired. Please sign in again.');
    const token = accessToken ?? await refreshAccessToken();
    if (!token) throw new Error('Your admin session has expired. Please sign in again.');
    try { return await operation(token); }
    catch (reason) {
      if (!(reason instanceof LoyaltyApiError) || reason.status !== 401) throw reason;
      const refreshed = await refreshAccessToken(token);
      if (!refreshed) throw new Error('Your admin session has expired. Please sign in again.');
      return operation(refreshed);
    }
  }, [accessToken, isAuthenticated, refreshAccessToken]);
}

function Field({ label, value, onChange, type = 'number', min = 0, step = 1 }:
  { label: string; value: string | number; onChange: (value: string) => void; type?: string; min?: number; step?: number }) {
  return <label className="block text-sm text-[var(--text-secondary)]">
    <span>{label}</span>
    <input type={type} min={min} step={step} value={value}
      onChange={(event) => onChange(event.target.value)}
      className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]" />
  </label>;
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm">
    <span>{label}</span><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)}
      className="h-5 w-5 accent-[#7CBF00]" />
  </label>;
}

export function AdminLoyaltySettingsPage() {
  const request = useLoyaltyAdminRequest();
  const [form, setForm] = useState<ProgramSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try { setForm(await request(loyaltyService.adminSettings)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load program settings.'); }
    finally { setLoading(false); }
  }, [request]);
  useEffect(() => { void load(); }, [load]);

  const setLoyalty = <K extends keyof ProgramSettings['loyalty']>(key: K, value: ProgramSettings['loyalty'][K]) =>
    setForm((current) => current ? { ...current, loyalty: { ...current.loyalty, [key]: value } } : current);
  const setReferral = <K extends keyof ProgramSettings['referral']>(key: K, value: ProgramSettings['referral'][K]) =>
    setForm((current) => current ? { ...current, referral: { ...current.referral, [key]: value } } : current);
  const numberSetter = (setter: (value: number) => void) => (value: string) => {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) setter(parsed);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      setForm(await request((token) => loyaltyService.updateAdminSettings(token, form)));
      setNotice('Loyalty and referral settings saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Growth · rewards" title="Loyalty & referral settings"
      description="Control how customers earn, redeem, and share rewards. Changes are saved to the backend." />
    {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]" role="status">Loading program settings...</p>
      : !form ? <div className="mt-8 rounded-2xl border border-rose-300/30 bg-rose-400/10 p-5 text-sm text-rose-200" role="alert">
        <p>{error || 'Program settings are unavailable.'}</p><Button type="button" variant="ghost" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
      </div> : <form onSubmit={save} className="mt-8 space-y-6">
        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-300">Loyalty program</p><h2 className="mt-2 text-2xl font-semibold">Points and redemption rules</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle label="Enable loyalty program" checked={form.loyalty.enabled} onChange={(value) => setLoyalty('enabled', value)} />
            <Toggle label="Award points for product purchases" checked={form.loyalty.productPurchasePointsEnabled} onChange={(value) => setLoyalty('productPurchasePointsEnabled', value)} />
            <Field label="Points earned per ₹100 spent" value={form.loyalty.pointsPerHundred} onChange={numberSetter((value) => setLoyalty('pointsPerHundred', Math.floor(value)))} />
            <Field label="Minimum eligible order amount (₹)" value={form.loyalty.minimumOrderAmount} step={0.01} onChange={numberSetter((value) => setLoyalty('minimumOrderAmount', value))} />
            <Field label="Minimum points per redemption" value={form.loyalty.minimumRedemptionPoints} onChange={numberSetter((value) => setLoyalty('minimumRedemptionPoints', Math.floor(value)))} />
            <Field label="Points in conversion rate" value={form.loyalty.redemptionPoints} min={1} onChange={numberSetter((value) => setLoyalty('redemptionPoints', Math.floor(value)))} />
            <Field label="Discount value for conversion rate (₹)" value={form.loyalty.redemptionAmount} min={0.01} step={0.01} onChange={numberSetter((value) => setLoyalty('redemptionAmount', value))} />
            <Field label="Maximum order payable with points (%)" value={form.loyalty.maximumRedemptionPercent} min={0} step={0.01} onChange={numberSetter((value) => setLoyalty('maximumRedemptionPercent', value))} />
            <Field label="Points expiry period (days)" value={form.loyalty.pointsExpiryDays} min={1} onChange={numberSetter((value) => setLoyalty('pointsExpiryDays', Math.floor(value)))} />
          </div>
        </section>

        <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
          <div className="mb-6"><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Refer & earn</p><h2 className="mt-2 text-2xl font-semibold">Referral qualification rules</h2></div>
          <div className="grid gap-4 md:grid-cols-2">
            <Toggle label="Enable referral program" checked={form.referral.enabled} onChange={(value) => setReferral('enabled', value)} />
            <label className="block text-sm text-[var(--text-secondary)]"><span>Reward type</span>
              <select value={form.referral.rewardType} onChange={(event) => setReferral('rewardType', event.target.value as ProgramSettings['referral']['rewardType'])}
                className="mt-2 w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]">
                <option value="WALLET_CREDIT">Wallet credit</option><option value="LOYALTY_POINTS">Loyalty points</option>
              </select>
            </label>
            <Field label={`Referrer reward (${form.referral.rewardType === 'WALLET_CREDIT' ? '₹' : 'points'})`} value={form.referral.referrerRewardAmount} onChange={numberSetter((value) => setReferral('referrerRewardAmount', Math.floor(value)))} />
            <Field label={`New customer reward (${form.referral.rewardType === 'WALLET_CREDIT' ? '₹' : 'points'})`} value={form.referral.newCustomerRewardAmount} onChange={numberSetter((value) => setReferral('newCustomerRewardAmount', Math.floor(value)))} />
            <Field label="Minimum qualifying purchase (₹)" value={form.referral.minimumPurchaseAmount} step={0.01} onChange={numberSetter((value) => setReferral('minimumPurchaseAmount', value))} />
            <Field label="Reward expiry period (days)" value={form.referral.rewardExpiryDays} min={1} onChange={numberSetter((value) => setReferral('rewardExpiryDays', Math.floor(value)))} />
            <Field label="Maximum successful referrals per customer" value={form.referral.maximumRewardsPerCustomer} min={1} onChange={numberSetter((value) => setReferral('maximumRewardsPerCustomer', Math.floor(value)))} />
          </div>
          <p className="mt-5 text-xs leading-6 text-[var(--text-secondary)]">Both rewards are issued once, only after the referred customer’s first qualifying order is paid and delivered. Self-referrals and duplicate accounts are rejected.</p>
        </section>
        {error ? <p className="rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">{error}</p> : null}
        {notice ? <p className="rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200" role="status">{notice}</p> : null}
        <div className="flex flex-wrap gap-3"><Button type="submit" disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Saving...' : 'Save settings'}</Button>
          <Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Discard changes</Button>
          <Link to="/admin/loyalty" className="inline-flex items-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold">View reports</Link>
        </div>
      </form>}
  </DashboardShell>;
}

export function AdminLoyaltyReportsPage() {
  const request = useLoyaltyAdminRequest();
  const [report, setReport] = useState<LoyaltyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [customerHistory, setCustomerHistory] = useState<Awaited<ReturnType<typeof loyaltyService.customerHistory>> | null>(null);
  const [customerLoading, setCustomerLoading] = useState(false);
  const [customerError, setCustomerError] = useState('');
  const [adjustmentPoints, setAdjustmentPoints] = useState('');
  const [adjustmentReason, setAdjustmentReason] = useState('');
  const [adjustmentSaving, setAdjustmentSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      setReport(await request((token) => loyaltyService.adminReport(token, {
        search, status, fromDate, toDate, page: 0, pageSize: 50,
      })));
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load reward reports.'); }
    finally { setLoading(false); }
  }, [fromDate, request, search, status, toDate]);
  useEffect(() => { void load(); }, [load]);

  const loadCustomerHistory = async (customerId: string) => {
    setCustomerLoading(true);
    setCustomerError('');
    try { setCustomerHistory(await request((token) => loyaltyService.customerHistory(token, customerId))); }
    catch (reason) { setCustomerError(reason instanceof Error ? reason.message : 'Unable to load customer rewards.'); }
    finally { setCustomerLoading(false); }
  };

  const submitAdjustment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!customerHistory || !adjustmentPoints || !adjustmentReason.trim()) return;
    setAdjustmentSaving(true);
    setCustomerError('');
    try {
      await request((token) => loyaltyService.adjustPoints(token, customerHistory.customerId,
        Number(adjustmentPoints), adjustmentReason.trim()));
      setAdjustmentPoints('');
      setAdjustmentReason('');
      await loadCustomerHistory(customerHistory.customerId);
      await load();
    } catch (reason) { setCustomerError(reason instanceof Error ? reason.message : 'Unable to adjust customer points.'); }
    finally { setAdjustmentSaving(false); }
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Growth · rewards" title="Loyalty & referral reports"
      description="Review issued and redeemed points, outstanding liability, and referral qualification activity." />
    <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {[
        ['Points issued', report?.totalPointsIssued.toLocaleString('en-IN') ?? '—'],
        ['Points redeemed', report?.totalPointsRedeemed.toLocaleString('en-IN') ?? '—'],
        ['Outstanding points', report?.outstandingPoints.toLocaleString('en-IN') ?? '—'],
        ['Outstanding liability', report ? formatINR(report.outstandingLiability) : '—'],
        ['All referrals', report?.totalReferrals.toLocaleString('en-IN') ?? '—'],
        ['Successful', report?.successfulReferrals.toLocaleString('en-IN') ?? '—'],
        ['Pending', report?.pendingReferrals.toLocaleString('en-IN') ?? '—'],
        ['Wallet referral rewards', report ? formatINR(report.totalWalletReferralRewardsIssued) : '—'],
        ['Referral points issued', report?.totalPointReferralRewardsIssued.toLocaleString('en-IN') ?? '—'],
      ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <p className="text-xs uppercase tracking-wide text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-2xl font-semibold">{value}</p>
      </div>)}
    </div>
    <section className="mt-7 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
      <div className="grid gap-3 md:grid-cols-[1.4fr_1fr_1fr_1fr_auto]">
        <label className="relative"><span className="sr-only">Search customers</span><Search className="absolute left-3 top-3.5 h-4 w-4 text-[var(--text-secondary)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search customer" className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] py-3 pl-10 pr-3 text-sm" /></label>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm">
          <option value="">All statuses</option><option value="PENDING">Pending referrals</option><option value="SUCCESSFUL">Successful referrals</option><option value="LIMIT_REACHED">Limit reached</option><option value="REDEMPTION">Points redeemed</option><option value="ORDER_EARN">Points earned</option>
        </select>
        <input aria-label="Start date" type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm" />
        <input aria-label="End date" type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-3 text-sm" />
        <Button type="button" variant="ghost" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Refresh</Button>
      </div>
    </section>
    {error ? <p className="mt-5 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">{error}</p> : null}
    {loading ? <p className="mt-6 text-sm text-[var(--text-secondary)]" role="status">Loading reports...</p> : report ? <>
      <section className="mt-7 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xl font-semibold">Customer reward transactions</h2>
        {report.transactions.length === 0 ? <p className="mt-5 text-sm text-[var(--text-secondary)]">No transactions match these filters.</p>
          : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]"><tr><th className="pb-3">Customer</th><th className="pb-3">Type</th><th className="pb-3">Points</th><th className="pb-3">Value</th><th className="pb-3">Date</th></tr></thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">{report.transactions.map((transaction) => <tr key={transaction.id}>
              <td className="py-4"><div className="flex items-center gap-3"><span>{transaction.customerName || transaction.userId}</span>
                <button type="button" onClick={() => void loadCustomerHistory(transaction.userId)} className="text-xs font-semibold text-cyan-300 underline">View history</button>
              </div></td>
              <td className="py-4">{transaction.type.replaceAll('_', ' ')}</td>
              <td className={`py-4 font-semibold ${transaction.points < 0 ? 'text-rose-300' : 'text-emerald-300'}`}>{transaction.points > 0 ? '+' : ''}{transaction.points}</td>
              <td className="py-4">{transaction.amount ? formatINR(transaction.amount) : '—'}</td>
              <td className="py-4 text-[var(--text-secondary)]">{new Date(transaction.createdAt).toLocaleString('en-IN')}</td>
            </tr>)}</tbody>
          </table></div>}
        {customerLoading ? <p className="mt-5 text-sm text-[var(--text-secondary)]" role="status">Loading customer history...</p> : null}
        {customerError ? <p className="mt-5 text-sm text-rose-300" role="alert">{customerError}</p> : null}
        {customerHistory ? <div className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5">
          <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-wide text-cyan-300">Customer reward history</p>
            <h3 className="mt-2 text-lg font-semibold">{customerHistory.displayName}</h3>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{customerHistory.email ?? customerHistory.phone ?? customerHistory.customerId}</p></div>
            <button type="button" onClick={() => setCustomerHistory(null)} className="text-sm text-[var(--text-secondary)]">Close</button>
          </div>
          <div className="mt-4 max-h-64 overflow-auto divide-y divide-[var(--border-subtle)]">
            {customerHistory.transactions.length ? customerHistory.transactions.map((transaction) => <div key={transaction.id} className="flex flex-wrap justify-between gap-3 py-3 text-sm">
              <span>{transaction.description} · {new Date(transaction.createdAt).toLocaleDateString('en-IN')}</span>
              <strong className={transaction.points < 0 ? 'text-rose-300' : 'text-emerald-300'}>{transaction.points > 0 ? '+' : ''}{transaction.points} pts</strong>
            </div>) : <p className="py-4 text-sm text-[var(--text-secondary)]">No loyalty transactions.</p>}
          </div>
          <form onSubmit={submitAdjustment} className="mt-5 grid gap-3 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-[.4fr_1fr_auto]">
            <input type="number" min={1} max={1000000} step={1} required value={adjustmentPoints}
              onChange={(event) => setAdjustmentPoints(event.target.value)} placeholder="Points to credit"
              className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm" />
            <input required maxLength={255} value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)}
              placeholder="Audit reason" className="rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm" />
            <Button type="submit" disabled={adjustmentSaving || !adjustmentReason.trim()}>{adjustmentSaving ? 'Saving...' : 'Credit points'}</Button>
          </form>
        </div> : null}
      </section>
      <section className="mt-7 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-xl font-semibold">Referral history</h2>
        {report.referrals.length === 0 ? <p className="mt-5 text-sm text-[var(--text-secondary)]">No referrals match these filters.</p>
          : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]"><tr><th className="pb-3">Referrer</th><th className="pb-3">New customer</th><th className="pb-3">Reward type</th><th className="pb-3">Status</th><th className="pb-3">Created</th></tr></thead>
            <tbody className="divide-y divide-[var(--border-subtle)]">{report.referrals.map((referral) => <tr key={referral.id}>
              <td className="py-4">{referral.referrerName}</td><td className="py-4">{referral.referredName}</td>
              <td className="py-4">{referral.rewardType ?? 'Pending'}</td>
              <td className="py-4"><span className="rounded-full bg-[var(--bg-secondary)] px-3 py-1 text-xs">{referral.status.replaceAll('_', ' ')}</span></td>
              <td className="py-4 text-[var(--text-secondary)]">{new Date(referral.createdAt).toLocaleDateString('en-IN')}</td>
            </tr>)}</tbody>
          </table></div>}
      </section>
    </> : null}
  </DashboardShell>;
}
