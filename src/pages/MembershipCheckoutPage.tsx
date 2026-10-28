import { ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { membershipPlans } from '../data/mockData';
import { formatINR } from '../utils/currency';

export default function MembershipCheckoutPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'summary' | 'payment' | 'success'>('summary');
  const [loading, setLoading] = useState(false);
  const selectedPlan = membershipPlans.find((plan) => plan.name.toLowerCase() === searchParams.get('plan')?.toLowerCase());

  if (!selectedPlan) return <Navigate to="/membership" replace />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/membership" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to membership</Link>
        {step === 'success' ? <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[var(--bg-card)] p-10 text-center shadow-[0_0_45px_rgba(124,191,0,0.12)]"><CheckCircle className="mx-auto h-14 w-14 text-cyan-300" /><p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Demo preview</p><h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">Checkout preview complete</h1><p className="mt-4 text-[var(--text-secondary)]">No payment was made and no {selectedPlan.name} membership was activated. A payment provider is not connected.</p><Link to="/membership" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#7CBF00] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--brand-green)]">Back to membership</Link></section> : null}
        {step === 'summary' ? <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-cyan-400/40 bg-[var(--bg-card)] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Dream Spex membership</p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-7">
              <div><h1 className="text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">{selectedPlan.name}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">A recurring membership for your eyewear journey.</p></div>
              <p className="text-4xl font-semibold text-[var(--text-primary)]">{formatINR(selectedPlan.price)}<span className="text-base font-normal text-[var(--text-secondary)]"> / month</span></p>
            </div>
            <h2 className="mt-8 text-lg font-semibold text-[var(--text-primary)]">Your membership includes</h2>
            <ul className="mt-5 space-y-4">{selectedPlan.perks.map((perk) => <li key={perk} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><CheckCircle className="h-5 w-5 shrink-0 text-cyan-300" />{perk}</li>)}</ul>
          </section>
          <aside className="h-fit rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 backdrop-blur-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Membership summary</p>
            <div className="mt-7 space-y-4 text-sm text-[var(--text-secondary)]"><div className="flex items-center justify-between"><span>{selectedPlan.name} Membership</span><span className="font-semibold text-[var(--text-primary)]">{formatINR(selectedPlan.price)}/mo</span></div><div className="flex items-center justify-between"><span>Billing period</span><span className="text-[var(--text-primary)]">Monthly</span></div><div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4"><span>Subtotal</span><span className="text-[var(--text-primary)]">{formatINR(selectedPlan.price)}</span></div><div className="flex items-center justify-between text-base font-semibold text-[var(--text-primary)]"><span>Total</span><span>{formatINR(selectedPlan.price)}</span></div></div>
            <Button fullWidth className="mt-8" disabled={loading} onClick={async () => { setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 450)); setLoading(false); setStep('payment'); }}>{loading ? 'Preparing payment...' : <><CreditCard className="mr-2 h-4 w-4" />Continue to payment</>}</Button>
            <p className="mt-3 text-center text-xs leading-5 text-[var(--text-secondary)]">Frontend demo only. No charge will be made.</p>
            <Link to="/membership" className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-cyan-400/50 hover:text-[var(--text-primary)]">Back to membership</Link>
          </aside>
        </div> : null}
        {step === 'payment' ?         <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[var(--bg-card)] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10"><button type="button" onClick={() => setStep('summary')} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to plan</button><p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Checkout demo</p><h1 className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">{selectedPlan.name} checkout preview</h1><div className="mt-8 flex items-center justify-between border-y border-[var(--border-subtle)] py-5 text-[var(--text-secondary)]"><span>{selectedPlan.name} membership</span><strong className="text-xl text-[var(--text-primary)]">{formatINR(selectedPlan.price)}/month</strong></div><p className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">Payment integration is not configured. No payment will be taken, and continuing will not activate a membership.</p><Button fullWidth className="mt-8" disabled={loading} onClick={async () => { setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 700)); setLoading(false); setStep('success'); }}>{loading ? 'Loading preview...' : 'Continue with demo'}</Button><Link to="/membership" className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-cyan-400/50 hover:text-[var(--text-primary)]">Back to membership</Link></section> : null}
      </main>
      <Footer />
    </div>
  );
}