import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronDown, Grid2X2, Home, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingBag, ShoppingCart, Heart, Settings, UserRound, WalletCards, X, Sparkles, Truck, ShieldCheck, RotateCcw } from 'lucide-react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useShop } from '../../context/ShopContext';
import { useAuth } from '../../context/useAuth';
import BrandLogo from '../ui/BrandLogo';
import { resolveCmsMediaUrl } from '../../config/api';
import { catalogService, type CatalogCategory, type CatalogProduct } from '../../services/catalogService';
import { fetchOffers, type Offer } from '../../services/offerService';
import { fetchMembershipPlans, type MembershipPlan } from '../../services/membershipService';

const utilityNavItems = [
  { label: 'Collections', path: '/categories' },
  { label: 'Offers', path: '/offers' },
  { label: 'Eye Care', path: '/services' },
  { label: 'Services', path: '/services' },
];

type MegaMenuGroupKind = 'products' | 'shapes' | 'brands' | 'materials' | 'colors' | 'featured' | 'categories' | 'offer-categories' | 'offers' | 'membership' | 'links';
type MegaMenuItem = { label: string; path: string };
type MegaMenuGroup = { title: string; kind: MegaMenuGroupKind; items: MegaMenuItem[] };
type MegaMenu = { label: string; groups: MegaMenuGroup[] };

function getProductImage(product: CatalogProduct) {
  const primaryImage = [...product.images].sort((a, b) => Number(b.primaryImage) - Number(a.primaryImage) || a.sortOrder - b.sortOrder)[0];
  return resolveCmsMediaUrl(primaryImage?.imageUrl ?? product.tryOnImageUrl);
}

function getProductCardColor(product: CatalogProduct) {
  const color = product.variants.find((variant) => variant.status.toUpperCase() === 'ACTIVE' && variant.color?.trim())?.color?.trim();
  return color && !product.name.toLowerCase().includes(color.toLowerCase()) ? color : undefined;
}

