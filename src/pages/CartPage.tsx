import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Trash2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, appliedCoupon, applyCoupon, removeCoupon, subtotal, discount, total } = useShop();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const handleApplyCoupon = async () => { setCouponLoading(true); setCouponError(''); await new Promise((resolve) => window.setTimeout(resolve, 350)); if (!applyCoupon(couponCode)) setCouponError('Invalid coupon code.'); setCouponLoading(false); };

  return (
    <div className="min-h-screen bg-[#050816] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Cart" title="Your selected frames" description="Review your order, refine quantities, and continue to checkout." />

        {cart.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-white">Your bag is empty.</p>
            <p className="mt-3 text-sm leading-7 text-slate-400">Choose your favourite frames and they’ll appear here instantly.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Browse frames</Link>
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.id} className="rounded-[28px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={item.image} alt={item.name} className="h-24 w-24 rounded-[20px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{item.category}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{item.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-400">{item.description}</p>
                      {item.lensSelection ? <p className="mt-3 text-sm text-cyan-200">{item.lensSelection.type} · {item.lensSelection.coatings.length ? item.lensSelection.coatings.join(', ') : 'No coating selected'}</p> : null}
                    </div>
                    <button onClick={() => removeFromCart(item.id)} className="rounded-full border border-white/10 bg-slate-950/60 p-3 text-slate-300 transition hover:bg-white/10">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-white/10 pt-4 text-sm text-slate-300">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-full border border-white/10 px-3 py-2 text-slate-200">-</button>
                      <span className="min-w-[2rem] text-center font-semibold text-white">{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-full border border-white/10 px-3 py-2 text-slate-200">+</button>
                    </div>
                    <span className="text-lg font-semibold text-white">${(item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity}</span>
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8 text-slate-300">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Order summary</p>
                  <p className="mt-2 text-2xl font-semibold text-white">Ready to checkout</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-cyan-300" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Items</p>
                  <p className="mt-2 text-lg font-semibold text-white">{cart.reduce((sum, item) => sum + item.quantity, 0)} products</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/5 p-4">
                  <p className="text-sm text-slate-400">Subtotal</p>
                  <p className="mt-2 text-lg font-semibold text-white">${subtotal}</p>
                </div>
                <div className="rounded-[20px] border border-white/10 bg-white/10 p-4">
                  <label htmlFor="cart-coupon" className="text-sm text-slate-300">Have a coupon code?</label>
                  <div className="mt-3 flex gap-2"><input id="cart-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-full border border-white/10 bg-[#050816] px-4 py-3 text-sm text-white outline-none" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon} className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? 'Applying...' : 'Apply'}</button></div>
                  {couponError ? <p className="mt-2 text-xs text-rose-300" role="alert">{couponError}</p> : null}
                  {appliedCoupon ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cyan-200"><span>✓ Coupon {appliedCoupon.code} applied · You saved ${discount}</span><button type="button" onClick={removeCoupon} className="text-cyan-300 underline">Remove</button></div> : null}
                </div>
                {appliedCoupon ? <div className="flex items-center justify-between text-sm text-cyan-200"><span>{appliedCoupon.code} ({appliedCoupon.discountPercent}% OFF)</span><span>-${discount}</span></div> : null}
                <div className="flex items-center justify-between border-t border-white/10 pt-4 text-base font-semibold text-white"><span>Total</span><span>${total}</span></div>
                <div className="grid gap-3 rounded-[20px] border border-white/10 bg-white/10 p-4">
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
              </div>

              <Link to="/checkout" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-white transition hover:brightness-110">
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>
            </aside>
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
