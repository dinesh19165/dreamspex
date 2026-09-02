import { Link, useLocation } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import { useShop } from '../context/ShopContext';
import BrandLogo from '../components/ui/BrandLogo';

const policyPages = [
  { title: 'FAQ', description: 'Find answers to common questions about fit, delivery, and services.' },
  { title: 'Privacy Policy', description: 'Review how we handle personal information with care and transparency.' },
  { title: 'Terms', description: 'Read the conditions that apply to purchases and account use.' },
  { title: 'Shipping Policy', description: 'See our shipping, timing, and delivery expectations.' },
  { title: 'Return Policy', description: 'Learn more about returns, refunds, and exchanges.' },
  { title: 'Login', description: 'Access your account and saved preferences.' },
  { title: 'Register', description: 'Create a new account to track orders and manage memberships.' },
  { title: 'Forgot Password', description: 'Securely reset your account password in minutes.' },
  { title: 'Wishlist', description: 'Save your favourite pieces and revisit them anytime.' },
  { title: 'Cart', description: 'Review selected frames and proceed to checkout.' },
  { title: 'Checkout', description: 'Complete your order with delivery and payment options.' },
  { title: 'Order Success', description: 'Confirmation screen for a completed purchase.' },
  { title: 'Order Tracking', description: 'Track the delivery progress of your order.' },
  { title: 'My Orders', description: 'Manage your purchase history and delivery status.' },
  { title: 'Profile', description: 'Control your account details, addresses, and preferences.' },
  { title: '404 Page', description: 'A polished not-found experience for unexpected routes.' },
];

export default function OtherPages() {
  const location = useLocation();
  const { wishlist, cart, removeFromWishlist, removeFromCart, updateQuantity, clearCart } = useShop();
  const pathname = location.pathname;

  if (pathname === '/wishlist') {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <SectionTitle eyebrow="Wishlist" title="Saved pieces for later" description="Keep your favourite frames in one place and revisit them anytime." />
          {wishlist.length === 0 ? (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
              <p className="text-lg font-semibold text-white">Your wishlist is empty.</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Explore the shop and save the frames you love.</p>
              <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Browse frames</Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-2">
              {wishlist.map((product) => (
                <div key={product.id} className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{product.category}</p>
                      <h3 className="mt-2 text-xl font-semibold text-white">{product.name}</h3>
                      <p className="mt-3 text-sm leading-7 text-slate-400">{product.description}</p>
                    </div>
                    <button onClick={() => removeFromWishlist(product.id)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Remove</button>
                  </div>
                  <div className="mt-6 flex items-center justify-between">
                    <span className="text-lg font-semibold text-white">${product.price}</span>
                    <Link to={`/product/${product.id}`} className="text-sm font-semibold text-cyan-300">View details</Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (pathname === '/cart') {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <SectionTitle eyebrow="Cart" title="Your selected frames" description="Review your order, adjust quantities, and move to checkout." />
          {cart.length === 0 ? (
            <div className="mt-10 rounded-[24px] border border-white/10 bg-white/5 p-10 text-center backdrop-blur-xl">
              <p className="text-lg font-semibold text-white">Your bag is empty.</p>
              <p className="mt-3 text-sm leading-7 text-slate-400">Add a few signature frames and they’ll appear here instantly.</p>
              <Link to="/shop" className="mt-6 inline-flex items-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-white">Shop now</Link>
            </div>
          ) : (
            <div className="mt-10 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                {cart.map((item) => (
                  <div key={item.id} className="rounded-[24px] border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">{item.category}</p>
                        <h3 className="mt-2 text-xl font-semibold text-white">{item.name}</h3>
                      </div>
                      <button onClick={() => removeFromCart(item.id)} className="rounded-full border border-white/10 px-3 py-2 text-sm text-slate-300">Remove</button>
                    </div>
                    <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
                      <div className="flex items-center gap-3">
                        <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="rounded-full border border-white/10 px-3 py-2 text-slate-200">-</button>
                        <span className="min-w-8 text-center text-sm font-semibold text-white">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="rounded-full border border-white/10 px-3 py-2 text-slate-200">+</button>
                      </div>
                      <span className="text-lg font-semibold text-white">${item.price * item.quantity}</span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-[#0f1b37] to-[#060b17] p-8">
                <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Summary</p>
                <div className="mt-6 space-y-4 text-sm text-slate-300">
                  <div className="flex items-center justify-between"><span>Items</span><span>{cart.reduce((sum, item) => sum + item.quantity, 0)}</span></div>
                  <div className="flex items-center justify-between"><span>Subtotal</span><span>${cart.reduce((sum, item) => sum + item.price * item.quantity, 0)}</span></div>
                </div>
                <button onClick={clearCart} className="mt-8 w-full rounded-full border border-white/10 px-4 py-3 text-sm font-semibold text-white">Clear bag</button>
                <Link to="/checkout" className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-white">Proceed to checkout</Link>
              </div>
            </div>
          )}
        </main>
        <Footer />
      </div>
    );
  }

  if (pathname === '/profile') {
    return (
      <div className="min-h-screen bg-[#050816] text-slate-100">
        <Navbar />
        <main className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
          <SectionTitle eyebrow="Profile" title="Your luxury account" description="Manage your preferences, details, and member perks from one place." />
          <div className="mt-10 grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <p className="text-sm font-semibold uppercase tracking-[0.3em] text-cyan-400">Member status</p>
              <h3 className="mt-4 text-2xl font-semibold text-white">Platinum member</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">Enjoy priority dispatch, private launches, and a dedicated concierge experience.</p>
            </div>
            <div className="rounded-[24px] border border-white/10 bg-white/5 p-8 backdrop-blur-xl">
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  ['Name', 'Alicia V.'],
                  ['Email', 'alicia@example.com'],
                  ['Address', 'Dubai, UAE'],
                  ['Preferences', 'Titanium / Blue light / Minimal'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-[18px] border border-white/10 bg-slate-950/60 p-4">
                    <p className="text-sm text-slate-400">{label}</p>
                    <p className="mt-2 font-semibold text-white">{value}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0B0D18] text-slate-100">
      <Navbar />
      <main className="mx-auto max-w-7xl px-4 py-16 lg:px-8">
        {(pathname === '/login' || pathname === '/register' || pathname === '/forgot-password') ? <div className="mb-10 flex justify-center"><BrandLogo /></div> : null}
        <SectionTitle eyebrow="Additional pages" title="The full static storefront experience" description="These sections are ready for expansion and future API hookup." />
        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
          {policyPages.map((page) => (
            <div key={page.title} className="rounded-[24px] border border-white/10 bg-[#151823] p-8 shadow-sm">
              <h3 className="text-xl font-semibold text-white">{page.title}</h3>
              <p className="mt-3 text-sm leading-7 text-slate-400">{page.description}</p>
            </div>
          ))}
        </div>
      </main>
      <Footer />
    </div>
  );
}
