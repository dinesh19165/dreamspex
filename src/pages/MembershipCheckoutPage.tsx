import { ArrowLeft, CheckCircle, CreditCard } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import { fetchMembershipPlans, membershipService, type MembershipPlan } from '../services/membershipService';
import { formatINR } from '../utils/currency';

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => {
      open: () => void;
      on?: (event: string, handler: (response: { error?: { description?: string } }) => void) => void;
    };
  }
}

function loadRazorpay() {
  return new Promise<void>((resolve, reject) => {
    if (window.Razorpay) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Razorpay Checkout could not be loaded.'));
    document.body.appendChild(script);
  });
}

export default function MembershipCheckoutPage() {
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const [step, setStep] = useState<'summary' | 'payment' | 'success'>('summary');
  const [loading, setLoading] = useState(false);
  const [paymentError, setPaymentError] = useState('');
  const [paymentState, setPaymentState] = useState('');
  const [plans, setPlans] = useState<MembershipPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState('');
  const selectedPlanParam = searchParams.get('plan')?.toLowerCase();

  useEffect(() => {
    const controller = new AbortController();
    fetchMembershipPlans(controller.signal)
      .then((items) => setPlans(items.filter((plan) => plan.status === 'ACTIVE')))
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setPlansError(reason instanceof Error ? reason.message : 'Unable to load membership plans.');
        }
      })
      .finally(() => { if (!controller.signal.aborted) setPlansLoading(false); });
    return () => controller.abort();
  }, []);

  const selectedPlan = plans.find((plan) =>
    plan.name.toLowerCase() === selectedPlanParam || plan.id.toLowerCase() === selectedPlanParam);

  const startPayment = async () => {
    if (!selectedPlan || !user?.accessToken || loading) return;
    const accessToken = user.accessToken;
    let paymentVerified = false;
    let paymentStatusUpdateStarted = false;
    setLoading(true);
    setPaymentError('');
    setPaymentState('');
    try {
      const intent = await membershipService.createPaymentIntent(accessToken, selectedPlan.id);
      await loadRazorpay();
      if (!window.Razorpay) throw new Error('Razorpay Checkout is unavailable.');
      const recordPaymentStatus = (status: 'FAILED' | 'CANCELLED', message: string) => {
        if (paymentVerified || paymentStatusUpdateStarted) return;
        paymentStatusUpdateStarted = true;
        void membershipService.updatePaymentStatus(accessToken, selectedPlan.id, {
          providerOrderId: intent.providerOrderId,
          status,
        }).then(() => status === 'CANCELLED' ? setPaymentState(message) : setPaymentError(message))
          .catch((reason: unknown) => setPaymentError(reason instanceof Error ? reason.message : 'Unable to update payment status.'))
          .finally(() => setLoading(false));
      };
      const checkout = new window.Razorpay({
        key: intent.keyId,
        amount: Math.round(intent.amount * 100),
        currency: intent.currency,
        name: 'Dream Spex',
        description: `${selectedPlan.name} membership`,
        order_id: intent.providerOrderId,
        handler: async (response: {
          razorpay_order_id: string;
          razorpay_payment_id: string;
          razorpay_signature: string;
        }) => {
          try {
            await membershipService.verifyPayment(accessToken, selectedPlan.id, {
              providerOrderId: response.razorpay_order_id,
              providerPaymentId: response.razorpay_payment_id,
              signature: response.razorpay_signature,
            });
            paymentVerified = true;
            setStep('success');
          } catch (reason) {
            setPaymentError(reason instanceof Error ? reason.message : 'Payment verification failed.');
          } finally {
            setLoading(false);
          }
        },
        modal: {
          ondismiss: () => recordPaymentStatus('CANCELLED', 'Payment cancelled. Your membership was not activated.'),
        },
      });
      checkout.on?.('payment.failed', (response) => {
        recordPaymentStatus('FAILED', response.error?.description ?? 'Payment failed. Your membership was not activated.');
      });
      checkout.open();
    } catch (reason) {
      setPaymentError(reason instanceof Error ? reason.message : 'Unable to start membership payment.');
      setLoading(false);
    }
  };

  if (plansLoading) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-5xl px-4 py-12 text-center text-sm text-[var(--text-secondary)]">Loading membership plan...</main><Footer /></div>;
  if (plansError) return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-5xl px-4 py-12"><p className="rounded-xl bg-red-400/10 p-4 text-sm text-red-600" role="alert">{plansError}</p><Link to="/membership" className="mt-4 inline-flex text-sm font-semibold">Back to membership plans</Link></main><Footer /></div>;
  if (!selectedPlan) return <Navigate to="/membership" replace />;

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
        <Link to="/membership" className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to membership</Link>
        {step === 'success' ? (
          <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[var(--bg-card)] p-10 text-center shadow-[0_0_45px_rgba(124,191,0,0.12)]">
            <CheckCircle className="mx-auto h-14 w-14 text-cyan-300" />
            <p className="mt-6 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Payment verified</p>
            <h1 className="mt-3 text-4xl font-semibold text-[var(--text-primary)]">Membership activated</h1>
            <p className="mt-4 text-[var(--text-secondary)]">Your {selectedPlan.name} membership is active. Payment was verified by Dream Spex.</p>
            <Link to="/membership" className="mt-8 inline-flex items-center gap-2 rounded-full bg-[#7CBF00] px-6 py-3 text-sm font-semibold text-[var(--text-primary)] transition hover:bg-[var(--brand-green)]">View membership</Link>
          </section>
        ) : null}
        {step === 'summary' ? (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-[28px] border border-cyan-400/40 bg-[var(--bg-card)] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Dream Spex membership</p>
              <div className="mt-6 flex flex-wrap items-end justify-between gap-4 border-b border-[var(--border-subtle)] pb-7">
                <div><h1 className="text-4xl font-semibold text-[var(--text-primary)] sm:text-5xl">{selectedPlan.name}</h1><p className="mt-2 text-sm text-[var(--text-secondary)]">{selectedPlan.description}</p></div>
                <p className="text-4xl font-semibold text-[var(--text-primary)]">{formatINR(selectedPlan.price)}<span className="text-base font-normal text-[var(--text-secondary)]"> / {selectedPlan.durationDays} days</span></p>
              </div>
              <h2 className="mt-8 text-lg font-semibold text-[var(--text-primary)]">Your membership includes</h2>
              <ul className="mt-5 space-y-4">{selectedPlan.perks.map((perk) => <li key={perk} className="flex items-center gap-3 text-sm text-[var(--text-secondary)]"><CheckCircle className="h-5 w-5 shrink-0 text-cyan-300" />{perk}</li>)}</ul>
            </section>
            <aside className="h-fit rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-7 backdrop-blur-xl sm:p-8">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Membership summary</p>
              <div className="mt-7 space-y-4 text-sm text-[var(--text-secondary)]"><div className="flex items-center justify-between"><span>{selectedPlan.name} Membership</span><span className="font-semibold text-[var(--text-primary)]">{formatINR(selectedPlan.price)}</span></div><div className="flex items-center justify-between"><span>Duration</span><span className="text-[var(--text-primary)]">{selectedPlan.durationDays} days</span></div><div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4"><span>Subtotal</span><span className="text-[var(--text-primary)]">{formatINR(selectedPlan.price)}</span></div><div className="flex items-center justify-between text-base font-semibold text-[var(--text-primary)]"><span>Total</span><span>{formatINR(selectedPlan.price)}</span></div></div>
              <Button fullWidth className="mt-8" onClick={() => setStep('payment')}>Continue to payment</Button>
              {!user?.accessToken ? <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">Sign in is required to purchase membership.</p> : null}
            </aside>
          </div>
        ) : null}
        {step === 'payment' ? (
          <section className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-cyan-400/30 bg-[var(--bg-card)] p-7 shadow-[0_0_45px_rgba(124,191,0,0.12)] sm:p-10">
            <button type="button" onClick={() => setStep('summary')} className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:text-cyan-300"><ArrowLeft className="h-4 w-4" /> Back to plan</button>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Secure membership checkout</p>
            <h1 className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">{selectedPlan.name}</h1>
            <div className="mt-8 flex items-center justify-between border-y border-[var(--border-subtle)] py-5 text-[var(--text-secondary)]"><span>{selectedPlan.name} membership · {selectedPlan.durationDays} days</span><strong className="text-xl text-[var(--text-primary)]">{formatINR(selectedPlan.price)}</strong></div>
            <p className="mt-6 rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-4 text-sm leading-6 text-[var(--text-secondary)]">Membership is activated only after the backend verifies the Razorpay payment signature and captured status.</p>
            {paymentError ? <p className="mt-4 rounded-xl bg-red-400/10 p-3 text-sm text-red-600" role="alert">{paymentError}</p> : null}
            {paymentState ? <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">{paymentState}</p> : null}
            {user?.accessToken ? <Button fullWidth className="mt-8" disabled={loading} onClick={() => void startPayment()}>{loading ? 'Verifying payment...' : <><CreditCard className="mr-2 h-4 w-4" />Pay securely with Razorpay</>}</Button> : <Link to="/login" className="mt-8 inline-flex w-full items-center justify-center rounded-full bg-[#7CBF00] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Sign in to continue</Link>}
            <Link to="/membership" className="mt-4 inline-flex w-full items-center justify-center rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)] transition hover:border-cyan-400/50 hover:text-[var(--text-primary)]">Cancel checkout</Link>
          </section>
        ) : null}
      </main>
      <Footer />
    </div>
  );
}