function swatchColor(value: string) {
  const key = value.trim().toLowerCase();
  const namedColors: Record<string, string> = {
    black: '#151515', brown: '#795548', blue: '#2878c8', red: '#d83b3b',
    green: '#438a50', grey: '#858b91', gray: '#858b91', gold: '#c4a347',
    silver: '#b8bec5', tortoise: 'linear-gradient(135deg, #342016 0 25%, #987043 25% 50%, #372116 50% 75%, #a17842 75%)',
    clear: 'linear-gradient(135deg, #f8fafc, #94a3b8)',
  };
  if (/^#[\da-f]{3,8}$/i.test(key)) return key;
  return namedColors[key] ?? '#82909a';
}

export default function Navbar({ homepageOverlay = false }: { homepageOverlay?: boolean }) {
  const { wishlist, cart } = useShop();
  const { isAuthenticated, clearAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [profileOpen, setProfileOpen] = useState(false);
  const [megaMenuOpen, setMegaMenuOpen] = useState<string | null>(null);
  const [selectedMegaGroupTitle, setSelectedMegaGroupTitle] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<string | null>(null);
  const [catalogCategories, setCatalogCategories] = useState<CatalogCategory[]>([]);
  const [offerCategories, setOfferCategories] = useState<CatalogCategory[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<CatalogProduct[]>([]);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [membershipPlans, setMembershipPlans] = useState<MembershipPlan[]>([]);
  const [membershipError, setMembershipError] = useState('');
  const [membershipLoading, setMembershipLoading] = useState(true);
  const [searchResults, setSearchResults] = useState<CatalogProduct[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState('');
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
    if (label !== megaMenuOpen) setSelectedMegaGroupTitle(null);
    setMegaMenuOpen(label);
  };

  const openSearch = () => setSearchOpen(true);
  const closeSearch = () => { setSearchOpen(false); setSearchQuery(''); };
  const openProduct = (productId: string) => { closeSearch(); navigate(`/product/${productId}`); };
  const submitSearch = () => {
    const query = searchQuery.trim();
    if (!query) return;
    closeSearch();
    navigate(`/shop?search=${encodeURIComponent(query)}`);
  };

  const categoryNavItems = catalogCategories.map((category) => ({
    label: category.name,
    path: `/shop?category=${encodeURIComponent(category.slug)}`,
  }));
  const prescriptionCategory = catalogCategories.find((category) => category.slug === 'eyeglasses')
    ?? catalogCategories.find((category) => /eye.?glass|frame/i.test(category.name));
  const navItems = [...categoryNavItems, ...utilityNavItems];
  const megaMenus: MegaMenu[] = [
    ...catalogCategories.map((category) => {
      const categoryProducts = catalogProducts.filter((product) =>
        product.categories.some((productCategory) => productCategory.slug === category.slug));
      const shapes = [...new Set(categoryProducts.map((product) => product.frameShape).filter((value): value is string => Boolean(value)))];
      const brands = [...new Set(categoryProducts.map((product) => product.brand).filter(Boolean))];
      const materials = [...new Set(categoryProducts.map((product) => product.material).filter((value): value is string => Boolean(value)))];
      const colors = [...new Set(categoryProducts.flatMap((product) => product.variants
        .filter((variant) => variant.status.toUpperCase() === 'ACTIVE')
        .map((variant) => variant.color)
        .filter((value): value is string => Boolean(value))))];
      const featuredBadges = [...new Set(categoryProducts.map((product) => product.badge).filter((value): value is string => Boolean(value)))];
      return {
        label: category.name,
        groups: [
          { title: 'Shop Category', kind: 'products' as const, items: [{ label: category.name, path: `/shop?category=${encodeURIComponent(category.slug)}` }] },
          ...(shapes.length ? [{ title: 'By Shape', kind: 'shapes' as const, items: shapes.map((shape) => ({ label: shape, path: `/shop?category=${encodeURIComponent(category.slug)}&shape=${encodeURIComponent(shape)}` })) }] : []),
          ...(brands.length ? [{ title: 'By Brand', kind: 'brands' as const, items: brands.map((brand) => ({ label: brand, path: `/shop?category=${encodeURIComponent(category.slug)}&brand=${encodeURIComponent(brand)}` })) }] : []),
          ...(materials.length ? [{ title: 'Shop by Material', kind: 'materials' as const, items: materials.map((material) => ({ label: material, path: `/shop?category=${encodeURIComponent(category.slug)}&material=${encodeURIComponent(material)}` })) }] : []),
          ...(colors.length ? [{ title: 'Shop by Colour', kind: 'colors' as const, items: colors.map((color) => ({ label: color, path: `/shop?category=${encodeURIComponent(category.slug)}&color=${encodeURIComponent(color)}` })) }] : []),
          ...(featuredBadges.length ? [{ title: 'Featured', kind: 'featured' as const, items: featuredBadges.map((badge) => ({ label: badge, path: `/shop?category=${encodeURIComponent(category.slug)}&badge=${encodeURIComponent(badge)}` })) }] : []),
        ],
      };
    }),
    {
      label: 'Collections',
      groups: [{ title: 'Explore categories', kind: 'categories', items: [
        { label: 'All collections', path: '/categories' },
        ...catalogCategories.map((category) => ({ label: category.name, path: `/shop?category=${encodeURIComponent(category.slug)}` })),
      ] }],
    },
    {
      label: 'Offers',
      groups: [
        { title: 'Offer categories', kind: 'offer-categories', items: offerCategories.map((category) => ({ label: category.name, path: '/offers' })) },
        { title: 'Current offers', kind: 'offers', items: offers.map((offer) => ({ label: offer.title, path: offer.linkUrl || '/offers' })) },
        { title: 'Membership', kind: 'membership', items: [{ label: 'Membership plans', path: '/membership' }] },
      ],
    },
    { label: 'Eye Care', groups: [{ title: 'Care and convenience', kind: 'links', items: [{ label: 'Services', path: '/services' }, { label: 'Virtual Try-On', path: '/virtual-try-on' }, { label: 'Store Locator', path: '/stores' }] }] },
    { label: 'Services', groups: [{ title: 'Care and convenience', kind: 'links', items: [{ label: 'Virtual Try-On', path: '/virtual-try-on' }, { label: 'Eye Care', path: '/services' }, { label: 'Prescription support', path: prescriptionCategory ? `/shop?category=${encodeURIComponent(prescriptionCategory.slug)}` : '/shop' }, { label: 'Store Appointment', path: '/contact' }, { label: 'Contact Us', path: '/contact' }] }] },
  ];

  useEffect(() => {
    const controller = new AbortController();
    catalogService.categories('CATALOG', controller.signal)
      .then((items) => setCatalogCategories(items.filter((item) => item.status === 'ACTIVE' && item.categoryType !== 'OFFER')))
      .catch((error: unknown) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.error('[Navigation] Could not load catalogue categories.', error);
      });
    const params = new URLSearchParams({ page: '0', pageSize: '100', sort: 'newest' });
    catalogService.search(params, controller.signal)
      .then((result) => setCatalogProducts(result.items))
      .catch((error: unknown) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.error('[Navigation] Could not load catalogue products.', error);
      });
    catalogService.categories('OFFER', controller.signal)
      .then((items) => setOfferCategories(items.filter((item) => item.status === 'ACTIVE')))
      .catch((error: unknown) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.error('[Navigation] Could not load offer categories.', error);
      });
    fetchOffers(controller.signal)
      .then(setOffers)
      .catch((error: unknown) => {
        if (!controller.signal.aborted && import.meta.env.DEV) console.error('[Navigation] Could not load current offers.', error);
      });
    fetchMembershipPlans(controller.signal)
      .then((plans) => setMembershipPlans(plans.filter((plan) => plan.status === 'ACTIVE')))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setMembershipError(error instanceof Error ? error.message : 'Membership plans are unavailable.');
          if (import.meta.env.DEV) console.error('[Navigation] Could not load membership plans.', error);
        }
      })
      .finally(() => { if (!controller.signal.aborted) setMembershipLoading(false); });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!searchOpen) return undefined;
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({ page: '0', pageSize: '8', sort: 'newest' });
      if (searchQuery.trim()) params.set('q', searchQuery.trim());
      setSearchLoading(true);
      setSearchError('');
      catalogService.search(params, controller.signal)
        .then((result) => setSearchResults(result.items))
        .catch((error: unknown) => {
          if (!controller.signal.aborted) setSearchError(error instanceof Error ? error.message : 'Product search is unavailable.');
        })
        .finally(() => { if (!controller.signal.aborted) setSearchLoading(false); });
    }, searchQuery.trim() ? 200 : 0);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [searchOpen, searchQuery]);

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
  const activeMegaMenuGroups = activeMegaMenu?.groups.filter((group) => group.items.length > 0) ?? [];
  const selectedMegaGroup = activeMegaMenuGroups.find((group) => group.title === selectedMegaGroupTitle)
    ?? activeMegaMenuGroups[0];
  const activeCategory = catalogCategories.find((category) => category.name === activeMegaMenu?.label);
  const categoryProducts = activeCategory
    ? catalogProducts.filter((product) => product.categories.some((category) => category.slug === activeCategory.slug))
    : [];
  const currentOffers = offers.filter((offer) => {
    const startsAt = Date.parse(offer.startsAt);
    return offer.active && offer.publicationStatus === 'PUBLISHED'
      && Number.isFinite(startsAt) && startsAt <= Date.now()
      && (!offer.endsAt || Date.parse(offer.endsAt) > Date.now());
  });
  const selectedOffers = currentOffers;
  const selectedCategoryCards = selectedMegaGroup?.kind === 'categories'
    ? selectedMegaGroup.items.flatMap((item) => {
      const category = catalogCategories.find((entry) => entry.name === item.label);
      const imageUrl = resolveCmsMediaUrl(category?.imageUrl);
      return category && imageUrl ? [{
        id: `category-${category.id}`,
        title: category.name,
        imageUrl,
        href: item.path,
      }] : [];
    })
    : [];
  const selectedProductCards = categoryProducts.flatMap((product) => {
    const imageUrl = getProductImage(product);
    return imageUrl ? [{
      id: product.id,
      title: product.name,
      color: getProductCardColor(product),
      imageUrl,
      href: `/product/${encodeURIComponent(product.id)}`,
    }] : [];
  }).slice(0, 2);
  const homepageOverlayClass = homepageOverlay
    ? `navbar-home-overlay${scrolled ? ' navbar-home-overlay--scrolled' : ''}`
    : '';
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const homeActive = location.pathname === '/';
  const ordersActive = location.pathname === '/orders' || location.pathname === '/my-orders' || location.pathname.startsWith('/orders/');
  const cartActive = location.pathname === '/cart' || location.pathname === '/checkout';
  const profileActive = location.pathname === '/account' || location.pathname === '/profile' || location.pathname === '/login';
  const moreActive = open || (!homeActive && !ordersActive && !cartActive && !profileActive);

  return (
    <>
      <div ref={megaMenuRef} className={`relative z-[70] ${homepageOverlayClass}`} onMouseEnter={cancelMegaMenuClose} onMouseLeave={scheduleMegaMenuClose}>
      {!homepageOverlay ? <div className="top-promo px-4 py-2 text-xs font-medium tracking-wide sm:text-sm">
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
      </div> : null}
      <header className={`z-50 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/95 transition-all duration-300 ${homepageOverlay ? 'navbar-home-overlay__header' : 'sticky top-0'} ${scrolled ? 'backdrop-blur-2xl' : ''}`}>
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-1 px-4 py-3 sm:gap-3 lg:px-8">
          <BrandLogo compact />

          <nav className="hidden h-10 flex-1 items-center justify-center lg:flex" aria-label="Store information">
            <div className="flex h-10 items-center gap-4 text-[15px] font-medium leading-none text-[var(--text-secondary)] lg:gap-5">
              {navItems.filter((item) => ['Collections', 'Offers', 'Eye Care', 'Services'].includes(item.label)).map((item) => (
                <Link key={item.label} to={item.path} onMouseEnter={() => openMegaMenu(item.label)} onFocus={() => openMegaMenu(item.label)} onKeyDown={(event) => { if (event.key === ' ' || event.key === 'Enter') openMegaMenu(item.label); }} className={`group relative inline-flex h-10 items-center whitespace-nowrap leading-none transition-colors duration-200 hover:text-[var(--text-primary)] ${megaMenuOpen === item.label ? 'text-cyan-300' : ''}`}>
                  <span className="inline-flex items-center leading-none">{item.label}</span>
                  <span className={`absolute -bottom-1 left-0 h-0.5 w-full origin-left rounded-full bg-cyan-400 transition-transform duration-200 ${megaMenuOpen === item.label ? 'scale-x-100' : 'scale-x-0 group-hover:scale-x-100'}`} />
                </Link>
              ))}
            </div>
          </nav>

          <div className={`hidden h-10 flex-1 items-center justify-center px-5 lg:flex xl:px-10 ${homepageOverlay ? 'navbar-home-overlay__search' : ''}`}>
            <button onClick={openSearch} className="flex h-10 min-w-[220px] w-full max-w-xl items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 text-sm leading-none text-[var(--text-secondary)] shadow-inner shadow-black/10">
              <span className="flex shrink-0 items-center gap-2 whitespace-nowrap"><Search className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" /> Search frames, styles, offers</span>
              <span className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2 py-1 text-[10px] uppercase tracking-[0.12em] text-[var(--text-secondary)]">Ctrl / ⌘ K</span>
            </button>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={openSearch} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50 lg:hidden" aria-label="Search">
              <Search className="h-4 w-4" />
            </button>
            <Link to="/wishlist" className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50">
              <Heart className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{wishlist.length}</span>
            </Link>
            <Link to="/cart" className="relative hidden h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] transition hover:border-cyan-400/50 md:flex">
              <ShoppingBag className="h-4 w-4" />
              <span className="absolute -right-1 -top-1 rounded-full bg-cyan-400 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{cart.reduce((sum, item) => sum + item.quantity, 0)}</span>
            </Link>
            {isAuthenticated ? <div ref={profileRef} className="relative hidden lg:block"><button type="button" onClick={() => setProfileOpen((current) => !current)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)]" aria-label="Open account menu" aria-expanded={profileOpen}><UserRound className="h-4 w-4" /></button>{profileOpen ? <div className="absolute right-0 top-full z-[80] mt-3 w-56 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 shadow-2xl backdrop-blur-xl"><div className="border-b border-[var(--border-subtle)] px-3 py-3"><p className="text-xs uppercase tracking-[0.2em] text-cyan-300">Dream Spex</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Member account</p></div><Link to="/dashboard" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><LayoutDashboard className="h-4 w-4" /> Dashboard</Link><Link to="/orders" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><ShoppingBag className="h-4 w-4" /> My Orders</Link><Link to="/wallet" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><WalletCards className="h-4 w-4" /> Wallet</Link><Link to="/wishlist" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><Heart className="h-4 w-4" /> Wishlist</Link><Link to="/account" onClick={() => setProfileOpen(false)} className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] hover:text-cyan-300"><Settings className="h-4 w-4" /> Account Settings</Link><button type="button" onClick={logout} className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-rose-300 transition hover:bg-rose-400/10"><LogOut className="h-4 w-4" /> Logout</button></div> : null}</div> : <Link to="/login" className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] lg:flex"><UserRound className="h-4 w-4" /></Link>}
            <button className="hidden rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2.5 text-[var(--text-secondary)] transition hover:bg-[var(--bg-secondary)] md:flex lg:hidden" aria-label="Open menu" onClick={() => setOpen(true)}>
              <Menu className="h-4 w-4" />
            </button>
          </div>
        </div>
        <nav aria-label="Shop categories" className="hidden border-t border-[var(--border-subtle)] lg:block">
          <div className="mx-auto flex max-w-7xl items-center justify-center gap-7 overflow-x-auto px-8 py-2.5 text-sm font-medium text-[var(--text-secondary)]">
            {navItems.filter((item) => !['Collections', 'Offers', 'Eye Care', 'Services'].includes(item.label)).map((item) => (
              <Link key={item.label} to={item.path} onMouseEnter={() => openMegaMenu(item.label)} onFocus={() => openMegaMenu(item.label)} className={`whitespace-nowrap transition hover:text-[var(--brand-green-dark)] ${megaMenuOpen === item.label ? 'text-[var(--brand-green-dark)]' : ''}`}>{item.label}</Link>
            ))}
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {activeMegaMenu ? (
          <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -5 }} transition={{ duration: 0.16 }} className="customer-mega-menu-popover absolute left-0 right-0 top-full hidden pt-2 lg:block">
            <div className="customer-mega-menu">
              <div className="customer-mega-menu__heading">
                <div><p>Dream Spex</p><h2>{activeMegaMenu.label}</h2></div>
                <Link to={navItems.find((item) => item.label === activeMegaMenu.label)?.path ?? '/shop'} onClick={() => setMegaMenuOpen(null)}>Shop all {activeMegaMenu.label}</Link>
              </div>
              <div className="customer-mega-menu__body">
                <aside className="customer-mega-menu__sidebar">
                  {activeMegaMenuGroups.map((group) => <button
                    key={group.title}
                    type="button"
                    className={selectedMegaGroup?.title === group.title ? 'is-active' : ''}
                    aria-expanded={selectedMegaGroup?.title === group.title}
                    onMouseEnter={() => setSelectedMegaGroupTitle(group.title)}
                    onFocus={() => setSelectedMegaGroupTitle(group.title)}
                    onClick={() => setSelectedMegaGroupTitle(group.title)}
                  >{group.title}</button>)}
                </aside>
                <div className="customer-mega-menu__content">
                  <div className="customer-mega-menu__gallery">
                    {selectedMegaGroup?.kind === 'products' || selectedMegaGroup?.kind === 'featured'
                      ? (selectedMegaGroup.kind === 'featured'
                        ? categoryProducts.filter((product) => selectedMegaGroup.items.some((item) => item.label === product.badge))
                          .flatMap((product) => {
                            const imageUrl = getProductImage(product);
                            return imageUrl ? [{ id: product.id, title: product.name, color: getProductCardColor(product), imageUrl, href: `/product/${encodeURIComponent(product.id)}` }] : [];
                          }).slice(0, 2)
                        : selectedProductCards).map((card) => <Link key={card.id} to={card.href} onClick={() => setMegaMenuOpen(null)} className="customer-mega-menu__card">
                        <img src={card.imageUrl} alt={card.title} loading="lazy" />
                        <span className="customer-mega-menu__card-copy">
                          <span className="customer-mega-menu__card-title">{card.title}</span>
                          {card.color ? <span className="customer-mega-menu__card-color">{card.color}</span> : null}
                        </span>
                      </Link>)
                      : null}
                    {selectedMegaGroup?.kind === 'categories' ? selectedCategoryCards.map((card) => <Link key={card.id} to={card.href} onClick={() => setMegaMenuOpen(null)} className="customer-mega-menu__card">
                      <img src={card.imageUrl} alt={card.title} loading="lazy" />
                      <span>{card.title}</span>
                    </Link>) : null}
                    {selectedMegaGroup?.kind === 'categories' && selectedCategoryCards.length === 0
                      ? <div className="customer-mega-menu__options">
                        {selectedMegaGroup.items.map((item) => <Link key={item.label} to={item.path} onClick={() => setMegaMenuOpen(null)}>{item.label}</Link>)}
                      </div> : null}
                    {selectedMegaGroup && ['shapes', 'brands', 'materials', 'colors', 'offer-categories', 'links'].includes(selectedMegaGroup.kind)
                      ? <div className={`customer-mega-menu__options${selectedMegaGroup.kind === 'colors' ? ' customer-mega-menu__options--colors' : ''}`}>
                        {selectedMegaGroup.items.map((item) => <Link key={item.label} to={item.path} onClick={() => setMegaMenuOpen(null)}>
                          {selectedMegaGroup.kind === 'colors' ? <span className="customer-mega-menu__swatch" style={{ background: swatchColor(item.label) }} /> : null}
                          {item.label}
                        </Link>)}
                      </div> : null}
                    {selectedMegaGroup?.kind === 'offers' || selectedMegaGroup?.kind === 'offer-categories' ? selectedOffers.length
                      ? selectedOffers.slice(0, 4).map((offer) => <Link key={offer.id} to={offer.linkUrl || '/offers'} onClick={() => setMegaMenuOpen(null)} className="customer-mega-menu__card">
                        {offer.imageUrl ? <img src={offer.imageUrl} alt={offer.title} loading="lazy" /> : null}
                        <span>{offer.title}</span>
                      </Link>)
                      : <p className="customer-mega-menu__empty">No current offers are available.</p> : null}
                    {selectedMegaGroup?.kind === 'membership' ? membershipLoading
                      ? <p className="customer-mega-menu__empty">Loading membership plans...</p>
                      : membershipError
                        ? <p className="customer-mega-menu__empty" role="alert">{membershipError}</p>
                        : membershipPlans.length
                          ? membershipPlans.slice(0, 3).map((plan) => <Link key={plan.id} to={`/membership/checkout?plan=${encodeURIComponent(plan.name.toLowerCase())}`} onClick={() => setMegaMenuOpen(null)} className="customer-mega-menu__plan">
                            <span>{plan.name}</span>
                            <span>{plan.description}</span>
                          </Link>)
                          : <Link to="/membership" onClick={() => setMegaMenuOpen(null)} className="customer-mega-menu__empty">Explore Dream Spex membership</Link> : null}
                  </div>
                </div>
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
                {searchResults.map((product) => (
                  <button type="button" key={product.id} onClick={() => openProduct(product.id)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-3 text-left text-sm text-[var(--text-secondary)] transition hover:border-cyan-400/40 hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]">{product.name}<span className="mt-1 block text-xs text-[var(--text-secondary)]">{product.categories[0]?.name ?? 'Eyewear'}</span></button>
                ))}
                {!searchResults.length && searchLoading ? <p className="sm:col-span-2 py-5 text-center text-sm text-[var(--text-secondary)]">Searching the catalogue...</p> : null}
                {!searchResults.length && !searchLoading && searchError ? <p className="sm:col-span-2 py-5 text-center text-sm text-rose-300" role="alert">{searchError}</p> : null}
                {!searchResults.length && !searchLoading && !searchError ? <div className="sm:col-span-2 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] px-4 py-5 text-center text-sm text-[var(--text-secondary)]"><p>Sorry, we couldn't find that frame.</p><button type="button" onClick={submitSearch} className="mt-3 font-semibold text-cyan-300">Search the full collection</button></div> : null}
              </div>
              <button className="mt-6 text-sm font-semibold text-cyan-300" onClick={closeSearch}>Close search</button>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      {open ? <div className="fixed inset-0 z-[110] bg-black/40 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)} /> : null}
      <motion.div role="dialog" aria-modal="true" aria-label="Mobile navigation" aria-hidden={!open} inert={!open} initial={false} animate={{ x: open ? 0 : '100%' }} transition={{ type: 'spring', stiffness: 180, damping: 24 }} className="fixed right-0 top-0 z-[120] h-full w-80 max-w-[85vw] overflow-y-auto border-l border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl lg:hidden">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-4 w-4" /> <p className="text-sm font-semibold uppercase tracking-[0.3em]">Menu</p></div>
          <button className="rounded-full border border-[var(--border-subtle)] p-2 text-[var(--text-secondary)]" onClick={() => setOpen(false)} aria-label="Close menu">
            <X className="h-4 w-4" />
          </button>
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
      <nav className="mobile-bottom-nav md:hidden" aria-label="Mobile primary navigation">
        <Link to="/" className={`mobile-bottom-nav__item${homeActive ? ' is-active' : ''}`} aria-current={homeActive ? 'page' : undefined}>
          <Home aria-hidden="true" />
          <span>Home</span>
          <i aria-hidden="true" />
        </Link>
        <Link to="/orders" className={`mobile-bottom-nav__item${ordersActive ? ' is-active' : ''}`} aria-current={ordersActive ? 'page' : undefined}>
          <Package aria-hidden="true" />
          <span>Orders</span>
          <i aria-hidden="true" />
        </Link>
        <Link to="/cart" className={`mobile-bottom-nav__item mobile-bottom-nav__item--cart${cartActive ? ' is-active' : ''}`} aria-label={`Cart, ${cartItemCount} items`} aria-current={cartActive ? 'page' : undefined}>
          <span className="mobile-bottom-nav__cart-icon">
            <ShoppingCart aria-hidden="true" />
            {cartItemCount > 0 ? <span className="mobile-bottom-nav__cart-count">{cartItemCount > 99 ? '99+' : cartItemCount}</span> : null}
          </span>
          <span>Cart</span>
          <i aria-hidden="true" />
        </Link>
        <Link to={isAuthenticated ? '/account' : '/login'} className={`mobile-bottom-nav__item${profileActive ? ' is-active' : ''}`} aria-current={profileActive ? 'page' : undefined}>
          <UserRound aria-hidden="true" />
          <span>{isAuthenticated ? 'Profile' : 'Login'}</span>
          <i aria-hidden="true" />
        </Link>
        <button type="button" className={`mobile-bottom-nav__item${moreActive ? ' is-active' : ''}`} onClick={() => setOpen(true)} aria-expanded={open} aria-haspopup="dialog">
          <Grid2X2 aria-hidden="true" />
          <span>More</span>
          <i aria-hidden="true" />
        </button>
      </nav>
    </>
  );
}
