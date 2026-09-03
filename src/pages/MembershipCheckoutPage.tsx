import { ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { membershipPlans } from '../data/mockData';

export default function MembershipCheckoutPage() {
  const [searchParams] = useSearchParams();
  const [step, setStep] = useState<'summary' | 'payment' | 'success'>('summary');
  const [loading, setLoading] = useState(false);
  const selectedPlan = membershipPlans.find((plan) => plan.name.toLowerCase() === searchParams.get('plan')?.toLowerCase());

  if (!selectedPlan) return <Navigate to="/membership" replace />;

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/membership" className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to membership</Link>
        {step === 'success' ? <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[#151823] p-10 text-center shadow-[0_0_45px_rgba(124,191,0,0.12)]"><CheckCircle className="mx-auto h-14 w-14 text-cyan-300" /><p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Demo complete</p><h1 className="mt-3 text-4xl font-semibold text-white">Membership activated successfully</h1><p className="mt-4 text-slate-400">Your {selectedPlan.name} membership demo is complete. Real payment integration will be connected later.</p><Link to="/membership" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#7CBF00] px-6 py-3 text-sm font-semibold text-white transition hover:bg-[#3F7000]">Back to membership</Link></section> : null}
        {step === 'summary' ? <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
          <section className="rounded-[28px] border border-cyan-400/40 bg-[#151823] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Dream Spex membership</p>
            <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-white/10 pb-7">
              <div><h1 className="text-4xl font-semibold text-white sm:text-5xl">{selectedPlan.name}</h1><p className="mt-2 text-sm text-slate-400">A recurring membership for your eyewear journey.</p></div>
              <p className="text-4xl font-semibold text-white">${selectedPlan.price}<span className="text-base font-normal text-slate-400"> / month</span></p>
            </div>
            <h2 className="mt-8 text-lg font-semibold text-white">Your membership includes</h2>
            <ul className="mt-5 space-y-4">{selectedPlan.perks.map((perk) => <li key={perk} className="flex items-center gap-3 text-sm text-slate-300"><CheckCircle className="h-5 w-5 shrink-0 text-cyan-300" />{perk}</li>)}</ul>
          </section>
          <aside className="h-fit rounded-[28px] border border-white/10 bg-white/5 p-7 backdrop-blur-xl sm:p-8">
            <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Membership summary</p>
            <div className="mt-7 space-y-4 text-sm text-slate-300"><div className="flex items-center justify-between"><span>{selectedPlan.name} Membership</span><span className="font-semibold text-white">${selectedPlan.price}/mo</span></div><div className="flex items-center justify-between"><span>Billing period</span><span className="text-white">Monthly</span></div><div className="flex items-center justify-between border-t border-white/10 pt-4"><span>Subtotal</span><span className="text-white">${selectedPlan.price}</span></div><div className="flex items-center justify-between text-base font-semibold text-white"><span>Total</span><span>${selectedPlan.price}</span></div></div>
            <Button fullWidth className="mt-8" disabled={loading} onClick={async () => { setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 450)); setLoading(false); setStep('payment'); }}>{loading ? 'Preparing payment...' : <><CreditCard className="mr-2 h-4 w-4" />Continue to payment</>}</Button>
            <p className="mt-3 text-center text-xs leading-5 text-slate-500">Frontend demo only. No charge will be made.</p>
            <Link to="/membership" className="mt-6 inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-white">Back to membership</Link>
          </aside>
        </div> : null}
        {step === 'payment' ? <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[#151823] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10"><button type="button" onClick={() => setStep('summary')} className="inline-flex items-center gap-2 text-sm font-semibold text-slate-400 transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to plan</button><p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Payment demo</p><h1 className="mt-4 text-4xl font-semibold text-white">Activate {selectedPlan.name}</h1><div className="mt-8 flex items-center justify-between border-y border-white/10 py-5 text-slate-300"><span>{selectedPlan.name} membership</span><strong className="text-xl text-white">${selectedPlan.price}/month</strong></div><p className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-slate-300">This is a frontend payment placeholder. The real payment provider will be connected here later.</p><Button fullWidth className="mt-8" disabled={loading} onClick={async () => { setLoading(true); await new Promise((resolve) => window.setTimeout(resolve, 700)); setLoading(false); setStep('success'); }}>{loading ? 'Processing demo payment...' : 'Pay Now'}</Button><Link to="/membership" className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-white/10 px-5 py-3 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/50 hover:text-white">Back to membership</Link></section> : null}
      </main>
      <Footer />
    </div>
  );
}