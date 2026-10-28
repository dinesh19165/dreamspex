import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, LayoutDashboard, LogOut, Menu, Search, ShoppingBag, Heart, Settings, UserRound, WalletCards, X, Sparkles, Truck, ShieldCheck, RotateCcw } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/useAuth';
import BrandLogo from '../ui/BrandLogo';
import LocationSelector from '../ui/LocationSelector';
import { products } from '../../data/mockData';

const navItems = [
  { label: 'Eyeglasses', path: '/shop?category=frames' },
  { label: 'Sunglasses', path: '/shop?category=sunglasses' },
  { label: 'Computer Glasses', path: '/shop?category=computer-glasses' },
  { label: 'Kids', path: '/shop?category=kids-collection' },
  { label: 'Contact lenses', path: '/shop?category=contact-lenses' },
  { label: 'Accessories', path: '/shop?category=accessories' },
  { label: 'Collections', path: '/categories' },
  { label: 'Offers', path: '/offers' },
  { label: 'Eye Care', path: '/services' },
  { label: 'Services', path: '/services' },
];

type MegaMenuGroup = { title: string; items: { label: string; path: string }[] };
type MegaMenu = { label: string; groups: MegaMenuGroup[] };

const megaMenus: MegaMenu[] = [
  {
    label: 'Eyeglasses',
    groups: [
      { title: 'Shop by category', items: [{ label: 'Prescription frames', path: '/shop?category=frames' }, { label: 'Computer glasses', path: '/shop?category=computer-glasses' }] },
      { title: 'Shop by material', items: [...new Set(products.filter((product) => product.category === 'Frames').map((product) => product.material))].map((material) => ({ label: material, path: `/shop?category=frames&material=${encodeURIComponent(material)}` })) },
      { title: 'Shop by colour', items: [...new Set(products.filter((product) => product.category === 'Frames').flatMap((product) => product.colors))].map((color) => ({ label: color, path: `/shop?category=frames&color=${encodeURIComponent(color)}` })) },
      { title: 'Featured', items: [{ label: 'New Arrivals', path: '/shop?badge=New' }, { label: 'Bestsellers', path: '/shop?badge=Bestseller' }, { label: 'Premium Collection', path: '/shop?category=luxury-collection' }] },
    ],
  },
  {
    label: 'Sunglasses',
    groups: [
      { title: 'Shop by category', items: [{ label: 'Sunglasses', path: '/shop?category=sunglasses' }] },
      { title: 'Available materials', items: [...new Set(products.filter((product) => product.category === 'Sunglasses').map((product) => product.material))].map((material) => ({ label: material, path: `/shop?category=sunglasses&material=${encodeURIComponent(material)}` })) },
      { title: 'Available colours', items: [...new Set(products.filter((product) => product.category === 'Sunglasses').flatMap((product) => product.colors))].map((color) => ({ label: color, path: `/shop?category=sunglasses&color=${encodeURIComponent(color)}` })) },
      { title: 'Featured', items: [{ label: 'New Arrivals', path: '/shop?badge=New' }, { label: 'Bestsellers', path: '/shop?badge=Bestseller' }, { label: 'Premium Collection', path: '/shop?category=luxury-collection' }] },
    ],
  },
  { label: 'Computer Glasses', groups: [{ title: 'Current collection', items: [{ label: 'Computer Glasses', path: '/shop?category=computer-glasses' }, { label: 'Blue light styles', path: '/shop?category=computer-glasses' }] }] },
  { label: 'Kids', groups: [{ title: 'Kids collection', items: [{ label: 'Shop kids’ eyewear', path: '/shop?category=kids-collection' }] }] },
  { label: 'Contact lenses', groups: [{ title: 'Catalogue status', items: [{ label: 'No contact lenses are listed yet', path: '/shop?category=contact-lenses' }] }] },
  { label: 'Accessories', groups: [{ title: 'Catalogue status', items: [{ label: 'No accessories are listed yet', path: '/shop?category=accessories' }] }] },
  { label: 'Collections', groups: [{ title: 'Explore collections', items: [{ label: 'All current categories', path: '/categories' }, { label: 'Luxury Collection', path: '/shop?category=luxury-collection' }, { label: 'New Arrivals', path: '/shop?badge=New' }, { label: 'Bestsellers', path: '/shop?badge=Bestseller' }] }] },
  { label: 'Offers', groups: [{ title: 'Save more', items: [{ label: "Today's Offers", path: '/offers' }, { label: 'New Customer Offers', path: '/offers' }, { label: 'Premium Collection Offers', path: '/offers' }, { label: 'Membership Offers', path: '/membership' }, { label: 'Coupon Offers', path: '/offers' }] }] },
  { label: 'Eye Care', groups: [{ title: 'Care and convenience', items: [{ label: 'Home eye-test enquiry', path: '/services#appointments' }, { label: 'Virtual Try-On', path: '/virtual-try-on' }, { label: 'Prescription support', path: '/shop?category=frames' }, { label: 'Store Locator', path: '/stores' }] }] },
  { label: 'Services', groups: [{ title: 'Care and convenience', items: [{ label: 'Virtual Try-On', path: '/virtual-try-on' }, { label: 'Eye Care', path: '/services' }, { label: 'Lens Consultation', path: '/prescription/1' }, { label: 'Home Trial', path: '/services' }, { label: 'Store Appointment', path: '/contact' }, { label: 'Contact Us', path: '/contact' }] }] },
];

