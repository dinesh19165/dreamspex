import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';

export default function CheckoutPage() {
  const { cart, appliedCoupon, applyCoupon, removeCoupon, subtotal, discount, total } = useShop();
  const navigate = useNavigate();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const handleApplyCoupon = async () => { setCouponLoading(true); setCouponError(''); await new Promise((resolve) => window.setTimeout(resolve, 350)); if (!applyCoupon(couponCode)) setCouponError('Invalid coupon code.'); setCouponLoading(false); };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    navigate('/payment');
  };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Checkout" title="Secure payment and delivery" description="Complete your order with a refined checkout flow." />

        {cart.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-white">Your bag is empty.</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">Add a few signature frames to proceed through checkout.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Continue shopping</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[32px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Order</p>
                  <h2 className="mt-2 text-3xl font-semibold text-white">Review your delivery details</h2>
                </div>
                <Link to="/cart" className="text-sm font-semibold text-cyan-300">Back to cart</Link>
              </div>
              <form id="checkout-form" onSubmit={handleSubmit} className="mt-8 space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Full name</span>
                    <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="Alicia V." />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Email</span>
                    <input required type="email" className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="you@example.com" />
                  </label>
                </div>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Shipping address</span>
                  <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="123 Dream Avenue, Dubai" />
                </label>
                <label className="space-y-2 text-sm text-slate-300">
                  <span>Card number</span>
                  <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="1234 5678 9012 3456" />
                </label>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Expiry</span>
                    <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="MM/YY" />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>CVC</span>
                    <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="123" />
                  </label>
                  <label className="space-y-2 text-sm text-slate-300">
                    <span>Postal code</span>
                    <input required className="w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" placeholder="90210" />
                  </label>
                </div>
                <button type="submit" className="w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110">Place order</button>
              </form>
            </div>
            <div className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8 text-slate-300">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Order summary</p>
              <div className="mt-6 grid gap-4">
                {cart.map((item) => (
                  <div key={item.id} className="grid gap-4 rounded-[20px] border border-white/10 bg-white/5 p-4 lg:grid-cols-[auto_1fr] lg:items-center">
                    <img src={item.image} alt={item.name} className="h-20 w-20 rounded-[20px] object-cover" />
                    <div>
                      <p className="font-semibold text-white">{item.name}</p>
                      <p className="text-sm text-slate-400">{item.quantity} × ${item.price + (item.lensSelection?.additionalPrice ?? 0)}</p>
                      <p className="mt-3 text-sm text-slate-300">{item.category}</p>
                      {item.lensSelection ? <p className="mt-2 text-xs text-cyan-200">{item.lensSelection.type} · Prescription attached</p> : null}
                    </div>
                    <span className="self-center justify-self-end text-lg font-semibold text-white">${(item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity}</span>
                  </div>
                ))}
              </div>
              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/10 p-5">
                <label htmlFor="checkout-coupon" className="text-sm text-slate-300">Have a coupon code?</label>
                <div className="mt-3 flex gap-2"><input id="checkout-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon} className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? 'Applying...' : 'Apply'}</button></div>
                {couponError ? <p className="mt-2 text-xs text-rose-300" role="alert">{couponError}</p> : null}
                {appliedCoupon ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cyan-200"><span>✓ Coupon {appliedCoupon.code} applied · You saved ${discount}</span><button type="button" onClick={removeCoupon} className="text-cyan-300 underline">Remove</button></div> : null}
              </div>
              <div className="mt-6 grid gap-3 border-t border-white/10 pt-5 text-sm"><div className="flex justify-between text-slate-400"><span>Subtotal</span><span>${subtotal}</span></div>{appliedCoupon ? <div className="flex justify-between text-cyan-200"><span>{appliedCoupon.code} ({appliedCoupon.discountPercent}% OFF)</span><span>-${discount}</span></div> : null}<div className="flex justify-between text-lg font-semibold text-white"><span>Total</span><span>${total}</span></div></div>
              <div className="mt-6 grid gap-4 rounded-[20px] border border-white/10 bg-white/10 p-5">
                <label className="text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.3em] text-slate-400">Shipping option</span>
                  <select className="mt-3 w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none">
                    <option>Standard delivery</option>
                    <option>Express delivery</option>
                    <option>Priority member dispatch</option>
                  </select>
                </label>
                <label className="text-sm text-slate-300">
                  <span className="block text-xs uppercase tracking-[0.3em] text-slate-400">Payment method</span>
                  <select className="mt-3 w-full rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none">
                    <option>Credit card</option>
                    <option>Apple Pay</option>
                    <option>PayPal</option>
                  </select>
                </label>
              </div>
              <div className="mt-6 rounded-[20px] border border-white/10 bg-white/10 p-4 text-sm text-slate-300">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-1 h-5 w-5 text-cyan-300" />
                  <p className="text-sm text-slate-200">Secure checkout with premium order protection.</p>
                </div>
              </div>
              <button type="submit" form="checkout-form" className="mt-4 w-full rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110">Confirm & pay</button>
            </div>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
