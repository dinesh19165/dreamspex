import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import {
  fetchMembershipPlans,
  membershipService,
  type MembershipDashboard,
  type MembershipPlan,
} from '../services/membershipService';
import { formatINR } from '../utils/currency';

const requiredPlanNames = ['Silver', 'Gold', 'Platinum'];

function displayDate(value: string | null) {
  return value
    ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : 'Not available';
}

export default function MembershipPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [dashboard, setDashboard] = useState<MembershipDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [membershipError, setMembershipError] = useState('');

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchMembershipPlans()
      .then((items) => { if (active) setPlans(items.filter((plan) => plan.status === 'ACTIVE')); })
      .catch((reason: unknown) => {
        if (active) setError(reason instanceof Error ? reason.message : 'Unable to load membership plans.');
      })
      .finally(() => { if (active) setLoading(false); });
    if (user?.accessToken) {
      membershipService.dashboard(user.accessToken)
        .then((value) => { if (active) setDashboard(value); })
        .catch((reason: unknown) => {
          if (active) setMembershipError(reason instanceof Error ? reason.message : 'Unable to load your membership.');
        });
    } else {
      setDashboard(null);
      setMembershipError('');
    }
    return () => { active = false; };
  }, [user?.accessToken]);

  const configuredNames = new Set(plans.map((plan) => plan.name.trim().toLowerCase()));
  const missingPlanNames = requiredPlanNames.filter((name) => !configuredNames.has(name.toLowerCase()));
  const membership = dashboard?.current;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Membership" title="Membership, configured for you" description="Review the available Dream Spex plans, their configured benefits, and your current membership." />

        {membership ? (
          <section className="mt-8 rounded-[28px] border border-cyan-400/30 bg-gradient-to-br from-cyan-400/10 to-[var(--bg-card)] p-6 sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Your membership · {membership.status}</p>
                <h2 className="mt-2 text-2xl font-semibold">{membership.planName}</h2>
                {membership.status === 'ACTIVE' ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Expires {displayDate(membership.expiresAt)}</p> : null}
                {membership.status === 'EXPIRED' ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Expired {displayDate(membership.expiresAt)}</p> : null}
                {membership.status === 'PENDING' ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Payment is pending verification. Benefits are not active yet.</p> : null}
              </div>
              {membership.status !== 'ACTIVE' ? <Button onClick={() => navigate(`/membership/checkout?plan=${encodeURIComponent(membership.planId)}`)}>Renew membership</Button> : null}
            </div>
            {membership.benefits.length ? <ul className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2">{membership.benefits.map((benefit) => <li key={benefit}>• {benefit}</li>)}</ul> : <p className="mt-4 text-sm text-[var(--text-secondary)]">No benefits are configured for this plan.</p>}
            {membership.discountPercentage != null && membership.discountPercentage > 0 ? <p className="mt-4 text-sm font-semibold text-cyan-200">{membership.discountPercentage}% configured product discount</p> : null}
          </section>
        ) : null}
        {membershipError ? <p className="mt-4 rounded-xl bg-red-400/10 p-4 text-sm text-red-600" role="alert">{membershipError}</p> : null}

        {missingPlanNames.length ? <p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-[var(--text-secondary)]">Plan configuration is missing for: {missingPlanNames.join(', ')}. Add the configured price, validity and benefits in Admin Membership Management; no prices or benefits are supplied as defaults.</p> : null}
        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {plans.map((plan) => (
            <article key={plan.id} className={`relative flex flex-col rounded-[24px] border bg-[var(--bg-card)] p-7 backdrop-blur-xl ${plan.recommended ? 'border-cyan-300 shadow-[0_0_32px_rgba(34,211,238,0.12)]' : 'border-[var(--border-subtle)]'}`}>
              {plan.recommended ? <span className="absolute right-5 top-5 rounded-full bg-cyan-300/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.15em] text-cyan-200">Recommended</span> : null}
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{plan.name}</p>
              <p className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">{formatINR(plan.price)}<span className="text-base font-normal text-[var(--text-secondary)]"> / {plan.durationDays} days</span></p>
              <p className="mt-4 min-h-12 text-sm leading-7 text-[var(--text-secondary)]">{plan.description}</p>
              <p className="mt-4 text-sm font-semibold text-[var(--text-primary)]">{plan.discountPercentage == null ? 'Discount not configured' : `${plan.discountPercentage}% membership discount`}</p>
              <ul className="mt-6 flex-1 space-y-3 text-sm text-[var(--text-secondary)]">
                {plan.perks.map((perk) => <li key={perk} className="flex gap-2"><span className="text-cyan-300" aria-hidden="true">✓</span><span>{perk}</span></li>)}
                {!plan.perks.length ? <li>No benefits are configured for this plan.</li> : null}
              </ul>
              <Button fullWidth className="mt-8" onClick={() => navigate(`/membership/checkout?plan=${encodeURIComponent(plan.id)}`)}>
                {membership?.planId === plan.id && membership.status === 'ACTIVE' ? 'Renew this plan' : `Subscribe to ${plan.name}`}
              </Button>
            </article>
          ))}
          {!loading && !error && !plans.length ? <p className="lg:col-span-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-center text-sm text-[var(--text-secondary)]">No active membership plans are configured. Configure plans through Admin Membership Management.</p> : null}
        </div>
        {loading ? <p className="mt-6 text-center text-sm text-[var(--text-secondary)]">Loading membership plans...</p> : null}
        {error ? <p className="mt-6 text-sm text-red-600" role="alert">{error}</p> : null}

        {plans.length ? (
          <section className="mt-12">
            <h2 className="text-2xl font-semibold">Compare configured plans</h2>
            <div className="mt-5 overflow-x-auto rounded-2xl border border-[var(--border-subtle)]">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-[var(--bg-card)] text-[var(--text-secondary)]"><tr><th className="p-4">Plan</th>{plans.map((plan) => <th key={plan.id} className="p-4">{plan.name}</th>)}</tr></thead>
                <tbody className="divide-y divide-[var(--border-subtle)]">
                  <tr><th className="p-4">Price</th>{plans.map((plan) => <td key={plan.id} className="p-4">{formatINR(plan.price)}</td>)}</tr>
                  <tr><th className="p-4">Validity</th>{plans.map((plan) => <td key={plan.id} className="p-4">{plan.durationDays} days</td>)}</tr>
                  <tr><th className="p-4">Discount</th>{plans.map((plan) => <td key={plan.id} className="p-4">{plan.discountPercentage == null ? 'Not configured' : `${plan.discountPercentage}%`}</td>)}</tr>
                  <tr><th className="p-4 align-top">Benefits</th>{plans.map((plan) => <td key={plan.id} className="p-4 align-top">{plan.perks.length ? plan.perks.join(' · ') : 'Not configured'}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
        {dashboard?.paymentHistory.length ? <section className="mt-12"><h2 className="text-2xl font-semibold">Membership payment history</h2><div className="mt-4 divide-y divide-[var(--border-subtle)] rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">{dashboard.paymentHistory.map((payment) => <div key={payment.id} className="flex flex-wrap items-center justify-between gap-3 p-4"><div><p className="font-semibold">{payment.planName} · {payment.status}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{displayDate(payment.createdAt)}</p></div><p className="font-semibold">{formatINR(payment.amount)}</p></div>)}</div></section> : null}
      </main>
      <Footer />
    </div>
  );
}