export default function Navbar() {
  const { wishlist, cart } = useShop();
  const { isAuthenticated, clearAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const megaMenuRef = useRef<HTMLDivElement>(null);
  const closeMegaMenuTimer = useRef<number | null>(null);

  const cancelMegaMenuClose = () => {
    if (closeMegaMenuTimer.current !== null) window.clearTimeout(closeMegaMenuTimer.current);
  };
  const scheduleMegaMenuClose = () => {
    cancelMegaMenuClose();
    closeMegaMenuTimer.current = window.setTimeout(() => setMegaMenuOpen(null), 180);
  };
  const openMegaMenu = (label: string) => {
    cancelMegaMenuClose();
    setMegaMenuOpen(label);
  };

  const searchResults = products.filter((product) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return [product.name, product.category, product.description, product.material, product.brand, ...product.colors].join(' ').toLowerCase().includes(query);
  });
  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };
  const openProduct = (productId: number) => { closeSearch(); navigate(`/product/${productId}`); };
  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    closeSearch();
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    if (!profileOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!profileRef.current?.contains(event.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    return () => document.removeEventListener('mousedown', closeOnOutsideClick);
  }, [profileOpen]);

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!megaMenuRef.current?.contains(event.target as Node)) setMegaMenuOpen(null);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(false);
        setMobileMenuOpen(null);
        setMegaMenuOpen(null);
        setSearchOpen(true);
      }
      if (event.key === 'Escape') {
        setMegaMenuOpen(null);
        setMobileMenuOpen(null);
        setOpen(false);
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
      cancelMegaMenuClose();
    };
  }, []);

  const logout = () => {
    clearAuthenticated();
    setProfileOpen(false);
    navigate('/login', { replace: true });
  };

  const activeMegaMenu = megaMenus.find((menu) => menu.label === megaMenuOpen);

  return (
    <>
      <div ref={megaMenuRef} className="relative z-[70]" onMouseEnter={cancelMegaMenuClose} onMouseLeave={scheduleMegaMenuClose}>
      <div className="top-promo px-4 py-2 text-xs font-medium tracking-wide sm:text-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-center gap-4 sm:justify-between">
          <div className="top-promo__perks hidden items-center gap-6 md:flex">
            <span className="inline-flex items-center gap-2"><Truck className="h-4 w-4 text-[#b7e77a]" /> Free shipping on orders above ₹999</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[#b7e77a]" /> 100% authentic products</span>
            <span className="inline-flex items-center gap-2"><RotateCcw className="h-4 w-4 text-[#b7e77a]" /> Easy returns & exchanges</span>
          </div>
          <Link to="/offers" className="inline-flex items-center justify-center gap-2 hover:text-[#c8ee91] focus-visible:text-[#c8ee91]">
            <Sparkles className="h-3.5 w-3.5 text-[#b7e77a]" />
            <span className="hidden sm:inline">Special offers this season</span>
            <span className="sm:hidden">Discover this season’s offers</span>
            <span aria-hidden="true">→</span>
          </Link>
        </div>
      </div>
      <header className={`sticky top-0 z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 transition-all duration-300 ${scrolled ? 'backdrop-blur-2xl' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1 px-4 py-3 sm:gap-3 lg:px-8">
          <BrandLogo compact />

          <nav className="hidden h-10 flex-1 items-center justify-center xl:flex" aria-label="Store information">
            <div className="flex h-10 items-center gap-4 text-[15px] font-medium leading-none text-[var(--text-secondary)] lg:gap-5">
              {navItems.filter((item) => ['Collections', 'Offers', 'Eye Care', 'Services'].includes(item.label)).map((item) => (
                <Link key={item.label} to={item.path} onMouseEnter={() => openMegaMenu(item.label)} onFocus={() => openMegaMenu(item.label)} onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') openMegaMenu(item.label); }} className={`group relative inline-flex h-10 items-center whitespace-nowrap leading-none transition-colors duration-200 hover:text-[var(--text-primary)] ${megaMenuOpen === item.label ? 'text-cyan-300' : ''}`}>
                  <span className="inline-flex items-center leading-none">{item.label}</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full bg-cyan-400 transition-transform duration-200 ${megaMenuOpen === item.label ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </Link>
              ))}
            </div>
          </nav>

          <div className="hidden h-10 flex-1 items-center justify-center px-5 lg:flex xl:px-10">
            <button onClick={openSearch} className="flex h-10 min-w-[220px] w-full max-w-xl items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 text-sm leading-none text-[var(--text-secondary)] shadow-inner shadow-black/10">
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap"><Search className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" /> Search frames, styles, offers</span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Ctrl / ⌘ K</span>
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <div className="hidden xl:block"><LocationSelector /></div>
            <button onClick={openSearch} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50 lg:hidden" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <Link to="/wishlist" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50">
              <Heart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{wishlist.length}</span>
            </Link>
            <Link to="/cart" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50">
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </Link>
            {isAuthenticated ? <div ref={profileRef} className="relative hidden xl:block"><button type="button" onClick={() => setProfileOpen((current) => !current)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]" aria-label="Open account menu" aria-expanded={profileOpen}><UserRound className="h-4 w-4" /></button>{profileOpen ? <div className="absolute right-0 top-full z-[80] mt-3 w-56 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 shadow-2xl backdrop-blur-xl"><div className="border-b border-[var(--border-subtle)] px-3 py-3"><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Dream Spex</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Member account</p></div><Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link><Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><ShoppingBag className="h-4 w-4" /> My Orders</Link><Link to="/wallet" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><WalletCards className="h-4 w-4" /> Wallet</Link><Link to="/wishlist" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><Heart className="h-4 w-4" /> Wishlist</Link><Link to="/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><Settings className="h-4 w-4" /> Account Settings</Link><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-400/10"><LogOut className="h-4 w-4" /> Logout</button></div> : null}</div> : <Link to="/login" className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] xl:flex"><UserRound className="h-4 w-4" /></Link>}
            <button className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] xl:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav aria-label="Shop categories" className="hidden border-t border-[var(--border-subtle)] xl:block">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-7 overflow-x-auto px-8 py-2.5 text-sm font-medium text-[var(--text-secondary)]">
            {navItems.filter((item) => !['Collections', 'Offers', 'Eye Care', 'Services'].includes(item.label)).map((item) => (
              <Link key={item.label} to={item.path} onMouseEnter={() => openMegaMenu(item.label)} onFocus={() => openMegaMenu(item.label)} className={`whitespace-nowrap transition hover:text-[var(--brand-green-dark)] ${megaMenuOpen === item.label ? 'text-[var(--brand-green-dark)]' : ''}`}>{item.label}</Link>
            ))}
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {activeMegaMenu ? (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }} className="absolute left-0 right-0 top-full hidden pt-2 xl:block">
            <div className="mx-auto max-w-7xl rounded-b-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl shadow-black/15 backdrop-blur-xl lg:px-8">
              <div className="mb-5 flex items-end justify-between border-b border-[var(--border-subtle)] pb-4">
                <div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-400">Dream Spex</p><h2 className="mt-1 text-xl font-semibold text-[var(--text-primary)]">{activeMegaMenu.label}</h2></div>
                <Link to={navItems.find((item) => item.label === activeMegaMenu.label)?.path ?? '/shop'} onClick={() => setMegaMenuOpen(null)} className="rounded-full bg-cyan-400 px-4 py-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-950 transition hover:bg-lime-300">Shop all {activeMegaMenu.label}</Link>
              </div>
              <div className={`grid gap-6 ${activeMegaMenu.groups.length > 1 ? 'md:grid-cols-2 lg:grid-cols-4' : 'md:grid-cols-3'}`}>
                {activeMegaMenu.groups.map((group) => (
                  <section key={group.title}>
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[var(--text-secondary)]">{group.title}</h3>
                    <div className="mt-3 grid gap-1">
                      {group.items.map((menuItem) => <Link key={menuItem.label} to={menuItem.path} onClick={() => setMegaMenuOpen(null)} className="rounded-lg px-2 py-2 text-sm text-[var(--text-primary)] transition hover:bg-cyan-400/10 hover:text-cyan-400">{menuItem.label}</Link>)}
                    </div>
                  </section>
                ))}
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
      </div>

      <AnimatePresence>
        {searchOpen ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[90] flex items-start justify-center bg-black/40 px-4 py-16 backdrop-blur-2xl">
            <motion.div role="dialog" aria-modal="true" aria-label="Product search" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -20, opacity: 0 }} className="w-full max-w-2xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
              <div className="flex items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-secondary)] px-4 py-3">
                <Search className="h-4 w-4 text-[var(--text-secondary)]" />
                <input autoFocus value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') submitSearch(); if (event.key === 'Escape') closeSearch(); }} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" placeholder="Search your next frame" aria-label="Search products" />
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                {searchResults.length ? searchResults.map((product) => (
                  <button type="button" key={product.id} onClick={() => openProduct(product.id)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">{product.name}<span className="mt-1 block text-xs text-[var(--text-secondary)]">{product.category}</span></button>
                )) : <div className="sm:col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-5 text-center text-sm text-[var(--text-secondary)]"><p>Sorry, we couldn't find that frame.</p><button type="button" onClick={submitSearch} className="mt-3 font-semibold text-cyan-300">Search the full collection</button></div>}
              </div>
              <button className="mt-6 text-sm font-semibold text-cyan-300" onClick={closeSearch}>Close search</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open ? <div className="fixed inset-0 z-[80] bg-black/40 backdrop-blur-sm xl:hidden" onClick={() => setOpen(false)} /> : null}
      <motion.div role="dialog" aria-modal="true" aria-label="Mobile navigation" aria-hidden={!open} inert={!open} initial={false} animate={{ x: open ? 0 : '100%' }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} className="fixed right-0 top-0 z-[90] h-full w-80 max-w-[85vw] overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl xl:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> <p className="text-sm font-semibold uppercase tracking-[0.3em]">Menu</p></div>
          <button className="rounded-full border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)]" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-3">
          <LocationSelector />
        </div>
        <Link to={isAuthenticated ? '/dashboard' : '/login'} onClick={() => setOpen(false)} className="mt-3 flex items-center gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-sm font-medium text-[var(--text-secondary)]">
          <UserRound className="h-4 w-4 text-cyan-300" /> {isAuthenticated ? 'My account' : 'Sign in or create account'}
        </Link>
        <div className="mt-8 space-y-3">
          {navItems.map((item) => (
            <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
              <button type="button" className="flex w-full items-center justify-between px-4 py-3 text-left text-sm font-medium text-[var(--text-secondary)]" onClick={() => setMobileMenuOpen((current) => current === item.label ? null : item.label)} aria-expanded={mobileMenuOpen === item.label}>
                {item.label}<ChevronDown className={`h-4 w-4 transition-transform ${mobileMenuOpen === item.label ? 'rotate-180 text-cyan-300' : ''}`} />
              </button>
              {mobileMenuOpen === item.label ? <div className="border-t border-[var(--border-subtle)] px-2 py-2">
                {(megaMenus.find((menu) => menu.label === item.label)?.groups ?? []).flatMap((group) => group.items).map((menuItem) => <Link key={menuItem.label} to={menuItem.path} onClick={() => { setOpen(false); setMobileMenuOpen(null); }} className="block rounded-xl px-3 py-2 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300">{menuItem.label}</Link>)}
                <Link to={item.path} onClick={() => { setOpen(false); setMobileMenuOpen(null); }} className="mt-1 block rounded-xl bg-cyan-400/10 px-3 py-2 text-sm font-semibold text-cyan-300">View all {item.label}</Link>
              </div> : null}
            </div>
          ))}
        </div>
      </motion.div>
    </>
  );
}
