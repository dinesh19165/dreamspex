import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Menu, Search, ShoppingBag, Heart, MoonStar, UserRound, X, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import WhatsAppSupport from '../ui/WhatsAppSupport';
import BrandLogo from '../ui/BrandLogo';

const navItems = [
  { label: 'Shop', path: '/shop' },
  { label: 'Virtual Try-On', path: '/virtual-try-on' },
  { label: 'Categories', path: '/categories' },
  { label: 'Membership', path: '/membership' },
  { label: 'Offers', path: '/offers' },
  { label: 'About', path: '/about' },
  { label: 'Contact', path: '/contact' },
];

export default function Navbar() {
  const { wishlist, cart } = useShop();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className={`sticky top-0 z-50 border-b border-white/10 bg-[#0B0D18]/95 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-3 px-4 py-4 lg:px-8">
          <BrandLogo compact />

          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-300 lg:flex">
            {navItems.map((item) => (
              <Link key={item.path} to={item.path} className="group relative transition hover:text-cyan-300">
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-full origin-left scale-x-0 rounded-full bg-cyan-400 transition-transform duration-300 group-hover:scale-x-100" />
              </Link>
            ))}
          </nav>

          <div className="hidden flex-1 items-center justify-center lg:flex">
            <button onClick={() => setSearchOpen(true)} className="flex w-full max-w-xl items-center justify-between rounded-full border border-white/10 bg-white/10 px-4 py-3 text-sm text-slate-300 shadow-inner shadow-black/20 backdrop-blur-xl">
              <span className="flex items-center gap-2"><Search className="h-4 w-4 text-slate-400" /> Search frames, styles, offers</span>
              <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] uppercase tracking-[0.25em] text-slate-400">⌘ K</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10" aria-label="Toggle theme">
              <MoonStar className="h-4 w-4" />
            </button>
            <button onClick={() => setSearchOpen(true)} className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 lg:hidden" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <Link to="/wishlist" className="relative rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10">
              <Heart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{wishlist.length}</span>
            </Link>
            <Link to="/cart" className="relative rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10">
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </Link>
            <Link to="/login" className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10">
              <UserRound className="h-4 w-4" />
            </Link>
            <WhatsAppSupport label="" className="h-10 w-10 p-0" />
            <button className="rounded-full border border-white/10 bg-white/5 p-2.5 text-slate-200 transition hover:bg-white/10 lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-start justify-center bg-[#03050c]/80 px-4 py-16 backdrop-blur-2xl">
            <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="w-full max-w-2xl rounded-[28px] border border-white/10 bg-[#07101f]/95 p-6 shadow-2xl">
              <div className="flex items-center gap-3 rounded-full border border-white/10 bg-white/10 px-4 py-3">
                <Search className="h-4 w-4 text-slate-400" />
                <input autoFocus className="w-full bg-transparent text-sm text-slate-100 outline-none placeholder:text-slate-500" placeholder="Search your next frame" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {['Aurelia Rimless', 'Nocturne Shield', 'Lumen Blue Light', 'Solstice Luxe'].map((item) => (
                  <div key={item} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-slate-300">{item}</div>
                ))}
              </div>
              <button className="mt-6 text-sm font-semibold text-cyan-300" onClick={() => setSearchOpen(false)}>Close search</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open ? <div className="fixed inset-0 z-40 bg-[#03050c]/70 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} /> : null}
      <motion.div initial={false} animate={{ x: open ? 0 : '100%' }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} className="fixed right-0 top-0 z-50 h-full w-80 max-w-[85vw] border-l border-white/10 bg-[#060b17] p-6 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> <p className="text-sm font-semibold uppercase tracking-[0.3em]">Menu</p></div>
          <button className="rounded-full border border-white/10 p-2 text-slate-200" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-8 space-y-3">
          {navItems.map((item) => (
            <Link key={item.path} to={item.path} className="block rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-medium text-slate-200" onClick={() => setOpen(false)}>
              {item.label}
            </Link>
          ))}
        </div>
      </motion.div>
    </>
  );
}
