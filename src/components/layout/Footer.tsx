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
      <div className="mx-auto grid max-w-7xl gap-x-8 gap-y-10 px-4 py-14 sm:px-6 md:grid-cols-2 lg:grid-cols-[1.35fr_0.85fr_0.85fr_1fr] lg:px-8 lg:py-16">
        <div className="flex min-w-0 flex-col items-center justify-center pr-0 text-center lg:border-r lg:border-[#2A5688]/70 lg:pr-8">
          {homepageSubtitle ? <p className="max-w-[13ch] font-serif text-4xl italic leading-[1.05] tracking-tight text-[#F2F7FF] sm:text-6xl">{homepageSubtitle}</p> : null}
          {/* <p className={`${homepageSubtitle ? 'mt-4' : ''} max-w-sm text-sm leading-7 text-[#B9CCE5]`}>Crafted for modern connoisseurs who value clarity, craftsmanship, and cinematic luxury.</p> */}
          {/* <Link to="/stores" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#66A4E5] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#174D82] hover:shadow-[0_10px_25px_rgba(8,47,94,0.35)]">
            <MapPin className="h-4 w-4 text-[#93C5FD]" /> Find a Dream Spex Store
          </Link> */}
        </div>
        <div className="lg:border-r lg:border-[#2A5688]/70 lg:px-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Customer Care</h3>
          <ul className="mt-5 space-y-3 text-sm">
            <li><Link to="/contact" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Support</Link></li>
            <li><Link to="/faq" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">FAQ</Link></li>
            <li><Link to="/shipping-policy" className="inline-flex transition duration-200 hover:translate-x-1 hover:text-[#93C5FD]">Shipping</Link></li>
          </ul>
          <div className="mt-6">
            {/* <a href="https://wa.me/9949735181" target="_blank" rel="noreferrer noopener" className="inline-flex items-center gap-2 rounded-full border border-[#2F78B8] bg-[#0D3F72]/70 px-4 py-2.5 text-sm font-medium text-white transition duration-300 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#17558C]">
              <MessageCircle className="h-4 w-4 text-[#93C5FD]" /> WhatsApp Us
            </a> */}
          </div>
        </div>
        <div className="lg:border-r lg:border-[#2A5688]/70 lg:px-8">
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
        <div className="lg:pl-8">
          <h3 className="text-sm font-semibold uppercase tracking-[0.22em] text-white">Stay Inspired</h3>
          <div className="mt-5 flex gap-3" aria-label="Dream Spex social links">
            {[['https://wa.me/9949735181', MessageCircle], ['mailto:hello@dreamspex.com', Send], ['/about', Globe2]].map(([href, Icon]) => (
              (href as string).startsWith('/') ? (
                <Link key={href as string} to={href as string} aria-label="Visit Dream Spex" className="rounded-full border border-[#2F78B8] bg-[#0D3F72]/60 p-3 text-[#93C5FD] transition duration-300 hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#17558C]">
                  <Icon className="h-4 w-4" />
                </Link>
              ) : (
                <a key={href as string} href={href as string} target={(href as string).startsWith('http') ? '_blank' : undefined} rel={(href as string).startsWith('http') ? 'noreferrer noopener' : undefined} aria-label={(href as string).includes('mailto') ? 'Email Dream Spex' : 'Chat with Dream Spex on WhatsApp'} className="rounded-full border border-[#2F78B8] bg-[#0D3F72]/60 p-3 text-[#93C5FD] transition duration-300 hover:-translate-y-1 hover:border-[#93C5FD] hover:bg-[#17558C]">
                  <Icon className="h-4 w-4" />
                </a>
              )
            ))}
          </div>
          <div className="mt-6 text-sm font-medium">
            <Link to="/offers" className="group inline-flex items-center gap-2 font-semibold text-white transition duration-200 hover:text-[#93C5FD]">Explore Current Offers <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" /></Link>
          </div>
          <Link to="/stores" className="mt-6 inline-flex items-center gap-2 rounded-full border border-[#66A4E5] px-5 py-3 text-sm font-semibold text-white transition duration-300 hover:-translate-y-0.5 hover:border-[#93C5FD] hover:bg-[#174D82] hover:shadow-[0_10px_25px_rgba(8,47,94,0.35)]">
          <MapPin className="h-4 w-4 text-[#93C5FD]" /> Find a Dream Spex Store
          </Link>
        </div>
      </div>
      <div className="border-t border-[#315D91] bg-[#09284F]/80 px-4 py-5 text-center text-sm text-[#B9CCE5] lg:px-8">
        <span>Copyright © 2026 Dream Spex.</span>
      </div>
    </footer>
  );
}
