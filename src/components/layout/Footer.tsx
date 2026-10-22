import { useState } from 'react';
import { ArrowRight, MessageCircle, Send, Globe2, MapPin, CreditCard, Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [signupPreviewed, setSignupPreviewed] = useState(false);

  return (
    <footer className="border-t border-[var(--border-subtle)] bg-[var(--bg-secondary)] text-[var(--text-secondary)]">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <BrandLogo />
          <p className="mt-4 text-sm leading-7 text-[var(--text-secondary)]">Crafted for modern connoisseurs who value clarity, craftsmanship, and cinematic luxury.</p>
          <Link to="/stores" className="mt-6 flex items-center gap-2 rounded-[20px] border border-[var(--border-subtle)] bg-white/75 p-4 text-sm text-[var(--text-primary)] transition hover:border-[#689f24] hover:text-[#3f7000]">
            <MapPin className="h-4 w-4 text-cyan-400" /> Find a Dream Spex store
          </Link>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-primary)]">Customer care</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link to="/contact" className="transition hover:text-cyan-300">Support</Link></li>
            <li><Link to="/faq" className="transition hover:text-cyan-300">FAQ</Link></li>
            <li><Link to="/shipping-policy" className="transition hover:text-cyan-300">Shipping</Link></li>
          </ul>
          <div className="mt-6 space-y-3 text-sm text-[var(--text-secondary)]">
            <a href="https://wa.me/9949735181" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-[#b9d8c3] bg-[#e3f5e9] px-3 py-2 text-sm text-[#174c2a] transition hover:bg-[#d4efdd]">
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp us
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-primary)]">Services</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link to="/about" className="transition hover:text-cyan-300">About</Link></li>
            <li><Link to="/services" className="transition hover:text-cyan-300">Services</Link></li>
            <li><Link to="/franchise" className="transition hover:text-cyan-300">Franchise</Link></li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {[CreditCard, Truck, ShieldCheck].map((Icon, index) => <div key={index} className="rounded-full border border-[var(--border-subtle)] bg-white/75 p-2.5 text-[var(--text-secondary)]"><Icon className="h-4 w-4" /></div>)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-[var(--text-primary)]">Stay inspired</h3>
          <div className="mt-4 flex gap-3">
            {[['https://wa.me/9949735181', MessageCircle], ['mailto:hello@dreamspex.com', Send], ['/about', Globe2]].map(([href, Icon]) => (
              <a key={href as string} href={href as string} target={(href as string).startsWith('http') ? '_blank' : undefined} rel={(href as string).startsWith('http') ? 'noreferrer noopener' : undefined} className="rounded-full border border-[var(--border-subtle)] bg-white/75 p-2.5 text-[var(--text-secondary)] transition hover:border-[#689f24] hover:text-[#3f7000]">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <div className="mt-6 grid gap-3 text-sm font-medium">
            <Link to="/offers" className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)] transition hover:text-[#3f7000]">Explore current offers <ArrowRight className="h-4 w-4" /></Link>
            <Link to="/contact" className="inline-flex items-center gap-2 font-semibold text-[var(--text-primary)] transition hover:text-[#3f7000]">Talk to an advisor <ArrowRight className="h-4 w-4" /></Link>
          </div>
          <form className="mt-6" onSubmit={(event) => { event.preventDefault(); setSignupPreviewed(true); }}>
            <label htmlFor="newsletter-email" className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--text-primary)]">Newsletter</label>
            <div className="mt-2 flex gap-2">
              <input id="newsletter-email" type="email" required value={email} onChange={(event) => { setEmail(event.target.value); setSignupPreviewed(false); }} placeholder="Email address" className="min-w-0 flex-1 rounded-full border border-[var(--border-subtle)] bg-white px-4 py-2.5 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus-visible:border-[var(--focus-ring)]" />
              <button type="submit" aria-label="Preview newsletter signup" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[var(--brand-green)] text-[var(--text-primary)] transition hover:bg-[var(--brand-green-light)]"><ArrowRight className="h-4 w-4" /></button>
            </div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-secondary)]">Demo only. Newsletter sign-up is not connected.</p>
            {signupPreviewed ? <p role="status" className="mt-2 text-xs font-medium text-[#3f7000]">No subscription was sent; an email integration is required.</p> : null}
          </form>
        </div>
      </div>
      <div className="border-t border-[var(--border-subtle)] px-4 py-6 text-center text-sm text-[var(--text-secondary)] lg:px-8">
        © 2026 Dream Spex. Crafted with care for modern luxury.
      </div>
    </footer>
  );
}
