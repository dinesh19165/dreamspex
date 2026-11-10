import { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, Copy, Gift, MessageCircle, RefreshCw, Share2, Users } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import { loyaltyService, type ReferralDashboard } from '../services/loyaltyService';
import { formatINR } from '../utils/currency';

export default function ReferralPage() {
  const { user, refreshSession } = useAuth();
  const [dashboard, setDashboard] = useState<ReferralDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [codeInput, setCodeInput] = useState('');
  const [claimLoading, setClaimLoading] = useState(false);
  const [notice, setNotice] = useState('');
  const [copyState, setCopyState] = useState('');

  const load = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setError('Sign in to view your referral rewards.');
      return;
    }
    setLoading(true);
    setError('');
    try { setDashboard(await loyaltyService.referrals(user.accessToken)); }
    catch (reason) {
      if (reason instanceof Error && 'status' in reason && reason.status === 401 && await refreshSession()) {
        const stored = JSON.parse(localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        if (stored.accessToken) {
          try { setDashboard(await loyaltyService.referrals(stored.accessToken)); }
          catch (retryReason) { setError(retryReason instanceof Error ? retryReason.message : 'Unable to load referrals.'); }
        } else setError('Your session has expired. Please sign in again.');
      } else setError(reason instanceof Error ? reason.message : 'Unable to load referrals.');
    } finally { setLoading(false); }
  }, [refreshSession, user?.accessToken]);

  useEffect(() => { void load(); }, [load]);

  const shareUrl = useMemo(() => dashboard
    ? new URL(dashboard.shareLink, window.location.origin).toString() : '', [dashboard]);
  const shareMessage = dashboard
    ? `Join me at Dream Spex. Use my referral code ${dashboard.code}: ${shareUrl}` : '';

  const copy = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyState(label);
      window.setTimeout(() => setCopyState(''), 1800);
    } catch {
      setError('Clipboard access is unavailable. Select and copy the referral code or link manually.');
    }
  };

  const claimCode = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.accessToken || !codeInput.trim()) return;
    setClaimLoading(true);
    setError('');
    setNotice('');
    try {
      await loyaltyService.claimReferral(user.accessToken, codeInput.trim());
      setNotice('Referral code applied. Your friend’s reward will be processed after your first qualifying order is delivered.');
      setCodeInput('');
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to apply this referral code.');
    } finally { setClaimLoading(false); }
  };

  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
    <Navbar />
    <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <SectionTitle eyebrow="Refer & earn" title="Good taste is better shared"
        description="Invite a friend to Dream Spex. Rewards are credited to both of you after their first qualifying order is delivered." />
      {loading ? <div className="mt-10 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-secondary)]" role="status">Loading your referral dashboard...</div>
        : error && !dashboard ? <div className="mt-10 rounded-[28px] border border-rose-400/30 bg-rose-400/10 p-6 text-sm text-rose-200" role="alert">
          <p>{error}</p><Button type="button" variant="ghost" className="mt-4" onClick={() => void load()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button>
        </div> : dashboard ? <>
          {!dashboard.enabled ? <p className="mt-8 rounded-2xl border border-amber-300/30 bg-amber-300/10 p-4 text-sm text-amber-200">The referral program is temporarily paused.</p> : null}
          <section className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_.8fr]">
            <div className="rounded-[30px] border border-emerald-400/25 bg-gradient-to-br from-emerald-400/15 to-[var(--bg-card)] p-8">
              <div className="flex items-start justify-between gap-5">
                <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-300">Your referral code</p>
                  <p className="mt-4 break-all text-3xl font-semibold tracking-[0.12em]">{dashboard.code}</p>
                </div><Gift className="h-9 w-9 shrink-0 text-emerald-300" />
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button type="button" onClick={() => void copy(dashboard.code, 'code')}>
                  {copyState === 'code' ? <Check className="mr-2 h-4 w-4" /> : <Copy className="mr-2 h-4 w-4" />}
                  {copyState === 'code' ? 'Copied' : 'Copy code'}
                </Button>
                <Button type="button" variant="ghost" onClick={() => void copy(shareUrl, 'link')}>
                  {copyState === 'link' ? <Check className="mr-2 h-4 w-4" /> : <Share2 className="mr-2 h-4 w-4" />}
                  {copyState === 'link' ? 'Link copied' : 'Copy invite link'}
                </Button>
                <a href={`https://wa.me/?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
                  <MessageCircle className="mr-2 h-4 w-4" />WhatsApp
                </a>
                <a href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareMessage)}`} target="_blank" rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">X</a>
                <button type="button" onClick={() => {
                  if (navigator.share) void navigator.share({ title: 'Dream Spex referral', text: shareMessage, url: shareUrl })
                    .catch(() => setError('The share action was cancelled or unavailable.'));
                  else void copy(shareUrl, 'link');
                }} className="rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">
                  Share
                </button>
              </div>
              <p className="mt-5 break-all rounded-xl bg-[var(--bg-primary)]/70 px-4 py-3 text-xs text-[var(--text-secondary)]">{shareUrl}</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
                <Users className="h-6 w-6 text-cyan-300" /><p className="mt-5 text-sm text-[var(--text-secondary)]">Successful referrals</p>
                <p className="mt-1 text-4xl font-semibold">{dashboard.successfulReferrals}</p>
              </div>
              <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
                <Gift className="h-6 w-6 text-cyan-300" /><p className="mt-5 text-sm text-[var(--text-secondary)]">Rewards earned</p>
                <p className="mt-1 text-2xl font-semibold">{dashboard.rewardType === 'WALLET_CREDIT'
                  ? formatINR(dashboard.totalWalletRewards) : `${dashboard.totalPointRewards.toLocaleString('en-IN')} points`}</p>
                <p className="mt-2 text-sm text-[var(--text-secondary)]">{dashboard.pendingReferrals} referral{dashboard.pendingReferrals === 1 ? '' : 's'} pending</p>
              </div>
            </div>
          </section>

          <form onSubmit={claimCode} className="mt-6 flex flex-col gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:flex-row">
            <div className="min-w-0 flex-1"><label htmlFor="friend-code" className="text-sm font-semibold">Have a friend’s code?</label>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">Apply it before your first order to qualify for the new-customer reward.</p>
              <input id="friend-code" value={codeInput} onChange={(event) => setCodeInput(event.target.value)}
                maxLength={32} placeholder="Enter referral code" className="mt-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm uppercase text-[var(--text-primary)]" />
            </div>
            <Button type="submit" disabled={claimLoading || !codeInput.trim() || !dashboard.enabled} className="self-end">
              {claimLoading ? 'Applying...' : 'Apply code'}
            </Button>
          </form>
          {notice ? <p className="mt-4 rounded-xl bg-emerald-400/10 p-4 text-sm text-emerald-200" role="status">{notice}</p> : null}
          {error ? <p className="mt-4 rounded-xl bg-rose-400/10 p-4 text-sm text-rose-200" role="alert">{error}</p> : null}

          <section className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7">
            <h2 className="text-xl font-semibold">Referral history</h2>
            {dashboard.referrals.length === 0 ? <p className="mt-5 rounded-2xl bg-[var(--bg-secondary)] p-5 text-sm text-[var(--text-secondary)]">You haven’t invited anyone yet. Share your code to get started.</p>
              : <div className="mt-5 overflow-x-auto"><table className="w-full min-w-[560px] text-left text-sm">
                <thead className="text-xs uppercase tracking-wide text-[var(--text-secondary)]"><tr><th className="pb-3">Customer</th><th className="pb-3">Date</th><th className="pb-3">Reward</th><th className="pb-3">Status</th></tr></thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">{dashboard.referrals.map((referral) => <tr key={referral.id}>
                  <td className="py-4">{referral.referredName}</td>
                  <td className="py-4 text-[var(--text-secondary)]">{new Date(referral.createdAt).toLocaleDateString('en-IN')}</td>
                  <td className="py-4 text-[var(--text-secondary)]">{referral.rewardType === 'WALLET_CREDIT'
                    ? formatINR(referral.rewardAmount ?? 0) : `${referral.rewardAmount ?? 0} points`}</td>
                  <td className="py-4"><span className={`rounded-full px-3 py-1 text-xs font-semibold ${referral.status === 'SUCCESSFUL'
                    ? 'bg-emerald-400/10 text-emerald-300' : referral.status === 'PENDING'
                      ? 'bg-amber-400/10 text-amber-200' : 'bg-rose-400/10 text-rose-200'}`}>{referral.status.replace('_', ' ')}</span></td>
                </tr>)}</tbody>
              </table></div>}
          </section>
        </> : null}
    </main>
    <Footer />
  </div>;
}
