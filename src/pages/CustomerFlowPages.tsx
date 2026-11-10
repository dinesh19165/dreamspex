import { useCallback, useEffect, useRef, useState } from 'react';
import { CheckCircle, Camera, CircleAlert, CreditCard, ExternalLink, PackageCheck, Printer, RefreshCw, Upload, Video, Wrench } from 'lucide-react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import Button from '../components/ui/Button';
import SectionTitle from '../components/ui/SectionTitle';
import WhatsAppSupport from '../components/ui/WhatsAppSupport';
import { products } from '../data/mockData';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/currency';
import { useAuth } from '../context/useAuth';
import { orderService, type OrderResponse, OrderApiError } from '../services/orderService';
import GstBreakdown from '../components/ui/GstBreakdown';
import { toGstBreakdown } from '../utils/gst';

function FlowShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</main><Footer /></div>;
}

export function VirtualTryOnPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [cameraState, setCameraState] = useState<'idle' | 'loading' | 'ready' | 'denied'>('idle');
  const [selectedFrame, setSelectedFrame] = useState(0);
  const requestCamera = async () => {
    setCameraState('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;
      setCameraState('ready');
    } catch { setCameraState('denied'); }
  };
  return <FlowShell><SectionTitle eyebrow="Virtual try-on" title="Find the frame that feels like you" description="Use your camera or upload a photo. This preview is ready for a future face-detection SDK integration." /><div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.7fr]"><div className="relative aspect-video overflow-hidden rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)]"><video ref={videoRef} autoPlay playsInline className={`h-full w-full object-cover ${cameraState === 'ready' ? 'block' : 'hidden'}`} /><div className={`${cameraState === 'ready' ? 'hidden' : 'flex'} h-full flex-col items-center justify-center gap-4 p-8 text-center`}><Video className="h-10 w-10 text-cyan-300" />{cameraState === 'denied' ? <><p className="text-lg font-semibold text-[var(--text-primary)]">Camera access is unavailable</p><p className="max-w-md text-sm text-[var(--text-secondary)]">Allow camera access or upload a photo to continue.</p></> : <p className="text-lg font-semibold text-[var(--text-primary)]">Your try-on studio is ready</p>}</div>{cameraState === 'ready' ? <div className="pointer-events-none absolute left-1/2 top-1/2 h-24 w-56 -translate-x-1/2 -translate-y-1/2 rounded-[45%] border-2 border-cyan-300/70 shadow-[0_0_40px_rgba(34,211,238,0.35)]" /> : null}</div><aside className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"><p className="text-sm uppercase tracking-[0.3em] text-cyan-400">Choose a frame</p><div className="mt-5 space-y-3">{products.map((product, index) => <button key={product.id} onClick={() => setSelectedFrame(index)} className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left ${selectedFrame === index ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'}`}><img src={product.image} alt="" className="h-12 w-12 rounded-xl object-cover" /><span className="text-sm font-semibold text-[var(--text-primary)]">{product.name}</span></button>)}</div><div className="mt-6 grid gap-3"><Button onClick={requestCamera} fullWidth><Camera className="mr-2 h-4 w-4" />{cameraState === 'loading' ? 'Requesting camera...' : 'Start try-on'}</Button><label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)]"><Upload className="h-4 w-4" /> Upload photo<input type="file" accept="image/*" className="sr-only" /></label><Link to={`/product/${products[selectedFrame].id}`} className="inline-flex items-center justify-center gap-2 text-sm font-semibold text-cyan-300">View selected frame <ExternalLink className="h-4 w-4" /></Link></div></aside></div></FlowShell>;
}

export function PaymentPage() {
  const { cart, total } = useShop();
  const [method, setMethod] = useState('card');
  const [notice, setNotice] = useState(false);
  return <FlowShell><SectionTitle eyebrow="Payment demo" title="Choose a payment method" description="Checkout is currently a frontend demo. A secure payment gateway is not connected." /><div className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.7fr]"><div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><div className="grid gap-3 sm:grid-cols-2">{[['card', 'Credit or debit card', CreditCard], ['upi', 'UPI', CreditCard], ['netbanking', 'Net banking', PackageCheck], ['cod', 'Cash on delivery', PackageCheck]].map(([value, label, Icon]) => <button key={String(value)} onClick={() => { setMethod(String(value)); setNotice(false); }} aria-pressed={method === value} className={`flex items-center gap-3 rounded-2xl border p-4 text-left ${method === value ? 'border-cyan-400/50 bg-cyan-400/10' : 'border-[var(--border-subtle)] bg-[var(--bg-primary)]'}`}><Icon className="h-5 w-5 text-cyan-300" /><span className="text-sm font-semibold text-[var(--text-primary)]">{String(label)}</span></button>)}</div><div className="mt-8 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><CircleAlert className="h-5 w-5 shrink-0" /><p>No real payment is available. Do not enter card, bank, or UPI credentials. The selected method is for preview only.</p></div><Button fullWidth className="mt-8" onClick={() => setNotice(true)}>Check payment availability</Button>{notice ? <div role="status" className="mt-4 flex gap-3 rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm text-amber-100"><CircleAlert className="h-5 w-5 shrink-0" />Payment integration is not configured. No payment or order was created.</div> : null}</div><div className="rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8"><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Demo total</p><p className="mt-4 text-4xl font-semibold text-[var(--text-primary)]">{formatINR(total)}</p><p className="mt-3 text-sm text-[var(--text-secondary)]">{cart.length} line item{cart.length === 1 ? '' : 's'} · Tax and delivery are not calculated in this demo.</p><Link to="/cart" className="mt-8 inline-flex text-sm font-semibold text-cyan-300">Review cart</Link></div></div></FlowShell>;
}

export function PrescriptionPage() {
  const [step, setStep] = useState(1);
  const [lensType, setLensType] = useState('Single vision');
  const product = products[0];
  return <FlowShell><SectionTitle eyebrow="Prescription lenses" title={`Personalise ${product.name}`} description="Choose your lens and prescription details before adding this frame to your cart." /><div className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><div className="flex items-center justify-between text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{['Lens type', 'Prescription', 'Material', 'Review'].map((label, index) => <span key={label} className={step === index + 1 ? 'text-cyan-300' : ''}>{index + 1}. {label}</span>)}</div><div className="mt-8">{step === 1 ? <div className="grid gap-3 sm:grid-cols-2">{['Single vision', 'Bifocal', 'Progressive', 'Blue light', 'Zero power'].map((option) => <button key={option} onClick={() => setLensType(option)} className={`rounded-2xl border p-4 text-left text-sm font-semibold ${lensType === option ? 'border-cyan-400/50 bg-cyan-400/10 text-[var(--text-primary)]' : 'border-[var(--border-subtle)] bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>{option}</button>)}</div> : null}{step === 2 ? <div className="grid gap-4 sm:grid-cols-2">{['Right eye SPH', 'Right eye CYL', 'Right eye AXIS', 'Left eye SPH', 'Left eye CYL', 'Left eye AXIS', 'PD'].map((label) => <input key={label} required placeholder={label} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />)}<label className="flex cursor-pointer items-center gap-2 rounded-full border border-dashed border-[var(--border-subtle)] px-4 py-3 text-sm text-[var(--text-secondary)]"><Upload className="h-4 w-4 text-cyan-300" /> Upload prescription<input type="file" accept="image/*,.pdf" className="sr-only" /></label></div> : null}{step === 3 ? <div className="grid gap-3 sm:grid-cols-3">{['Standard', 'Thin', 'Ultra thin'].map((option) => <button key={option} onClick={() => setStep(4)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5 text-sm font-semibold text-[var(--text-primary)]">{option}</button>)}</div> : null}{step === 4 ? <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/10 p-5"><p className="text-sm uppercase tracking-[0.25em] text-cyan-300">Review</p><p className="mt-4 font-semibold text-[var(--text-primary)]">{product.name} · {lensType}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">Prescription details and anti-reflective coating will be confirmed before payment.</p><Link to="/cart" className="mt-6 inline-flex rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Continue to cart</Link></div> : null}</div>{step < 4 && step !== 3 ? <Button fullWidth className="mt-8" onClick={() => setStep(step + 1)}>Continue</Button> : null}</div></FlowShell>;
}

export function OrderConfirmationPage() {
  const [searchParams] = useSearchParams();
  const orderId = searchParams.get('orderId');
  return <OrderDataPage orderId={orderId} success />;
}

export function OrderTrackingPage() {
  const { id } = useParams();
  return <OrderDataPage orderId={id ?? null} />;
}

function OrderDataPage({ orderId, success = false }: { orderId: string | null; success?: boolean }) {
  const { user, refreshSession } = useAuth();
  const [order, setOrder] = useState<OrderResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      setLoading(false);
      setError('The order ID is missing from this link.');
      return;
    }
    if (!user?.accessToken) {
      setLoading(false);
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      let accessToken = user.accessToken;
      try {
        setOrder(await orderService.get(accessToken, orderId));
      } catch (reason) {
        if (!(reason instanceof OrderApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        setOrder(await orderService.get(accessToken, orderId));
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load this order.');
    } finally {
      setLoading(false);
    }
  }, [orderId, refreshSession, user?.accessToken]);

  useEffect(() => { void loadOrder(); }, [loadOrder]);

  if (loading) return <FlowShell><p className="mx-auto max-w-3xl py-10 text-sm text-[var(--text-secondary)]">Loading order details...</p></FlowShell>;
  if (error || !order) return <FlowShell><div className="mx-auto max-w-3xl rounded-[28px] border border-red-400/30 bg-red-400/10 p-10 text-center"><p className="text-sm text-red-200" role="alert">{error || 'Order was not found.'}</p><button type="button" onClick={() => void loadOrder()} className="mt-6 rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Retry</button></div></FlowShell>;

  const paymentConfirmed = order.paymentStatus.toUpperCase() === 'PAID';
  const statuses = (order.history.length ? order.history : [{ status: order.status, note: null, createdAt: order.createdAt }])
    .slice()
    .sort((first, second) => Date.parse(first.createdAt) - Date.parse(second.createdAt));
  const lensItems = order.items.filter((item) => item.lensPreparation);
  const invoiceGst = toGstBreakdown(order.gstSnapshot);
  return <FlowShell>
    <SectionTitle eyebrow={success && paymentConfirmed ? 'Payment confirmed' : 'Order details'} title={success && paymentConfirmed ? 'Your order is confirmed' : `Order ${order.orderNumber}`} description={success && paymentConfirmed ? 'Your payment was confirmed by Dream Spex.' : 'Review your products, payment status, and order progress.'} />
    {success && !paymentConfirmed ? <div className="mx-auto mt-8 max-w-3xl rounded-[24px] border border-amber-400/30 bg-amber-400/10 p-6 text-sm text-amber-100" role="alert">Payment has not been confirmed by the backend yet. This order will not be marked as successful until confirmation is received.</div> : null}
    <div className="mx-auto mt-8 max-w-3xl space-y-6">
      <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-sm text-[var(--text-secondary)]">Order number</p><p className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{order.orderNumber}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</p></div>
          <div className="text-right text-sm"><p className="text-[var(--text-secondary)]">Payment: <span className="font-semibold text-[var(--text-primary)]">{order.paymentStatus}</span></p><p className="mt-2 text-[var(--text-secondary)]">Order: <span className="font-semibold text-[var(--text-primary)]">{order.status}</span></p><p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{formatINR(order.total)}</p></div>
        </div>
        <div className="mt-6 space-y-3 border-t border-[var(--border-subtle)] pt-6">{order.items.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 text-sm"><div><p className="font-semibold text-[var(--text-primary)]">{item.productName}</p><p className="mt-1 text-[var(--text-secondary)]">Qty {item.quantity} · {item.sku}</p></div><p className="font-semibold text-[var(--text-primary)]">{formatINR(item.lineTotal)}</p></div>)}</div>
        <div className="mt-5 border-t border-[var(--border-subtle)] pt-5"><GstBreakdown breakdown={invoiceGst} /></div>
      </section>
      <section className="gst-invoice-print rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8">
        <div className="flex flex-wrap items-center justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">Dream Spex</p><h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">Invoice preview</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{order.orderNumber} · {new Date(order.createdAt).toLocaleDateString('en-IN')}</p></div><button type="button" onClick={() => window.print()} className="no-print inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)]"><Printer className="h-4 w-4" />Print invoice</button></div>
        <div className="mt-6 space-y-3 border-t border-[var(--border-subtle)] pt-5">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-4 text-sm"><span>{item.productName} · Qty {item.quantity}</span><span>{formatINR(item.lineTotal)}</span></div>)}</div>
        <div className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-5 text-sm">
          <div className="flex justify-between"><span>Subtotal</span><span>{formatINR(order.subtotal)}</span></div>
          <div className="flex justify-between"><span>Discount</span><span>-{formatINR(order.discount)}</span></div>
          {order.loyaltyDiscount ? <div className="flex justify-between text-emerald-300">
            <span>Loyalty points ({order.loyaltyPointsRedeemed ?? 0})</span><span>-{formatINR(order.loyaltyDiscount)}</span>
          </div> : null}
          <GstBreakdown breakdown={invoiceGst} />
          <div className="flex justify-between"><span>Shipping</span><span>{order.shipping === 0 ? 'FREE' : formatINR(order.shipping)}</span></div>
          <div className="flex justify-between border-t border-[var(--border-subtle)] pt-3 text-lg font-semibold"><span>Total paid / due</span><span>{formatINR(order.total)}</span></div>
        </div>
        <p className="mt-4 text-xs leading-5 text-[var(--text-secondary)]">{invoiceGst ? 'GST values are from the saved backend order snapshot.' : 'This historical order has no GST snapshot.'} The invoice preview does not change the backend order or payment.</p>
      </section>
      {lensItems.length ? <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><div className="flex flex-wrap items-center justify-between gap-4"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Lens Preparation</h2><Button type="button" variant="ghost" className="h-12 w-[160px] flex-none px-3 py-2" onClick={() => void loadOrder()}><RefreshCw className="mr-2 h-4 w-4" />Refresh status</Button></div><div className="mt-6 space-y-6">{lensItems.map((item) => <div key={item.id} className="border-t border-[var(--border-subtle)] pt-5 first:border-0 first:pt-0"><p className="font-semibold text-[var(--text-primary)]">{item.productName}</p><LensPreparationProgress status={item.lensPreparation!.status} updatedAt={item.lensPreparation!.updatedAt} /></div>)}</div></section> : null}
      <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Order progress</h2><div className="mt-6 space-y-4">{statuses.map((history) => <div key={`${history.status}-${history.createdAt}`} className="flex items-start gap-4"><span className="mt-1 h-3 w-3 rounded-full bg-cyan-300" /><div><p className="font-semibold text-[var(--text-primary)]">{history.status}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{new Date(history.createdAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{history.note ? ` · ${history.note}` : ''}</p></div></div>)}</div></section>
      <div className="flex flex-wrap gap-3"><Link to="/orders" className="rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Back to orders</Link><WhatsAppSupport message={`Hello, I need help with order ${order.orderNumber}.`} />{!success ? <Link to="/after-sales" className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-5 py-3 text-sm font-semibold text-[var(--text-secondary)]"><Wrench className="h-4 w-4" /> After-sales support</Link> : null}</div>
    </div>
  </FlowShell>;
}

function LensPreparationProgress({ status, updatedAt }: { status: NonNullable<OrderResponse['items'][number]['lensPreparation']>['status']; updatedAt: string | null }) {
  const stages = [
    { status: 'PENDING', label: 'Pending' },
    { status: 'IN_PREPARATION', label: 'In Preparation' },
    { status: 'READY_FOR_DISPATCH', label: 'Ready for Dispatch' },
  ] as const;
  const currentIndex = stages.findIndex((stage) => stage.status === status);

  return <div className="mt-4">
    <ol aria-label="Lens preparation stages" className="grid gap-3 sm:grid-cols-3">
      {stages.map((stage, index) => {
        const complete = index < currentIndex;
        const current = index === currentIndex;
        return <li key={stage.status} aria-current={current ? 'step' : undefined} className={`rounded-2xl border px-4 py-3 text-sm ${current ? 'border-cyan-300/50 bg-cyan-400/10 text-[var(--text-primary)]' : complete ? 'border-emerald-300/30 text-[var(--text-primary)]' : 'border-[var(--border-subtle)] text-[var(--text-secondary)]'}`}>
          <span className="font-semibold">{stage.label}</span>
          <span className="mt-1 block text-xs">{current ? 'Current status' : complete ? 'Complete' : 'Upcoming'}</span>
        </li>;
      })}
    </ol>
    <p className="mt-3 text-sm text-[var(--text-secondary)]">{updatedAt ? `Last updated ${new Date(updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}` : 'Preparation has not been updated yet.'}</p>
  </div>;
}

export function AfterSalesPage() {
  const [submitted, setSubmitted] = useState(false);
  return <FlowShell><SectionTitle eyebrow="After-sales" title="We keep caring after delivery" description="Start a return, repair, replacement, warranty, or order issue request." />{submitted ? <div className="mx-auto mt-10 max-w-2xl rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-10 text-center"><CheckCircle className="mx-auto h-12 w-12 text-emerald-300" /><h2 className="mt-5 text-2xl font-semibold text-[var(--text-primary)]">Request submitted</h2><p className="mt-3 text-sm text-[var(--text-secondary)]">Reference DS-SR-1048. Our support team will review it shortly.</p><Link to="/orders" className="mt-6 inline-flex text-sm font-semibold text-cyan-300">View my orders</Link></div> : <form onSubmit={(event) => { event.preventDefault(); setSubmitted(true); }} className="mx-auto mt-10 max-w-2xl space-y-5 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><div className="grid gap-5 sm:grid-cols-2"><input required placeholder="Order number" className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /><select className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"><option>Return product</option><option>Replacement</option><option>Warranty claim</option><option>Repair request</option><option>Lens issue</option></select></div><textarea required rows={5} placeholder="Tell us what happened" className="w-full rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /><label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-[var(--border-subtle)] p-4 text-sm text-[var(--text-secondary)]"><Upload className="h-5 w-5 text-cyan-300" /> Add an image<input type="file" accept="image/*" className="sr-only" /></label><Button type="submit" fullWidth>Submit service request</Button></form>}</FlowShell>;
}
