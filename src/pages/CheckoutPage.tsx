import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';
import { getCartItemKey } from '../utils/cart';
import { formatINR } from '../utils/currency';

export default function CheckoutPage() {
  const { cart, appliedCoupon, applyCoupon, removeCoupon, subtotal, discount, total, deliveryPin, isDeliveryPinValidated, setDeliveryPin, validateDeliveryPin } = useShop();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const [pinChecking, setPinChecking] = useState(false);
  const [pinError, setPinError] = useState('');
  const [pinSuccess, setPinSuccess] = useState('');

  const handleApplyCoupon = async () => { setCouponLoading(true); setCouponError(''); await new Promise((resolve) => window.setTimeout(resolve, 350)); if (!applyCoupon(couponCode)) setCouponError('Invalid coupon code.'); setCouponLoading(false); };

  const handlePinCheck = () => {
    if (pinChecking) return;

    const nextPin = deliveryPin.trim();
    if (!/^\d{6}$/.test(nextPin)) {
      setPinError('Enter a valid 6-digit Indian PIN code.');
      setPinSuccess('');
      return;
    }

    setPinChecking(true);
    setPinError('');
    setPinSuccess('');

    window.setTimeout(() => {
      const result = validateDeliveryPin(nextPin);
      if (!result.isValid) {
        setPinError(result.message);
        setPinSuccess('');
      } else {
        setPinSuccess(result.message);
        setPinError('');
      }
      setPinChecking(false);
    }, 350);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!/^\d{6}$/.test(deliveryPin.trim()) || !isDeliveryPinValidated) {
      setPinError('Please validate your PIN code before continuing to payment.');
      setPinSuccess('');
      return;
    }

    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Checkout demo" title="Review delivery details" description="Preview the checkout flow. No order or payment will be submitted." />

        {cart.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Your bag is empty.</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Add a few signature frames to proceed through checkout.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Checkout preview</p>
                  <h2 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">Review your delivery details</h2>
                </div>
                <Link to="/cart" className="text-sm font-semibold text-cyan-300">Back to cart</Link>
              </div>
              <form id="checkout-form" onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <span>Full name</span>
                    <input required className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Alicia V." />
                  </label>
                  <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                    <span>Email</span>
                    <input required type="email" className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="you@example.com" />
                  </label>
                </div>
                <label className="space-y-2 text-sm text-[var(--text-secondary)]">
                  <span>Shipping address</span>
                  <input required className="w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="123 Dream Avenue, Dubai" />
                </label>
                <div className="rounded-2xl border border-amber-400/20 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
                  This is a frontend preview. Do not enter payment credentials; delivery details are not saved or sent.
                </div>

                <div className="space-y-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <label className="block text-sm text-[var(--text-secondary)]">
                    <span className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">Delivery PIN code</span>
                    <div className="flex flex-col gap-3 sm:flex-row">
                      <input
                        value={deliveryPin}
                        onChange={(event) => {
                          const numericValue = event.target.value.replace(/\D/g, '').slice(0, 6);
                          setDeliveryPin(numericValue);
                          if (pinError || pinSuccess) {
                            setPinError('');
                            setPinSuccess('');
                          }
                        }}
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={6}
                        required
                        className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-cyan-400/60"
                        placeholder="Enter 6-digit PIN"
                        aria-label="Delivery PIN code"
                      />
                      <button
                        type="button"
                        disabled={pinChecking || deliveryPin.trim().length !== 6}
                        onClick={handlePinCheck}
                        className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {pinChecking ? 'Checking...' : 'Check Availability'}
                      </button>
                    </div>
                  </label>
                  {pinError ? <p className="text-sm text-rose-300" role="alert">{pinError}</p> : null}
                  {pinSuccess ? <p className="text-sm text-emerald-300" role="status">{pinSuccess}</p> : null}
                  {!isDeliveryPinValidated && deliveryPin.length === 6 ? <p className="text-xs text-[var(--text-secondary)]">Demo PINs available: 500001, 500032, 560001, 110001, 400001.</p> : null}
                </div>

                <button
                  type="submit"
                  disabled={!isDeliveryPinValidated}
                  className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Continue to payment preview
                </button>
              </form>
            </div>
            <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 text-[var(--text-secondary)]">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Order summary</p>
              <div className="mt-6 grid gap-4">
                {cart.map((item) => (
                  <div key={getCartItemKey(item)} className="grid gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-[auto_1fr] lg:items-center">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-[20px] object-cover" />
                    <div>
                      <p className="font-semibold text-[var(--text-primary)]">{item.name}</p>
                      <p className="text-sm text-[var(--text-secondary)]">{item.quantity} × {formatINR(item.price + (item.lensSelection?.additionalPrice ?? 0))}</p>
                      <p className="mt-3 text-sm text-[var(--text-secondary)]">{item.category}</p>
                      {item.lensSelection ? <p className="mt-2 text-xs text-cyan-200">{item.lensSelection.type} · Prescription attached</p> : null}
                    </div>
                    <span className="self-center justify-self-end text-lg font-semibold text-[var(--text-primary)]">{formatINR((item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity)}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <label htmlFor="checkout-coupon" className="text-sm text-[var(--text-secondary)]">Have a coupon code?</label>
                <div className="mt-3 flex gap-2"><input id="checkout-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon} className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? 'Applying...' : 'Apply'}</button></div>
                {couponError ? <p className="mt-2 text-xs text-rose-300" role="alert">{couponError}</p> : null}
                {appliedCoupon ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cyan-200"><span>✓ Coupon {appliedCoupon.code} applied · You saved {formatINR(discount)}</span><button type="button" onClick={removeCoupon} className="text-cyan-300 underline">Remove</button></div> : null}
              </div>
              <div className="mt-6 grid gap-3 border-t border-[var(--border-subtle)] pt-5 text-sm"><div className="flex justify-between text-[var(--text-secondary)]"><span>Subtotal</span><span>{formatINR(subtotal)}</span></div>{appliedCoupon ? <div className="flex justify-between text-cyan-200"><span>{appliedCoupon.code} ({appliedCoupon.discountPercent}% OFF)</span><span>-{formatINR(discount)}</span></div> : null}<div className="flex justify-between text-lg font-semibold text-[var(--text-primary)]"><span>Total</span><span>{formatINR(total)}</span></div></div>
              <div className="mt-6 grid gap-4 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-5">
                <label className="text-sm text-[var(--text-secondary)]">
                  <span className="block text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Shipping option</span>
                  <select className="mt-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
                    <option>Standard delivery</option>
                    <option>Express delivery</option>
                    <option>Priority member dispatch</option>
                  </select>
                </label>
                <label className="text-sm text-[var(--text-secondary)]">
                  <span className="block text-xs uppercase tracking-[0.3em] text-[var(--text-secondary)]">Payment method</span>
                  <select className="mt-3 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
                    <option>Credit card</option>
                    <option>Apple Pay</option>
                    <option>PayPal</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4 text-sm text-[var(--text-secondary)]">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
                  <p className="text-sm text-[var(--text-secondary)]">Secure checkout with premium order protection.</p>
                </div>
              </div>
              <button type="submit" form="checkout-form" disabled={!isDeliveryPinValidated} className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50">Confirm & pay</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
