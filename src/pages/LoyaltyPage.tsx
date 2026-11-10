import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, Award, Clock3, Gift, RefreshCw, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import { loyaltyService, type LoyaltyDashboard } from '../services/loyaltyService';
import { formatINR } from '../utils/currency';

const dateLabel = (value: string | null) => value
  ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' }) : 'No points expiring soon';

export default function LoyaltyPage() {
  const { user, refreshSession } = useAuth();
  const [dashboard, setDashboard] = useState<LoyaltyDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      setDashboard(await loyaltyService.dashboard(user.accessToken));
    } catch (reason) {
      if (reason instanceof Error && 'status' in reason && reason.status === 401 && await refreshSession()) {
        const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        if (stored.accessToken) {
          try { setDashboard(await loyaltyService.dashboard(stored.accessToken)); }
          catch (retryReason) { setError(retryReason instanceof Error ? retryReason.message : 'Unable to load your rewards.'); }
        } else setError('Your session has expired. Please sign in again.');
      } else setError(reason instanceof Error ? reason.message : 'Unable to load your rewards.');
    } finally { setLoading(false); }
  }, [refreshSession, user?.accessToken]);

  useEffect(() => { void load(); }, [load]);

  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="Loyalty & rewards" title="Every purchase brings you closer"
        description="Earn points on delivered purchases and use them for a discount at checkout." />
      {loading ? <div className="mt-10 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-secondary)]" role="status">Loading your loyalty summary...</div>
        : error ? <div className="mt-10 rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200" role="alert">
          <p>{error}</p><Button type="button" variant="ghost" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
        </div> : dashboard ? <>
          <section className="mt-10 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-[28px] border border-emerald-400/30 bg-emerald-400/10 p-7 md:col-span-2">
              <div className="flex items-start justify-between"><div><p className="text-sm uppercase tracking-[0.24em] text-emerald-300">Available points</p>
                <p className="mt-4 text-5xl font-semibold">{dashboard.availablePoints.toLocaleString('en-IN')}</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Earn {dashboard.settings.pointsPerHundred} points per ₹100 spent on eligible delivered orders.</p>
              </div><Award className="h-9 w-9 text-emerald-300" /></div>
              <Link to="/checkout" className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-emerald-300">Shop and redeem <ArrowRight className="h-4 w-4" /></Link>
            </div>
            {([
              ['Total earned', dashboard.totalEarned.toLocaleString('en-IN'), Sparkles],
              ['Points redeemed', dashboard.totalRedeemed.toLocaleString('en-IN'), Gift],
            ] as Array<[string, string, typeof Gift]>).map(([label, value, RewardIcon]) => {
              return <div key={String(label)} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
                <RewardIcon className="h-6 w-6 text-cyan-300" /><p className="mt-6 text-sm text-[var(--text-secondary)]">{label}</p>
                <p className="mt-2 text-3xl font-semibold">{value}</p>
              </div>;
            })}
            <div className="rounded-[28px] border border-amber-300/30 bg-amber-300/10 p-7">
              <Clock3 className="h-6 w-6 text-amber-300" /><p className="mt-6 text-sm text-[var(--text-secondary)]">Expiring in 30 days</p>
              <p className="mt-2 text-3xl font-semibold">{dashboard.expiringPoints.toLocaleString('en-IN')} pts</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{dateLabel(dashboard.nextExpiry)}</p>
            </div>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
            <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Redemption guide</p>
              <h2 className="mt-3 text-2xl font-semibold">Use points at checkout</h2>
              <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">
                {dashboard.settings.redemptionPoints} points are worth {formatINR(dashboard.settings.redemptionAmount)}.
                You can redeem from {dashboard.settings.minimumRedemptionPoints} points, up to {dashboard.settings.maximumRedemptionPercent}% of your eligible order.
              </p>
              {!dashboard.settings.enabled ? <p className="mt-4 rounded-xl bg-amber-400/10 p-3 text-sm text-amber-200">The loyalty program is temporarily paused.</p> : null}
            </div>
            <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
              <div className="flex items-center justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.24em] text-cyan-300">Activity</p><h2 className="mt-2 text-2xl font-semibold">Points history</h2></div>
                <Link to="/referral" className="text-sm font-semibold text-cyan-300">Refer a friend</Link></div>
              {dashboard.transactions.length === 0 ? <p className="mt-8 rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">Your points activity will appear here after your first eligible delivered order.</p>
                : <div className="mt-6 divide-y divide-[var(--border-subtle)]">{dashboard.transactions.map((transaction) => <div key={transaction.id} className="flex flex-wrap items-center justify-between gap-3 py-4">
                  <div><p className="font-medium">{transaction.description}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{new Date(transaction.createdAt).toLocaleString('en-IN')}</p></div>
                  <span className={`font-semibold ${transaction.points >= 0 ? 'text-emerald-300' : 'text-rose-300'}`}>{transaction.points > 0 ? '+' : ''}{transaction.points.toLocaleString('en-IN')} pts</span>
                </div>)}</div>}
            </div>
          </section>
        </> : null}
    </main>
    <Footer />
  </div>;
}
