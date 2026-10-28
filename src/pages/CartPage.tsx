import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShoppingCart, Trash2 } from 'lucide-react';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';
import { getCartItemKey } from '../utils/cart';
import { formatINR } from '../utils/currency';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, appliedCoupon, applyCoupon, removeCoupon, subtotal, discount, total } = useShop();
  const [couponCode, setCouponCode] = useState('');
  const [couponError, setCouponError] = useState('');
  const [couponLoading, setCouponLoading] = useState(false);
  const handleApplyCoupon = async () => { setCouponLoading(true); setCouponError(''); await new Promise((resolve) => window.setTimeout(resolve, 350)); if (!applyCoupon(couponCode)) setCouponError('Invalid coupon code.'); setCouponLoading(false); };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
        <SectionTitle eyebrow="Cart" title="Your selected frames" description="Review your order, refine quantities, and continue to checkout." />

        {cart.length === 0 ? (
          <div className="mt-10 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center backdrop-blur-xl">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Your bag is empty.</p>
            <p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Choose your favourite frames and they’ll appear here instantly.</p>
            <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">Browse frames</Link>
          </div>
        ) : (
          <div className="mt-10 grid grid-cols-1 gap-8 lg:grid-cols-[1.3fr_0.9fr]">
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={getCartItemKey(item)} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 backdrop-blur-xl">
                  <div className="flex flex-wrap items-center gap-4">
                    <img src={item.image} alt={item.name} className="h-24 w-24 rounded-[20px] object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{item.category}</p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{item.name}</h3>
                      <p className="mt-2 text-sm leading-6 text-[var(--text-secondary)]">{item.description}</p>
                      {item.lensSelection ? <p className="mt-3 text-sm text-cyan-200">{item.lensSelection.type} · {item.lensSelection.coatings.length ? item.lensSelection.coatings.join(', ') : 'No coating selected'}</p> : null}
                    </div>
                    <button onClick={() => removeFromCart(getCartItemKey(item))} aria-label={`Remove ${item.name} from cart`} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[var(--border-subtle)] pt-4 text-sm text-[var(--text-secondary)]">
                    <div className="flex items-center gap-2">
                      <button onClick={() => updateQuantity(getCartItemKey(item), item.quantity - 1)} aria-label={`Decrease ${item.name} quantity`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)]">-</button>
                      <span className="min-w-[2rem] text-center font-semibold text-[var(--text-primary)]">{item.quantity}</span>
                      <button onClick={() => updateQuantity(getCartItemKey(item), item.quantity + 1)} aria-label={`Increase ${item.name} quantity`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-[var(--text-secondary)]">+</button>
                    </div>
                    <span className="text-lg font-semibold text-[var(--text-primary)]">{formatINR((item.price + (item.lensSelection?.additionalPrice ?? 0)) * item.quantity)}</span>
                  </div>
                </div>
              ))}
            </div>

            <aside className="rounded-[32px] border border-cyan-400/20 bg-gradient-to-br from-[var(--bg-secondary)] to-[var(--bg-primary)] p-8 text-[var(--text-secondary)]">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-300">Order summary</p>
                  <p className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Ready to checkout</p>
                </div>
                <ShoppingCart className="h-6 w-6 text-cyan-300" />
              </div>

              <div className="mt-6 space-y-4">
                <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Items</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{cart.reduce((sum, item) => sum + item.quantity, 0)} products</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
                  <p className="text-sm text-[var(--text-secondary)]">Subtotal</p>
                  <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatINR(subtotal)}</p>
                </div>
                <div className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-secondary)] p-4">
                  <label htmlFor="cart-coupon" className="text-sm text-[var(--text-secondary)]">Have a coupon code?</label>
                  <div className="mt-3 flex gap-2"><input id="cart-coupon" value={couponCode} onChange={(event) => setCouponCode(event.target.value)} placeholder="Enter coupon code" className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" /><button type="button" disabled={couponLoading || !couponCode.trim()} onClick={handleApplyCoupon} className="rounded-full bg-[#7CBF00] px-4 py-3 text-sm font-semibold text-[var(--text-primary)] disabled:cursor-not-allowed disabled:opacity-50">{couponLoading ? 'Applying...' : 'Apply'}</button></div>
                  {couponError ? <p className="mt-2 text-xs text-rose-300" role="alert">{couponError}</p> : null}
                  {appliedCoupon ? <div className="mt-3 flex items-center justify-between gap-3 text-xs text-cyan-200"><span>✓ Coupon {appliedCoupon.code} applied · You saved {formatINR(discount)}</span><button type="button" onClick={removeCoupon} className="text-cyan-300 underline">Remove</button></div> : null}
                </div>
                {appliedCoupon ? <div className="flex items-center justify-between text-sm text-cyan-200"><span>{appliedCoupon.code} ({appliedCoupon.discountPercent}% OFF)</span><span>-{formatINR(discount)}</span></div> : null}
                <div className="flex items-center justify-between border-t border-[var(--border-subtle)] pt-4 text-base font-semibold text-[var(--text-primary)]"><span>Total</span><span>{formatINR(total)}</span></div>
                <p className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 text-sm leading-6 text-[var(--text-secondary)]">Delivery options and payment methods are shown in the demo checkout. No real payment is processed.</p>
              </div>

              <Link to="/checkout" className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-4 text-sm font-semibold text-[var(--text-primary)] transition hover:brightness-110">
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
