import { ArrowRight, MessageCircle, Send, Globe2, MapPin, Smartphone, CreditCard, Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import BrandLogo from '../ui/BrandLogo';

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-[#03050c] text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:px-8">
        <div>
          <BrandLogo />
          <p className="mt-4 text-sm leading-7 text-slate-400">Crafted for modern connoisseurs who value clarity, craftsmanship, and cinematic luxury.</p>
          <div className="mt-6 rounded-[20px] border border-white/10 bg-white/5 p-4 text-sm text-slate-400">
            <div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-cyan-400" /> Store locator: Dubai, London, New York</div>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Customer care</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link to="/contact" className="transition hover:text-cyan-300">Support</Link></li>
            <li><Link to="/faq" className="transition hover:text-cyan-300">FAQ</Link></li>
            <li><Link to="/shipping-policy" className="transition hover:text-cyan-300">Shipping</Link></li>
          </ul>
          <div className="mt-6 space-y-3 text-sm text-slate-400">
            <div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-cyan-400" /> +971 4 555 0199</div>
            <a href="https://wa.me/9949735181" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#25D366]/15 px-3 py-2 text-sm text-slate-100 transition hover:bg-[#25D366]/25">
              <MessageCircle className="h-4 w-4 text-[#25D366]" /> WhatsApp us
            </a>
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Services</h3>
          <ul className="mt-4 space-y-3 text-sm">
            <li><Link to="/about" className="transition hover:text-cyan-300">About</Link></li>
            <li><Link to="/services" className="transition hover:text-cyan-300">Services</Link></li>
            <li><Link to="/franchise" className="transition hover:text-cyan-300">Franchise</Link></li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2">
            {[CreditCard, Truck, ShieldCheck].map((Icon, index) => <div key={index} className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-300"><Icon className="h-4 w-4" /></div>)}
          </div>
        </div>
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white">Stay inspired</h3>
          <div className="mt-4 flex gap-3">
            {[MessageCircle, Send, Globe2].map((Icon, index) => (
              <a key={index} href="#" className="rounded-full border border-white/10 bg-white/5 p-2.5 transition hover:border-cyan-400 hover:text-cyan-400">
                <Icon className="h-4 w-4" />
              </a>
            ))}
          </div>
          <a href="#" className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-white">
            Join newsletter <ArrowRight className="h-4 w-4" />
          </a>
          <div className="mt-6 text-sm text-slate-400">Download app • Payment methods • Shipping partners</div>
        </div>
      </div>
      <div className="border-t border-white/10 px-4 py-6 text-center text-sm text-slate-500 lg:px-8">
        © 2026 Dream Spex. Crafted with care for modern luxury.
      </div>
    </footer>
  );
}
