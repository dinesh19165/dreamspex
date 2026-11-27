import { useEffect, useState } from 'react';
import { ArrowRight, MessageCircle, Send, Globe2, MapPin, CreditCard, Truck, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';
import { fetchHomepage } from '../../services/homepageService';

export default function Footer() {
  const [homepageSubtitle, setHomepageSubtitle] = useState<string | null>(null);

  useEffect(() => {
    let activeRequest: AbortController | null = null;
    const loadSubtitle = () => {
      activeRequest?.abort();
      const request = new AbortController();
      activeRequest = request;
      void fetchHomepage(request.signal).then((homepage) => {
        const subtitle = homepage.banners.find((banner) => banner.subtitle?.trim())?.subtitle?.trim() ?? null;
        setHomepageSubtitle(subtitle);
      }).catch((error: unknown) => {
        if (!request.signal.aborted) console.error('[Footer] Homepage subtitle could not be loaded.', error);
      });
    };

    loadSubtitle();
    window.addEventListener('focus', loadSubtitle);
    return () => {
      window.removeEventListener('focus', loadSubtitle);
      activeRequest?.abort();
    };
  }, []);

  return (
    <footer className="border-t border-[#16416f] bg-gradient-to-br from-[#061B3A] to-[#0B3470] text-[#B9CCE5]">
      {homepageSubtitle ? (
        <div className="mx-auto max-w-7xl px-4 pt-10 text-center sm:px-6 lg:px-8">
          <p className="mx-auto max-w-3xl font-serif text-2xl italic leading-tight tracking-tight text-[#F2F7FF] sm:text-3xl">{homepageSubtitle}</p>
        </div>
      ) : null}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-x-10 gap-y-10 px-4 py-12 sm:px-6 md:grid-cols-2 lg:grid-cols-4 lg:gap-y-12 lg:px-8 lg:py-14">
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Customer Care</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link to="/contact" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Support</Link></li>
            <li><Link to="/faq" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">FAQ</Link></li>
            <li><Link to="/shipping-policy" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Shipping</Link></li>
          </ul>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Services</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link to="/about" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">About</Link></li>
            <li><Link to="/services" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Services</Link></li>
            <li><Link to="/franchise" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Franchise</Link></li>
          </ul>
          <div className="mt-6 flex flex-wrap gap-2" aria-label="Dream Spex services">
            {[CreditCard, Truck, ShieldCheck].map((Icon, index) => <div key={index} className="rounded-full border border-[#2F78B8] bg-[#0D3F72]/60 p-2.5 text-[#93C5FD]"><Icon className="h-4 w-4" /></div>)}
          </div>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Visit Our Store</h3>
          <p className="mt-5 text-sm font-medium text-white">Dream Spex</p>
          <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d1903.1327154509477!2d78.57042614077469!3d17.44700537734677!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3bcb9d5ca95ac6e9%3A0xcd9a353aaf0e61c1!2sDream%20Spex!5e0!3m2!1sen!2sin!4v1795757992496!5m2!1sen!2sin"
            width="600"
            height="450"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="strict-origin-when-cross-origin"
            title="Dream Spex store location"
            className="mt-3 block h-[200px] w-full max-w-[260px] rounded-lg"
          />
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Stay Inspired</h3>
          <div className="mt-5 flex items-center gap-3" aria-label="Dream Spex social links">
            {[['https://wa.me/9949735181', MessageCircle], ['mailto:hello@dreamspex.com', Send], ['/about', Globe2]].map(([href, Icon]) => (
              (href as string).startsWith('/') ? (
                <Link key={href as string} to={href as string} aria-label="Visit Dream Spex" className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2F78B8] bg-[#0D3F72]/60 text-[#93C5FD] transition duration-300 hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#17558C]">
                  <Icon className="h-4 w-4" />
                </Link>
              ) : (
                <a key={href as string} href={href as string} target={(href as string).startsWith('http') ? '_blank' : undefined} rel={(href as string).startsWith('http') ? 'noreferrer noopener' : undefined} aria-label={(href as string).includes('mailto') ? 'Email Dream Spex' : 'Chat with Dream Spex on WhatsApp'} className="flex h-11 w-11 items-center justify-center rounded-full border border-[#2F78B8] bg-[#0D3F72]/60 text-[#93C5FD] transition duration-300 hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#17558C]">
                  <Icon className="h-4 w-4" />
                </a>
              )
            ))}
          </div>
          <div className="mt-6 flex flex-col items-start gap-4 text-sm font-medium">
            <Link to="/offers" className="group inline-flex items-center gap-2 font-semibold text-white transition duration-200 hover:text-[#93C5FD]">Explore Current Offers <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
            <Link to="/stores" className="inline-flex items-center gap-2 rounded-full border border-[#66A4E5] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#174D82] hover:shadow-[0_10px_25px_rgba(8,47,94,0.35)]">
              <MapPin className="h-4 w-4 text-[#93C5FD]" /> Find a Dream Spex Store
            </Link>
          </div>
        </div>
      </div>
      <div className="border-t border-[#315D91] bg-[#09284F]/80 px-4 py-6 text-center text-sm text-[#B9CCE5] sm:py-7 lg:px-8">
        <span>Copyright © 2026 Dream Spex.</span>
      </div>
    </footer>
  );
}
