import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowRight, Bell, Building2, CheckCircle2, ChevronDown, ChevronRight, CircleDollarSign, Download, Glasses, LayoutGrid, LogOut, MapPin, MessageSquareText, PackageOpen, PanelLeftClose, PanelLeftOpen, Printer, RefreshCw, Search, Settings, ShoppingCart, Store, Star, TrendingUp, UserRound, Users, Warehouse, PanelsTopLeft, Tags, RotateCcw, X } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import Button from '../components/ui/Button';
import { adminSalesOverview, franchiseOrders, franchiseProducts, franchiseRegistrations, franchises, franchiseUsers, topProducts } from '../data/franchiseData';
import { adminProductService, type AdminCategory, type AdminProduct, type AdminProductGstRequest, type AdminProductRequest } from '../services/adminProductService';
import { AdminApiError, adminService, type AdminGstHistoryEntry, type AdminGstSettings, type AdminReport, type AdminSettings, type AdminStore, type AdminStoreRequest } from '../services/adminService';
import { resolveCmsMediaUrl } from '../config/api';
import CustomerLocationPicker from '../components/addresses/CustomerLocationPicker';
import { isValidCoordinates, type Coordinates } from '../utils/deliveryNavigation';
import { isValidGstRate } from '../utils/gst';
import AdminDateRangeFilter from '../components/ui/AdminDateRangeFilter';
import { downloadReportExcel, downloadReportPdf, printReport, type AdminReportDocument } from '../utils/adminReportExport';
import { franchiseService, type Franchise, type FranchiseAssignment, type FranchiseDashboard, type FranchiseInventory, type FranchiseOrder, type FranchiseReport, type FranchiseRequest, type FranchiseReturn } from '../services/franchiseService';
import { isPickupOrder, nextFranchiseOrderStatuses, orderStatusLabel } from '../utils/orderWorkflow';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const franchiseRequestFrom = (franchise: Franchise): FranchiseRequest => ({
  franchiseCode: franchise.franchiseCode,
  name: franchise.name,
  ownerName: franchise.ownerName ?? '',
  email: franchise.ownerEmail ?? '',
  phone: franchise.phone ?? '',
  address: franchise.address,
  city: franchise.city,
  state: franchise.state,
  postalCode: franchise.postalCode,
  gstNumber: franchise.gstNumber,
  businessType: franchise.businessType,
  openingHours: franchise.openingHours,
  availableServices: franchise.availableServices.join('\n'),
  status: franchise.status,
  latitude: franchise.latitude,
  longitude: franchise.longitude,
  deliveryRadiusKm: franchise.deliveryRadiusKm,
});

type PageProps = { children: React.ReactNode };

type DashboardNavItem = { label: string; href: string; icon: LucideIcon; active?: boolean };
type DashboardNavGroup = { label: string; items: DashboardNavItem[] };

function getDefaultNavigationGroups(role: 'SUPER_ADMIN' | 'FRANCHISE_ADMIN' | 'CUSTOMER' | null): DashboardNavGroup[] {
  if (role === 'SUPER_ADMIN') {
    return [
      { label: 'Workspace', items: [{ label: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid }, { label: 'Reports', href: '/admin/reports', icon: TrendingUp }] },
      { label: 'Commerce', items: [
        { label: 'Products', href: '/admin/products', icon: PackageOpen },
        { label: 'Categories', href: '/admin/categories', icon: Tags },
        { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
        { label: 'Lens management', href: '/admin/lenses', icon: Glasses },
        { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { label: 'Returns & refunds', href: '/admin/returns', icon: RotateCcw },
        { label: 'Product reviews', href: '/admin/product-reviews', icon: Star },
        { label: 'Customer SMS history', href: '/admin/sms-notifications', icon: MessageSquareText },
      ] },
      { label: 'Growth', items: [
        { label: 'Offers', href: '/admin/offers', icon: CircleDollarSign },
        { label: 'Membership', href: '/admin/membership', icon: CheckCircle2 },
        { label: 'Loyalty & referral reports', href: '/admin/loyalty', icon: CircleDollarSign },
        { label: 'Loyalty settings', href: '/admin/loyalty-settings', icon: Settings },
        { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Homepage', href: '/admin/content', icon: PanelsTopLeft },
      ] },
      { label: 'Organization', items: [
        { label: 'Franchises', href: '/admin/franchises', icon: Building2 },
        { label: 'Franchise Applications', href: '/admin/franchise-applications', icon: MessageSquareText },
        { label: 'Users', href: '/admin/users', icon: UserRound },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
        { label: 'GST Settings', href: '/admin/settings/gst', icon: CircleDollarSign },
      ] },
    ];
  }

  if (role === 'FRANCHISE_ADMIN') {
    return [
      { label: 'Workspace', items: [
        { label: 'Dashboard', href: '/franchise/dashboard', icon: LayoutGrid },
        { label: 'Reports', href: '/franchise/reports', icon: TrendingUp },
      ] },
      { label: 'Store operations', items: [
        { label: 'Products', href: '/franchise/products', icon: PackageOpen },
        { label: 'Inventory', href: '/franchise/inventory', icon: Warehouse },
        { label: 'Orders', href: '/franchise/orders', icon: ShoppingCart },
        { label: 'Customers', href: '/franchise/customers', icon: Users },
      ] },
      { label: 'Account', items: [{ label: 'Store profile', href: '/franchise/profile', icon: Store }] },
    ];
  }

  return [];
}

export function DashboardShell({
  children,
  navItems = [],
  heading = 'Dream Spex',
  subheading = 'Dashboard',
  locationLabel = 'Dream Spex',
}: PageProps & {
  navItems?: Array<{ label: string; href: string; icon: LucideIcon; active?: boolean; }>;
  heading?: string;
  subheading?: string;
  locationLabel?: string;
}) {
  const { role, user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [search, setSearch] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);

  const navGroups = useMemo<DashboardNavGroup[]>(() => navItems.length > 0
    ? [{ label: 'Workspace', items: navItems }]
    : getDefaultNavigationGroups(role), [navItems, role]);
  const resolvedNavItems = useMemo(() => navGroups.flatMap((group) => group.items.map((item) => ({
    ...item,
    active: item.active ?? (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)),
  }))), [location.pathname, navGroups]);
  const matchingPages = resolvedNavItems.filter((item) => item.label.toLowerCase().includes(search.trim().toLowerCase()));
  const activePage = [...resolvedNavItems].filter((item) => item.active).sort((left, right) => right.href.length - left.href.length)[0];

  const profileHref = role === 'SUPER_ADMIN' ? '/admin/profile' : role === 'FRANCHISE_ADMIN' ? '/franchise/profile' : '/account';

  const handleLogout = () => {
    const loginPath = role === 'SUPER_ADMIN' ? '/admin/login' : role === 'FRANCHISE_ADMIN' ? '/franchise/login' : '/login';
    void logout().catch(() => console.error('Unable to complete sign out.'));
    navigate(loginPath, { replace: true });
    setProfileOpen(false);
  };

  const renderSidebar = (collapsed: boolean, mobile = false) => (
    <div className="flex h-full min-h-0 flex-col">
      <div className={`flex h-14 shrink-0 items-center gap-3 border-b border-[var(--border-subtle)] px-2 ${collapsed ? 'justify-center' : ''}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--brand-green)] text-sm font-bold text-[#17231c]">DS</div>
        {!collapsed ? <div className="min-w-0"><p className="text-sm font-semibold tracking-tight text-[var(--text-primary)]">Dream Spex</p><p className="text-[11px] text-[var(--text-secondary)]">{locationLabel}</p></div> : null}
        {mobile ? <button type="button" onClick={() => setMobileOpen(false)} className="ml-auto rounded-lg p-2 text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] lg:hidden" aria-label="Close navigation"><X className="h-4 w-4" /></button> : null}
      </div>
      <nav className="min-h-0 flex-1 space-y-5 overflow-y-auto py-5" aria-label="Admin navigation">
        {navGroups.map((group) => <div key={group.label}>
          {!collapsed ? <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">{group.label}</p> : null}
          <div className="space-y-1">
            {group.items.map(({ label, href, icon: Icon }) => {
              const active = location.pathname === href || location.pathname.startsWith(`${href}/`);
              return <Link key={href} to={href} onClick={() => setMobileOpen(false)} title={collapsed ? label : undefined} aria-current={active ? 'page' : undefined}
                className={`group flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--focus-ring)] ${collapsed ? 'justify-center' : ''} ${active ? 'bg-[#eaf2e8] text-[#285033]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]'}`}>
                <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-[var(--brand-green-dark)]' : ''}`} />
                {!collapsed ? <><span className="min-w-0 flex-1 truncate">{label}</span>{active ? <span className="h-1.5 w-1.5 rounded-full bg-[var(--brand-green-dark)]" /> : null}</> : <span className="sr-only">{label}</span>}
              </Link>;
            })}
          </div>
        </div>)}
      </nav>
      <div className={`shrink-0 border-t border-[var(--border-subtle)] pt-3 ${collapsed ? 'flex justify-center' : ''}`}>
        <Link to={profileHref} onClick={() => setMobileOpen(false)} title={collapsed ? 'Profile' : undefined} className={`flex min-h-10 items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)] ${collapsed ? 'justify-center' : ''}`}>
          <UserRound className="h-[18px] w-[18px] shrink-0" />{!collapsed ? 'Profile' : <span className="sr-only">Profile</span>}
        </Link>
        {!collapsed ? <button type="button" onClick={handleLogout} className="mt-1 flex min-h-10 w-full items-center gap-3 rounded-lg px-2.5 text-[13px] font-medium text-[var(--text-secondary)] hover:bg-red-50 hover:text-red-700">
          <LogOut className="h-[18px] w-[18px]" />Sign out
        </button> : null}
      </div>
    </div>
  );

  return (
    <div className="admin-workspace min-h-screen bg-[var(--admin-canvas)] text-[var(--text-primary)]">
      <aside className={`fixed inset-y-0 left-0 z-30 hidden border-r border-[var(--border-subtle)] bg-white px-3 pb-4 pt-3 transition-[width] duration-200 lg:block ${sidebarCollapsed ? 'w-[76px]' : 'w-[256px] px-4'}`}>
        {renderSidebar(sidebarCollapsed)}
      </aside>

      {mobileOpen ? (
        <button type="button" className="fixed inset-0 z-40 cursor-default bg-slate-950/35 backdrop-blur-[1px] lg:hidden" onClick={() => setMobileOpen(false)} aria-label="Close navigation" />
      ) : null}

      <aside className={`fixed inset-y-0 left-0 z-50 w-[min(84vw,280px)] border-r border-[var(--border-subtle)] bg-white px-4 pb-4 pt-3 shadow-2xl transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`} aria-label="Mobile navigation">
        {renderSidebar(false, true)}
      </aside>

      <div className={`min-h-screen transition-[padding] duration-200 ${sidebarCollapsed ? 'lg:pl-[76px]' : 'lg:pl-[256px]'}`}>
        <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-white/95 backdrop-blur">
          <div className="flex min-h-[72px] items-center justify-between gap-3 px-4 sm:px-6 xl:px-8">
            <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setMobileOpen(true)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] bg-white text-[var(--text-primary)] lg:hidden" aria-label="Open navigation">
              <span className="sr-only">Open menu</span>
              <span className="flex flex-col gap-1"><span className="h-0.5 w-4 bg-current" /><span className="h-0.5 w-4 bg-current" /><span className="h-0.5 w-4 bg-current" /></span>
            </button>
            <button type="button" onClick={() => setSidebarCollapsed((current) => !current)} className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] lg:flex" aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {sidebarCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </button>
            <div className="min-w-0">
              <p className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)]"><span className="hidden sm:inline">{heading}</span><ChevronRight className="hidden h-3 w-3 sm:block" /> <span className="truncate">{activePage?.label ?? subheading}</span></p>
              <h1 className="mt-0.5 truncate text-base font-semibold tracking-tight text-[var(--text-primary)] sm:text-lg">{activePage?.label ?? subheading}</h1>
            </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="relative hidden w-52 md:block xl:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--text-secondary)]" />
                <input value={search} onChange={(event) => { setSearch(event.target.value); setSearchOpen(true); }} onFocus={() => setSearchOpen(true)} onKeyDown={(event) => {
                  if (event.key === 'Escape') setSearchOpen(false);
                  if (event.key === 'Enter' && matchingPages[0]) { navigate(matchingPages[0].href); setSearch(''); setSearchOpen(false); }
                }} className="h-9 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--admin-canvas)] pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)] focus:border-[var(--brand-green-dark)] focus:ring-2 focus:ring-[var(--brand-green)]/15" placeholder="Find a page..." aria-label="Find an admin page" aria-expanded={searchOpen && Boolean(search.trim())} />
                {searchOpen && search.trim() ? <div className="absolute right-0 top-11 z-40 w-full overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-xl" role="listbox" aria-label="Matching pages">
                  {matchingPages.length ? matchingPages.slice(0, 6).map(({ label, href, icon: Icon }) => <button key={href} type="button" onClick={() => { navigate(href); setSearch(''); setSearchOpen(false); }} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"><Icon className="h-4 w-4 text-[var(--brand-green-dark)]" />{label}</button>) : <p className="px-3 py-2 text-sm text-[var(--text-secondary)]">No matching pages</p>}
                </div> : null}
              </div>
              <div className="relative">
                <button type="button" onClick={() => { setNotificationsOpen((open) => !open); setProfileOpen(false); }} className="relative flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border-subtle)] text-[var(--text-secondary)] hover:bg-[var(--bg-secondary)] hover:text-[var(--text-primary)]" aria-label="Open operations shortcuts" aria-expanded={notificationsOpen}>
                  <Bell className="h-4 w-4" />
                </button>
                {notificationsOpen ? <div className="absolute right-0 top-11 z-40 w-56 rounded-xl border border-[var(--border-subtle)] bg-white p-2 shadow-xl">
                  <p className="px-2.5 py-2 text-xs font-semibold text-[var(--text-secondary)]">Operations shortcuts</p>
                  {(role === 'SUPER_ADMIN' ? [
                    { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
                    { label: 'Returns & refunds', href: '/admin/returns', icon: RotateCcw },
                    { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
                  ] : [
                    { label: 'Orders', href: '/franchise/orders', icon: ShoppingCart },
                    { label: 'Inventory', href: '/franchise/inventory', icon: Warehouse },
                  ]).map(({ label, href, icon: Icon }) => <Link key={href} to={href} onClick={() => setNotificationsOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"><Icon className="h-4 w-4 text-[var(--brand-green-dark)]" />{label}</Link>)}
                </div> : null}
              </div>
              <div className="relative">
                <button type="button" onClick={() => { setProfileOpen((open) => !open); setNotificationsOpen(false); }} className="flex h-9 items-center gap-2 rounded-lg border border-[var(--border-subtle)] px-2 hover:bg-[var(--bg-secondary)]" aria-label="Open account menu" aria-expanded={profileOpen}>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[#eaf2e8] text-[11px] font-semibold text-[#285033]">{(user?.name?.trim()[0] ?? 'A').toUpperCase()}</span>
                  <span className="hidden max-w-32 text-left sm:block"><span className="block truncate text-xs font-semibold text-[var(--text-primary)]">{user?.name ?? 'Administrator'}</span><span className="block text-[10px] text-[var(--text-secondary)]">{role === 'SUPER_ADMIN' ? 'Super admin' : role === 'FRANCHISE_ADMIN' ? 'Franchise admin' : 'Admin'}</span></span>
                  <ChevronDown className="hidden h-3.5 w-3.5 text-[var(--text-secondary)] sm:block" />
                </button>
                {profileOpen ? <div className="absolute right-0 top-11 z-40 w-48 rounded-xl border border-[var(--border-subtle)] bg-white p-1.5 shadow-xl">
                  <Link to={profileHref} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"><UserRound className="h-4 w-4" />Profile</Link>
                  <Link to={role === 'SUPER_ADMIN' ? '/admin/settings' : '/franchise/profile'} onClick={() => setProfileOpen(false)} className="flex items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]"><Settings className="h-4 w-4" />Settings</Link>
                  <button type="button" onClick={handleLogout} className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-left text-sm text-red-700 hover:bg-red-50"><LogOut className="h-4 w-4" />Sign out</button>
                </div>
                : null}
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 sm:py-7 xl:px-8">{children}</main>
      </div>
    </div>
  );
}

export function SuperAdminInventoryPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const stockFilter = searchParams.get('filter') ?? '';
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [query, setQuery] = useState(() => searchParams.get('q') ?? '');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      if (!user?.accessToken) throw new Error('Your administrator session has expired. Please sign in again.');
      setProducts(await adminProductService.list());
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load inventory.');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => { setQuery(searchParams.get('q') ?? ''); }, [searchParams]);

  const stockItems = products.flatMap((product) => product.variants.map((variant) => {
    const available = variant.availableQuantity ?? Math.max(0, variant.quantity - (variant.reservedQuantity ?? 0));
    return { product, variant, available };
  }));
  const filteredItems = stockItems.filter(({ product, variant, available }) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery = !normalizedQuery
      || product.name.toLowerCase().includes(normalizedQuery)
      || product.sku.toLowerCase().includes(normalizedQuery)
      || variant.sku.toLowerCase().includes(normalizedQuery);
    const matchesStock = stockFilter === 'low-stock'
      ? available > 0 && available <= 5
      : stockFilter === 'out-of-stock'
        ? available === 0
        : stockFilter === 'available'
          ? available > 0
          : true;
    return matchesQuery && matchesStock;
  });
  const lowStockCount = stockItems.filter(({ available }) => available > 0 && available <= 5).length;
  const outOfStockCount = stockItems.filter(({ available }) => available === 0).length;
  const totalAvailable = stockItems.reduce((sum, item) => sum + item.available, 0);
  const lowStockOnly = stockFilter === 'low-stock';
  const updateInventoryFilter = (filter: string) => {
    const next = new URLSearchParams(searchParams);
    if (filter) next.set('filter', filter);
    else next.delete('filter');
    setSearchParams(next);
  };

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Commerce" title="Inventory" description="Review current catalogue stock and availability by product variant." />
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-[var(--text-secondary)]">Inventory figures are based on current product variant stock.</p>
        <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh inventory</Button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Products', value: products.length, to: '/admin/products' },
          { label: 'Tracked variants', value: stockItems.length, to: '/admin/inventory' },
          { label: 'Available units', value: totalAvailable, filter: 'available' },
          { label: 'Low-stock variants', value: lowStockCount, filter: 'low-stock' },
          { label: 'Out of stock', value: outOfStockCount, filter: 'out-of-stock' },
        ].map((metric) => <Link key={metric.label} to={metric.to ?? `/admin/inventory?filter=${metric.filter}`} className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand-green)]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
          <p className="text-xs font-medium text-[var(--text-secondary)]">{metric.label}</p>
          <p className="mt-2 text-2xl font-semibold tracking-tight text-[var(--text-primary)]">{metric.value.toLocaleString('en-IN')}</p>
          <span className="mt-2 block text-[11px] font-medium text-[var(--brand-green-dark)]">View details →</span>
        </Link>)}
      </div>
      {error ? <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert"><span>{error}</span><button type="button" onClick={() => void load()} className="font-semibold underline">Try again</button></div> : null}
      <section className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]" aria-label="Product inventory">
        <div className="flex flex-col gap-3 border-b border-[var(--border-subtle)] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-semibold">Stock by variant</h2><p className="mt-1 text-xs text-[var(--text-secondary)]">{stockFilter ? `Showing ${filteredItems.length} ${stockFilter === 'low-stock' ? 'low-stock' : stockFilter === 'out-of-stock' ? 'out-of-stock' : 'available'} variants` : `${lowStockCount} variants have 1–5 available units`}</p></div>
          <div className="flex w-full gap-2 sm:max-w-md"><input value={query} onChange={(event) => { setQuery(event.target.value); const next = new URLSearchParams(searchParams); if (event.target.value) next.set('q', event.target.value); else next.delete('q'); setSearchParams(next, { replace: true }); }} placeholder="Search products or SKUs" aria-label="Search inventory" className="h-10 min-w-0 flex-1 rounded-lg border border-[var(--border-subtle)] bg-white px-3 text-sm" />{stockFilter ? <button type="button" onClick={() => updateInventoryFilter('')} className="rounded-lg border border-[var(--border-subtle)] px-3 text-xs">Clear filter</button> : null}</div>
        </div>
        {loading ? <p className="p-6 text-sm text-[var(--text-secondary)]" role="status">Loading inventory…</p>
          : filteredItems.length ? <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead><tr>{['Product', 'Product SKU', 'Variant', 'Status', 'Available', 'Reserved'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead>
              <tbody>{filteredItems.map(({ product, variant, available }) => <tr key={variant.id ?? variant.sku} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-3 font-medium"><Link to={`/admin/products?productId=${encodeURIComponent(product.id)}`} className="underline-offset-2 hover:underline">{product.name}</Link></td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{product.sku}</td>
                <td className="px-4 py-3">{variant.sku}</td>
                <td className="px-4 py-3"><StatusBadge status={available === 0 ? 'Out of Stock' : available <= 5 ? 'Low Stock' : variant.status} /></td>
                <td className="px-4 py-3 font-semibold">{available}</td>
                <td className="px-4 py-3 text-[var(--text-secondary)]">{variant.reservedQuantity ?? 0}</td>
              </tr>)}</tbody>
            </table>
          </div>
          : <p className="p-6 text-sm text-[var(--text-secondary)]">{query ? 'No inventory matches your search.' : lowStockOnly ? 'No low-stock variants are available.' : 'No product variants are available.'}</p>}
      </section>
    </DashboardShell>
  );
}

export function SuperAdminUsersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Users" title="Network user access" description="Review global admins, franchise managers, and staff permissions for the Dream Spex organization." />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Name', 'Email', 'Role', 'Location', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franchiseUsers.map((user) => (
                <tr key={user.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{user.name}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{user.email}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{user.role}</td>
                  <td className="px-4 py-4 text-[var,--text-primary)]">{user.franchise ?? 'Network-wide'}</td>
                  <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function SuperAdminProfilePage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Profile" title="Super admin profile" description="Review profile information and admin-level account details for the Dream Spex leadership account." />
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ['Name', 'Dream Spex Super Admin'],
            ['Email', 'admin@dreamspex.com'],
            ['Role', 'SUPER_ADMIN'],
            ['Access Level', 'Network-wide'],
            ['Location', 'Head Office'],
            ['Status', 'Active'],
          ].map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

function SectionTitle({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-green-dark)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var,--text-primary)]">{title}</h1>
      </div>
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
    ACTIVE: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    INACTIVE: 'bg-red-500/15 text-red-300 border-red-500/30',
    SUSPENDED: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Active: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Inactive: 'bg-red-500/15 text-red-300 border-red-500/30',
    Pending: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Processing: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
    Delivered: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Shipped: 'bg-violet-500/15 text-violet-300 border-violet-500/30',
    'Low Stock': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    'Awaiting Docs': 'bg-amber-500/15 text-amber-300 border-amber-500/30',
    Approved: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
    Reviewed: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  };

  return (
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${palette[status] ?? 'bg-slate-500/15 text-[var(--text-secondary)] border-slate-500/30'}`}>
      {status}
    </span>
  );
}

function DeactivateFranchiseDialog({
  franchiseName,
  saving,
  error,
  onCancel,
  onConfirm,
}: {
  franchiseName: string;
  saving: boolean;
  error: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[160] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm">
      <section role="alertdialog" aria-modal="true" aria-labelledby="deactivate-franchise-title"
        className="w-full max-w-md rounded-3xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 shadow-2xl">
        <h2 id="deactivate-franchise-title" className="text-xl font-semibold text-[var(--text-primary)]">Deactivate {franchiseName}?</h2>
        <p className="mt-3 text-sm leading-6 text-[var(--text-secondary)]">
          This store will no longer appear in the Store Locator or receive new orders and product assignments. Existing orders, inventory, and reports will be preserved.
        </p>
        {error ? <p role="alert" className="mt-4 text-sm text-rose-600">{error}</p> : null}
        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="ghost" disabled={saving} onClick={onCancel}>Cancel</Button>
          <button type="button" disabled={saving} onClick={onConfirm}
            className="rounded-full bg-rose-700 px-5 py-2.5 text-sm font-semibold text-white hover:bg-rose-800 disabled:cursor-wait disabled:opacity-60">
            {saving ? 'Deactivating…' : 'Deactivate franchise'}
          </button>
        </div>
      </section>
    </div>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card]">{children}</div>;
}

function buildLinePath(values: number[], width: number, height: number, padding: number) {
  const maxValue = Math.max(...values, 1);
  const minValue = Math.min(...values, 0);
  const chartHeight = height - padding * 2;
  const chartWidth = width - padding * 2;
  const stepX = values.length > 1 ? chartWidth / (values.length - 1) : 0;

  const points = values.map((value, index) => {
    const x = padding + index * stepX;
    const normalized = (value - minValue) / (maxValue - minValue || 1);
    const y = height - padding - normalized * chartHeight;
    return { x, y };
  });

  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1]?.x ?? padding} ${height - padding} L ${points[0]?.x ?? padding} ${height - padding} Z`;
  return { linePath, areaPath, points };
}

function RevenueChart({ data }: { data: Array<{ label: string; value: number }> }) {
  const width = 760;
  const height = 220;
  const padding = 24;
  const { linePath, areaPath, points } = buildLinePath(data.map((item) => item.value), width, height, padding);

  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Revenue overview</p>
          <h3 className="mt-2 text-xl font-semibold text-[var,--text-primary)]">Network sales</h3>
        </div>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-1">
          {['7 Days', '30 Days', '3 Months', '1 Year'].map((period) => (
            <button key={period} type="button" className="rounded-full px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] data-[active=true]:bg-[var(--brand-green)] data-[active=true]:text-[#101810]" data-active={period === '30 Days'}>
              {period}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-56 w-full" role="img" aria-label="Revenue overview chart">
          {[0, 1, 2, 3].map((line) => {
            const y = padding + ((height - padding * 2) / 3) * line;
            return <line key={line} x1={padding} x2={width - padding} y1={y} y2={y} stroke="var(--border-subtle)" strokeDasharray="4 8" />;
          })}
          <path d={areaPath} fill="url(#revenueAreaGradient)" opacity="0.7" />
          <path d={linePath} fill="none" stroke="var(--brand-green)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          {points.map((point, index) => (
            <g key={data[index].label}>
              <circle cx={point.x} cy={point.y} r="4.5" fill="var(--brand-green)" />
              <circle cx={point.x} cy={point.y} r="10" fill="var(--brand-green)" opacity="0.12" />
            </g>
          ))}
          <defs>
            <linearGradient id="revenueAreaGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="var(--brand-green)" stopOpacity="0.38" />
              <stop offset="100%" stopColor="var(--brand-green)" stopOpacity="0.02" />
            </linearGradient>
          </defs>
        </svg>

        <div className="mt-4 flex items-center justify-between text-[11px] text-[var(--text-secondary)]">
          {data.map((item) => (
            <span key={item.label}>{item.label}</span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SuperAdminDashboardPage() {
  const [franchiseFilter, setFranchiseFilter] = useState('All Franchises');
  const visibleFranchises = franchiseFilter === 'All Franchises' ? franchises : franchises.filter((franchise) => franchise.city === franchiseFilter);
  const dashboardStats = [
    { label: 'Total Franchises', value: '4', helper: 'Across major regions', icon: Building2 },
    { label: 'Active Franchises', value: '3', helper: 'Healthy store performance', icon: CheckCircle2 },
    { label: 'Total Orders', value: '2,396', helper: 'Processed this quarter', icon: ShoppingCart },
    { label: 'Network Revenue', value: formatCurrency(3450000), helper: 'Net sales in the last cycle', icon: CircleDollarSign },
  ];

  const performanceRows = visibleFranchises.map((franchise) => ({
    city: franchise.city,
    revenue: franchise.sales ?? 0,
    orders: franchise.orders ?? 0,
    products: franchise.products ?? 0,
    status: franchise.status,
    trend: franchise.city === 'Hyderabad' ? '+18%' : franchise.city === 'Vijayawada' ? '+12%' : franchise.city === 'Bangalore' ? '+9%' : '+6%',
  }));

  return (
    <DashboardShell
      navItems={[
        { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid, active: true },
        { label: 'Franchises', href: '/admin/franchises', icon: Building2 },
        { label: 'Franchise Applications', href: '/admin/franchise-applications', icon: MessageSquareText },
        { label: 'Products', href: '/admin/products', icon: PackageOpen },
        { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
        { label: 'Customers', href: '/admin/customers', icon: Users },
        { label: 'Inventory', href: '/franchise/inventory', icon: Warehouse },
        { label: 'Reports', href: '/admin/reports', icon: TrendingUp },
        { label: 'Users', href: '/admin/users', icon: UserRound },
        { label: 'Settings', href: '/admin/settings', icon: Settings },
      ]}
      heading="SUPER ADMIN"
      subheading="Dream Spex Network"
      locationLabel="Network Control"
    >
      <div className="mb-6 flex flex-col gap-4 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.3em] text-[var(--text-secondary)]">Dream Spex Network</p>
          <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Manage every franchise, product, order and customer in one place.</h2>
        </div>
        <div className="flex items-center gap-3">
          <select value={franchiseFilter} onChange={(event) => setFranchiseFilter(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
            {['All Franchises', 'Hyderabad', 'Vijayawada', 'Bangalore', 'Chennai'].map((option) => (
              <option key={option}>{option}</option>
            ))}
          </select>
          <Link to="/admin/franchises/new"><Button>+ Add Franchise</Button></Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {dashboardStats.map((stat) => (
          <div key={stat.label} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">{stat.label}</p>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{stat.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-green)]/12 text-[var,--brand-green]">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
              <span>{stat.helper}</span>
              <span className="inline-flex items-center rounded-full bg-[var(--brand-green)]/10 px-2 py-1 text-[10px] font-semibold text-[var,--brand-green]">+12.4%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <RevenueChart data={adminSalesOverview.map((item) => ({ label: item.label, value: item.value * 12 }))} />

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Orders overview</p>
            <span className="rounded-full bg-[var(--brand-green)]/10 px-2 py-1 text-[10px] font-semibold text-[var,--brand-green]">This week</span>
          </div>

          <div className="space-y-4">
            {[
              { label: 'Completed', value: 2084, tone: 'bg-emerald-500/12 text-emerald-300' },
              { label: 'Processing', value: 126, tone: 'bg-sky-500/12 text-sky-300' },
              { label: 'Pending', value: 312, tone: 'bg-amber-500/12 text-amber-300' },
              { label: 'Cancelled', value: 48, tone: 'bg-rose-500/12 text-rose-300' },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                <div className="mb-2 flex items-center justify-between gap-3 text-sm">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${item.tone}`}>{item.value.toLocaleString()}</span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--bg-card)]">
                  <div className="h-full rounded-full bg-[var(--brand-green)]" style={{ width: `${Math.min((item.value / 2200) * 100, 100)}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Franchise performance</p>
              <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Regional revenue</h3>
            </div>
            <Link to="/admin/franchises" className="text-sm font-semibold text-[var(--brand-green-dark)]">View all</Link>
          </div>

          <div className="space-y-3">
            {performanceRows.map((franchise) => (
              <div key={franchise.city} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-base font-semibold text-[var(--text-primary)]">{franchise.city}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{franchise.city} Franchise</p>
                  </div>
                  <StatusBadge status={franchise.status} />
                </div>
                <div className="mt-4 grid gap-3 sm:grid-cols-3">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Revenue</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(franchise.revenue)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Orders</p>
                    <p className="mt-2 text-lg font-semibold text-[var,--text-primary)]">{franchise.orders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Products</p>
                    <p className="mt-2 text-lg font-semibold text-[var,--text-primary)]">{franchise.products}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <span>Trend</span>
                  <span className="font-semibold text-[var(--brand-green-dark)]">{franchise.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Inventory alerts</p>
            <span className="text-sm font-semibold text-[var,--brand-green]">Low stock</span>
          </div>
          <div className="space-y-3">
            {franchiseProducts.filter((product) => product.stock <= 24).slice(0, 4).map((product) => (
              <div key={product.id} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                    <p className="mt-1 text-xs text-[var(--text-secondary)]">{product.city}</p>
                  </div>
                  <span className="rounded-full bg-amber-500/10 px-2 py-1 text-[10px] font-semibold text-amber-300">Low</span>
                </div>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">Only {product.stock} left</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <div className="min-w-0 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent orders</p>
              <h3 className="mt-2 text-xl font-semibold text-[var,--text-primary)]">Order details</h3>
            </div>
            <Link to="/admin/orders" className="text-sm font-semibold text-[var,--brand-green]">View all</Link>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="text-[var(--text-secondary)]">
                <tr>
                  {['Order ID', 'Customer', 'Franchise', 'Product', 'Amount', 'Status', 'Date'].map((header) => (
                    <th key={header} className="px-3 py-3 font-medium whitespace-nowrap">{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {franchiseOrders.slice(0, 5).map((order) => (
                  <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                    <td className="px-3 py-3 font-medium text-[var(--text-primary)]">#{order.id.replace('DSO-', '')}</td>
                    <td className="px-3 py-3 text-[var,--text-primary)]">{order.customer}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{order.franchise}</td>
                    <td className="px-3 py-3 text-[var,--text-primary)]">{order.product}</td>
                    <td className="px-3 py-3 text-[var,--text-primary)]">{formatCurrency(order.amount)}</td>
                    <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="min-w-0 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Top selling products</p>
            <ArrowRight className="h-4 w-4 text-[var(--brand-green-dark)]" />
          </div>

          <div className="space-y-4">
            {franchiseProducts.slice(0, 4).map((product, index) => (
              <div key={product.id} className="flex items-center gap-3 rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                <img src={product.image} alt={product.name} className="h-14 w-14 rounded-xl object-cover" />
                <div className="flex-1">
                  <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{product.brand}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--text-secondary)]">{topProducts[index]?.sales ?? 24} orders</p>
                  <p className="mt-1 text-sm font-semibold text-[var,--brand-green]">{formatCurrency(topProducts[index]?.revenue ?? product.price * 10)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent registrations</p>
          <Link to="/admin/franchises" className="text-sm font-semibold text-[var(--brand-green-dark)]">Open list</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {franchiseRegistrations.map((entry) => (
            <div key={entry.name} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
              <p className="font-medium text-[var,--text-primary)]">{entry.name}</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{entry.date}</p>
              <div className="mt-3"><StatusBadge status={entry.status} /></div>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

export function FranchiseManagementPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [items, setItems] = useState<Franchise[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [statusError, setStatusError] = useState('');
  const [statusPendingId, setStatusPendingId] = useState('');
  const [deactivationCandidate, setDeactivationCandidate] = useState<Franchise | null>(null);
  const load = useCallback(async () => {
    if (!user?.accessToken) {
      setError('Your administrator session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      setItems(await franchiseService.adminList(user.accessToken));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load franchises.');
    } finally {
      setLoading(false);
    }
  }, [user?.accessToken]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const franchiseCreated = (location.state as { franchiseCreated?: string } | null)?.franchiseCreated;
    if (!franchiseCreated) return;
    setNotice(franchiseCreated);
    navigate(location.pathname, { replace: true, state: null });
  }, [location.pathname, location.state, navigate]);

  const updateFranchiseStatus = async (franchise: Franchise, status: 'ACTIVE' | 'INACTIVE') => {
    if (!user?.accessToken) {
      setStatusError('Your administrator session has expired. Please sign in again.');
      return;
    }
    setStatusPendingId(franchise.id);
    setStatusError('');
    try {
      const updated = await franchiseService.update(user.accessToken, franchise.id, {
        ...franchiseRequestFrom(franchise),
        status,
      });
      setItems((current) => current.map((item) => item.id === updated.id ? updated : item));
      setNotice(`${updated.name} is now ${status.toLowerCase()}. Existing orders and inventory are unchanged.`);
      if (status === 'INACTIVE') setDeactivationCandidate(null);
    } catch (reason) {
      setStatusError(reason instanceof Error ? reason.message : `Unable to ${status === 'ACTIVE' ? 'activate' : 'deactivate'} franchise.`);
    } finally {
      setStatusPendingId('');
    }
  };

  const renderFranchiseActions = (franchise: Franchise) => (
    <div className="flex flex-col items-stretch gap-1.5">
      <Link to={`/admin/franchises/${franchise.id}`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">View details</Link>
      <Link to={`/admin/franchises/${franchise.id}?edit=true`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)] hover:bg-[var(--bg-secondary)]">Edit</Link>
      <button type="button" disabled={statusPendingId === franchise.id}
        onClick={() => franchise.status === 'ACTIVE'
          ? setDeactivationCandidate(franchise)
          : void updateFranchiseStatus(franchise, 'ACTIVE')}
        className={`rounded-full px-3 py-2 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${franchise.status === 'ACTIVE' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-800 hover:bg-emerald-900'}`}>
        {statusPendingId === franchise.id ? 'Saving…' : franchise.status === 'ACTIVE' ? 'Deactivate' : 'Activate'}
      </button>
    </div>
  );

  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle eyebrow="Franchise Management" title="All franchises" description="Track franchise health, operational status, performance, and user readiness across the network." />
        <Link to="/admin/franchises/new">
          <Button>+ Add Franchise</Button>
        </Link>
      </div>

      {error ? <p role="alert" className="mb-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-500">{error}</p> : null}
      {statusError && !deactivationCandidate ? <p role="alert" className="mb-4 rounded-2xl bg-red-500/10 p-4 text-sm text-red-500">{statusError}</p> : null}
      {notice ? <p role="status" className="mb-4 rounded-2xl bg-emerald-500/10 p-4 text-sm text-emerald-700">{notice}</p> : null}
      {loading ? <p className="py-8 text-center text-sm text-[var(--text-secondary)]">Loading franchises...</p> : null}
      <TableCard>
        <div className="hidden xl:block">
          <table className="w-full table-fixed text-left text-sm">
            <colgroup><col className="w-[12%]" /><col className="w-[18%]" /><col className="w-[21%]" /><col className="w-[18%]" /><col className="w-[13%]" /><col className="w-[8%]" /><col className="w-[10%]" /></colgroup>
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Franchise ID', 'Store and owner', 'Location', 'Contact', 'Performance', 'Status', 'Actions'].map((heading) => (
                  <th key={heading} className="px-3 py-4 font-medium">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((franchise) => (
                <tr key={franchise.id} className="border-t border-[var(--border-subtle)] align-top">
                  <td className="break-words px-3 py-4 font-medium text-[var(--text-primary)]">{franchise.franchiseCode}</td>
                  <td className="break-words px-3 py-4 text-[var(--text-primary)]"><p className="font-semibold">{franchise.name}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{franchise.ownerName}</p></td>
                  <td className="break-words px-3 py-4 text-xs leading-5 text-[var(--text-secondary)]">{franchise.address}<br />{franchise.city}, {franchise.state} {franchise.postalCode}</td>
                  <td className="break-words px-3 py-4 text-xs leading-5 text-[var(--text-secondary)]">{franchise.phone}<br />{franchise.ownerEmail}</td>
                  <td className="px-3 py-4 text-xs leading-5 text-[var(--text-secondary)]">{franchise.products ?? 0} products<br />{franchise.orders ?? 0} orders<br />{formatCurrency(franchise.sales ?? 0)}</td>
                  <td className="px-3 py-4"><StatusBadge status={franchise.status} /></td>
                  <td className="px-2 py-3">{renderFranchiseActions(franchise)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="grid gap-3 p-3 sm:grid-cols-2 xl:hidden">
          {items.map((franchise) => (
            <article key={franchise.id} className="min-w-0 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-secondary)]">{franchise.franchiseCode}</p><h2 className="mt-1 break-words font-semibold text-[var(--text-primary)]">{franchise.name}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{franchise.ownerName}</p></div>
                <StatusBadge status={franchise.status} />
              </div>
              <p className="mt-3 break-words text-sm leading-5 text-[var(--text-secondary)]">{franchise.address}, {franchise.city}, {franchise.state} {franchise.postalCode}</p>
              <p className="mt-2 break-all text-xs leading-5 text-[var(--text-secondary)]">{franchise.phone} · {franchise.ownerEmail}</p>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">{franchise.products ?? 0} products · {franchise.orders ?? 0} orders · {formatCurrency(franchise.sales ?? 0)}</p>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Link to={`/admin/franchises/${franchise.id}`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)]">View details</Link>
                <Link to={`/admin/franchises/${franchise.id}?edit=true`} className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-center text-xs font-semibold text-[var(--text-primary)]">Edit</Link>
                <button type="button" disabled={statusPendingId === franchise.id}
                  onClick={() => franchise.status === 'ACTIVE'
                    ? setDeactivationCandidate(franchise)
                    : void updateFranchiseStatus(franchise, 'ACTIVE')}
                  className={`col-span-2 rounded-full px-3 py-2.5 text-xs font-semibold text-white disabled:cursor-wait disabled:opacity-60 ${franchise.status === 'ACTIVE' ? 'bg-rose-700 hover:bg-rose-800' : 'bg-emerald-800 hover:bg-emerald-900'}`}>
                  {statusPendingId === franchise.id ? 'Saving…' : franchise.status === 'ACTIVE' ? 'Deactivate franchise' : 'Activate franchise'}
                </button>
              </div>
            </article>
          ))}
        </div>
        {!loading && !items.length && !error ? <p className="p-8 text-center text-sm text-[var(--text-secondary)]">No franchises have been created yet.</p> : null}
      </TableCard>
      {deactivationCandidate ? <DeactivateFranchiseDialog franchiseName={deactivationCandidate.name}
        saving={statusPendingId === deactivationCandidate.id} error={statusError}
        onCancel={() => { if (!statusPendingId) { setDeactivationCandidate(null); setStatusError(''); } }}
        onConfirm={() => void updateFranchiseStatus(deactivationCandidate, 'INACTIVE')} /> : null}
    </DashboardShell>
  );
}

export function AddFranchisePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    franchiseName: '',
    franchiseId: '',
    ownerName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India',
    gstNumber: '',
    businessType: 'Retail Optical Studio',
    openingHours: '',
    availableServices: '',
    status: 'INACTIVE',
    latitude: '',
    longitude: '',
    deliveryRadiusKm: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.accessToken) {
      setError('Your administrator session has expired. Please sign in again.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const response = await franchiseService.create(user.accessToken, {
        franchiseCode: form.franchiseId.trim(),
        name: form.franchiseName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        city: form.city.trim(),
        state: form.state.trim(),
        postalCode: form.pincode.trim(),
        gstNumber: form.gstNumber.trim() || null,
        businessType: form.businessType.trim() || null,
        openingHours: form.openingHours.trim() || null,
        availableServices: form.availableServices.trim(),
        status: form.status,
        latitude: form.latitude ? Number(form.latitude) : null,
        longitude: form.longitude ? Number(form.longitude) : null,
        deliveryRadiusKm: form.deliveryRadiusKm ? Number(form.deliveryRadiusKm) : null,
      });
      navigate('/admin/franchises', {
        replace: true,
        state: {
          franchiseCreated: `${response.franchise.name} was created. A secure password setup invitation has been sent to ${response.loginEmail}.`,
        },
      });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to create the franchise.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Add Franchise" title="Create a new Dream Spex franchise" description="Capture the business profile, operational city, and admin onboarding details for the new outlet." />
      <form onSubmit={handleSubmit} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Franchise Information</h2>
            {[
              ['franchiseName', 'Franchise Name'],
              ['franchiseId', 'Franchise ID'],
              ['ownerName', 'Owner Name'],
              ['email', 'Email'],
              ['phone', 'Phone'],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm text-[var(--text-secondary)]">
                <span>{label}</span>
                <input
                  required={['franchiseName', 'franchiseId', 'ownerName', 'email', 'phone'].includes(key)}
                  type={key === 'email' ? 'email' : key === 'phone' ? 'tel' : 'text'}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => updateField(key as keyof typeof form, event.target.value)}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
            ))}
          </div>

          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Location</h2>
            {[
              ['address', 'Address'],
              ['city', 'City'],
              ['state', 'State'],
              ['pincode', 'Pincode'],
              ['latitude', 'Latitude'],
              ['longitude', 'Longitude'],
              ['deliveryRadiusKm', 'Delivery radius (km)'],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm text-[var(--text-secondary)]">
                <span>{label}</span>
                <input
                  required={['address', 'city', 'state', 'pincode'].includes(key)}
                  type={['latitude', 'longitude', 'deliveryRadiusKm'].includes(key) ? 'number' : 'text'}
                  step={key === 'deliveryRadiusKm' ? '0.01' : key === 'latitude' || key === 'longitude' ? 'any' : undefined}
                  value={form[key as keyof typeof form]}
                  onChange={(event) => updateField(key as keyof typeof form, event.target.value)}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
            ))}
          </div>

          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var,--text-primary)]">Business</h2>
            {[
              ['gstNumber', 'GST Number'],
              ['businessType', 'Business Type'],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm text-[var(--text-secondary)]">
                <span>{label}</span>
                <input
                  value={form[key as keyof typeof form]}
                  onChange={(event) => updateField(key as keyof typeof form, event.target.value)}
                  className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                />
              </label>
            ))}
            <label className="block text-sm text-[var(--text-secondary)]">
              <span>Status</span>
              <select value={form.status} onChange={(event) => updateField('status', event.target.value)}
                className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none">
                <option value="INACTIVE">Inactive</option>
                <option value="ACTIVE">Active</option>
                <option value="SUSPENDED">Suspended</option>
              </select>
            </label>
            <label className="block text-sm text-[var(--text-secondary)]">
              <span>Opening hours</span>
              <input
                placeholder="Mon-Sat: 09:00 AM - 06:00 PM; Sun: Closed"
                value={form.openingHours}
                onChange={(event) => updateField('openingHours', event.target.value)}
                className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
            <label className="block text-sm text-[var(--text-secondary)]">
              <span>Available services (separate with commas or new lines)</span>
              <textarea
                rows={3}
                value={form.availableServices}
                onChange={(event) => updateField('availableServices', event.target.value)}
                className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
              />
            </label>
          </div>

        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Create Franchise'}</Button>
          <Link to="/admin/franchises"><Button variant="ghost">Cancel</Button></Link>
        </div>

        {error ? <p role="alert" className="mt-5 text-sm text-red-500">{error}</p> : null}
      </form>
    </DashboardShell>
  );
}

export function FranchiseDetailPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [draft, setDraft] = useState<FranchiseRequest | null>(null);
  const [editing, setEditing] = useState(searchParams.get('edit') === 'true');
  const [showDeactivationDialog, setShowDeactivationDialog] = useState(false);
  const [assignments, setAssignments] = useState<FranchiseAssignment[]>([]);
  const [orders, setOrders] = useState<FranchiseOrder[]>([]);
  const [returns, setReturns] = useState<FranchiseReturn[]>([]);
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!user?.accessToken || !id) return;
    try {
      const [detail, catalog, franchiseOrders, franchiseReturns] = await Promise.all([
        franchiseService.adminGet(user.accessToken, id),
        franchiseService.adminProducts(user.accessToken, id),
        franchiseService.ordersForAdmin(user.accessToken, id),
        franchiseService.returnsForAdmin(user.accessToken, id),
      ]);
      setFranchise(detail);
      setDraft(franchiseRequestFrom(detail));
      setStatus(detail.status);
      setAssignments(catalog);
      setOrders(franchiseOrders);
      setReturns(franchiseReturns);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load franchise.');
    }
  }, [id, user?.accessToken]);
  useEffect(() => { void load(); }, [load]);

  const saveDetails = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user?.accessToken || !draft) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      const updated = await franchiseService.update(user.accessToken, id, draft);
      setFranchise(updated);
      setDraft(franchiseRequestFrom(updated));
      setStatus(updated.status);
      setEditing(false);
      setNotice('Franchise details updated successfully.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update franchise details.');
    } finally {
      setSaving(false);
    }
  };

  const saveStatus = async () => {
    if (!user?.accessToken || !franchise) return;
    setSaving(true);
    setError('');
    try {
      const updated = await franchiseService.update(user.accessToken, franchise.id, {
        franchiseCode: franchise.franchiseCode, name: franchise.name,
        ownerName: franchise.ownerName ?? '', email: franchise.ownerEmail ?? '',
        phone: franchise.phone ?? '', address: franchise.address, city: franchise.city,
        state: franchise.state, postalCode: franchise.postalCode, gstNumber: franchise.gstNumber,
        businessType: franchise.businessType, status, latitude: franchise.latitude,
        openingHours: franchise.openingHours,
        availableServices: franchise.availableServices.join('\n'),
        longitude: franchise.longitude, deliveryRadiusKm: franchise.deliveryRadiusKm,
      });
      setFranchise(updated);
      setDraft(franchiseRequestFrom(updated));
      setStatus(updated.status);
      setNotice(`Franchise status changed to ${status.toLowerCase()}.`);
      setShowDeactivationDialog(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update franchise.');
    } finally { setSaving(false); }
  };

  const adjustStock = async (item: FranchiseInventory) => {
    if (!user?.accessToken) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await franchiseService.adjustInventory(user.accessToken, id, item.id,
        Number(stockDraft[item.id] ?? item.quantity), item.lowStockThreshold);
      setNotice(`Stock updated for ${item.sku}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to adjust stock.');
    } finally { setSaving(false); }
  };

  const requestStatusUpdate = () => {
    if (status === 'INACTIVE' && franchise?.status === 'ACTIVE') {
      setShowDeactivationDialog(true);
      return;
    }
    void saveStatus();
  };

  if (!franchise) return <DashboardShell><p role={error ? 'alert' : 'status'} className="py-10 text-center text-sm text-[var(--text-secondary)]">{error || 'Loading franchise...'}</p></DashboardShell>;

  return (
    <DashboardShell>
      <div className="mb-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--brand-green-dark)]">{franchise.franchiseCode}</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{franchise.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]"><MapPin className="h-4 w-4 text-[var(--brand-green-dark)]" /> {franchise.city}, {franchise.state}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/franchises"><Button variant="ghost">Back to all</Button></Link>
            <Button variant="ghost" onClick={() => setEditing((current) => !current)}>{editing ? 'Cancel editing' : 'Edit details'}</Button>
            <Link to={`/admin/franchises/${franchise.id}/users`}><Button>Manage users</Button></Link>
          </div>
        </div>
      </div>

      {error ? <p role="alert" className="mt-4 text-sm text-red-600">{error}</p> : null}
      {notice ? <p role="status" className="mt-4 text-sm text-emerald-600">{notice}</p> : null}
      {editing && draft ? (
        <form onSubmit={saveDetails} className="mt-6 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <h2 className="mb-5 text-lg font-semibold text-[var(--text-primary)]">Edit franchise details</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {([
              ['franchiseCode', 'Franchise code'],
              ['name', 'Franchise name'],
              ['ownerName', 'Owner name'],
              ['email', 'Owner email'],
              ['phone', 'Phone'],
              ['address', 'Address'],
              ['city', 'City'],
              ['state', 'State'],
              ['postalCode', 'Postal code'],
              ['gstNumber', 'GST number'],
              ['businessType', 'Business type'],
              ['openingHours', 'Opening hours'],
              ['availableServices', 'Available services'],
              ['latitude', 'Latitude'],
              ['longitude', 'Longitude'],
              ['deliveryRadiusKm', 'Delivery radius (km)'],
            ] as const).map(([field, label]) => (
              <label key={field} className="block text-sm text-[var(--text-secondary)]">
                <span>{label}</span>
                {field === 'availableServices' ? (
                  <textarea
                    rows={3}
                    value={draft[field]}
                    onChange={(event) => setDraft((current) => current ? { ...current, availableServices: event.target.value } : current)}
                    className="mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                ) : (
                  <input
                    required={['franchiseCode', 'name', 'ownerName', 'email', 'phone', 'address', 'city', 'state', 'postalCode'].includes(field)}
                    type={field === 'email' ? 'email' : ['latitude', 'longitude', 'deliveryRadiusKm'].includes(field) ? 'number' : field === 'phone' ? 'tel' : 'text'}
                    placeholder={field === 'openingHours' ? 'Mon-Sat: 09:00 AM - 06:00 PM; Sun: Closed' : undefined}
                    step={field === 'deliveryRadiusKm' ? '0.01' : field === 'latitude' || field === 'longitude' ? 'any' : undefined}
                    value={draft[field] ?? ''}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDraft((current) => current ? {
                        ...current,
                        [field]: ['latitude', 'longitude', 'deliveryRadiusKm'].includes(field)
                          ? value === '' ? null : Number(value)
                          : value,
                      } : current);
                    }}
                    className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none"
                  />
                )}
              </label>
            ))}
          </div>
          <div className="mt-5 flex gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save details'}</Button>
            <Button type="button" variant="ghost" onClick={() => { setEditing(false); setDraft(franchiseRequestFrom(franchise)); }}>Cancel</Button>
          </div>
        </form>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Franchise owner</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{franchise.name}</h2>
            </div>
            <StatusBadge status={franchise.status} />
          </div>
          <div className="mt-6 space-y-4 text-sm text-[var(--text-secondary)]">
            <p><span className="font-medium text-[var(--text-primary)]">Location:</span> {franchise.city}, {franchise.state}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Owner:</span> {franchise.ownerName}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Contact:</span> {franchise.phone}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Email:</span> {franchise.ownerEmail}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Address:</span> {franchise.address}</p>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Actions</p>
          <div className="mt-6 space-y-3">
            <label className="block text-sm text-[var(--text-secondary)]">Account status
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-[var(--text-primary)]">
                <option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option><option value="SUSPENDED">Suspended</option>
              </select>
            </label>
            <Button disabled={saving || status === franchise.status} onClick={requestStatusUpdate}>Update status</Button>
            <Link to={`/admin/franchises/${franchise.id}/users`}><Button variant="ghost">View franchise users</Button></Link>
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Franchise performance</p>
          <Link to="/admin/franchises" className="text-sm font-semibold text-[var(--brand-green-dark)]">View all</Link>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {[['Published products', franchise.products], ['Orders', franchise.orders], ['Paid sales', formatCurrency(franchise.sales)]].map(([label, value]) => (
            <div key={String(label)} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
              <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent orders</p>
          <Link to="/admin/orders" className="text-sm font-semibold text-[var,--brand-green]">View all</Link>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>
                {['Order ID', 'Customer', 'Product', 'Amount', 'Status', 'Date'].map((header) => (
                  <th key={header} className="px-3 py-3 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{order.orderNumber}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{order.customerName}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{order.products.join(', ')}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                  <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{formatDate(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="mb-4 text-lg font-semibold text-[var(--text-primary)]">Franchise returns and refunds</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-[var(--text-secondary)]">
              <tr>{['Request', 'Order', 'Customer', 'Reason', 'Status', 'Refund', 'Date'].map((header) => (
                <th key={header} className="px-3 py-3 font-medium whitespace-nowrap">{header}</th>
              ))}</tr>
            </thead>
            <tbody>
              {returns.map((item) => <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{item.requestNumber}</td>
                <td className="px-3 py-3">{item.orderNumber}</td>
                <td className="px-3 py-3">{item.customerName}</td>
                <td className="px-3 py-3">{item.reasonCode}</td>
                <td className="px-3 py-3"><StatusBadge status={item.status} /></td>
                <td className="px-3 py-3">{formatCurrency(item.refundAmount)}</td>
                <td className="px-3 py-3">{formatDate(item.createdAt)}</td>
              </tr>)}
              {!returns.length ? <tr><td colSpan={7} className="px-3 py-8 text-center text-[var(--text-secondary)]">No returns or refund requests for this franchise.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </div>
      <section className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Central catalog and franchise stock</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Published products appear automatically. Update franchise stock from the Inventory page; central product details and pricing are managed by Super Admin.</p>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {assignments.map((assignment) => <article key={assignment.productId} className="rounded-xl border border-[var(--border-subtle)] p-4">
            <p className="font-medium">{assignment.productName}</p>
            {assignment.inventory.map((row) => <div key={row.id} className="mt-3 flex flex-wrap items-center gap-2 text-sm text-[var(--text-secondary)]">
              <span className="min-w-24">{row.sku}</span><span>{row.availableQuantity} available · reorder at {row.lowStockThreshold}</span>
              <input aria-label={`Set stock for ${row.sku}`} type="number" min={row.reservedQuantity} value={stockDraft[row.id] ?? row.quantity}
                onChange={(event) => setStockDraft((draft) => ({ ...draft, [row.id]: event.target.value }))}
                className="w-24 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-[var(--text-primary)]" />
              <Button variant="secondary" disabled={saving} onClick={() => void adjustStock(row)}>Save stock</Button>
            </div>)}
          </article>)}
        </div>
      </section>
      {showDeactivationDialog ? <DeactivateFranchiseDialog franchiseName={franchise.name}
        saving={saving} error={error}
        onCancel={() => { if (!saving) { setShowDeactivationDialog(false); setError(''); } }}
        onConfirm={() => void saveStatus()} /> : null}
    </DashboardShell>
  );
}

export function FranchiseUsersPage() {
  const { id = '' } = useParams();
  const { user } = useAuth();
  const [users, setUsers] = useState<Array<{ userId: string; name: string; email: string; status: string }>>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.accessToken || !id) return;
    void franchiseService.users(user.accessToken, id).then(setUsers)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load franchise users.'));
  }, [id, user?.accessToken]);
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Users" title="Franchise users" description="Manage staff access, logins, and admin permissions for this storefront." />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Name', 'Email', 'Role', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.userId} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{user.name}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{user.email}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">Franchise Admin</td>
                  <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function FranchiseProductsPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<FranchiseAssignment[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.accessToken) return;
    void franchiseService.products(user.accessToken).then(setProducts)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load the central catalog.'));
  }, [user?.accessToken]);
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Products" title="Central catalog" description="Published central products appear automatically. Manage only your franchise stock; central pricing is managed by Super Admin." />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      {!error && products.length === 0 ? <p className="rounded-2xl border border-[var(--border-subtle)] p-8 text-center text-sm text-[var(--text-secondary)]">No published central products are available yet.</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {products.map((product) => (
          <div key={product.productId} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{product.brand}</p>
            <h3 className="mt-3 text-xl font-semibold text-[var(--text-primary)]">{product.productName}</h3>
            <div className="mt-4 space-y-2 text-sm text-[var(--text-secondary)]">
              {product.inventory.map((item) => (
                <div key={item.variantId} className="flex items-center justify-between">
                  <span>{item.sku}</span><span>{item.availableQuantity} available</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function FranchiseOrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<FranchiseOrder[]>([]);
  const [returns, setReturns] = useState<FranchiseReturn[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    try {
      const [nextOrders, nextReturns] = await Promise.all([
        franchiseService.orders(user.accessToken),
        franchiseService.returns(user.accessToken),
      ]);
      setOrders(nextOrders);
      setReturns(nextReturns);
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load orders.');
    }
  }, [user?.accessToken]);
  useEffect(() => { void load(); }, [load]);
  const updateStatus = async (order: FranchiseOrder, status: string) => {
    if (!user?.accessToken || !status) return;
    if (status === 'PICKED_UP'
      && !window.confirm(`Confirm that the customer has collected order ${order.orderNumber}?`)) return;
    setSavingId(order.id);
    setError('');
    setNotice('');
    try {
      await franchiseService.updateOrderStatus(user.accessToken, order.id, status);
      setNotice(`${order.orderNumber} updated to ${orderStatusLabel(status, order.fulfillmentType)}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update order status.');
    } finally {
      setSavingId('');
    }
  };
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Orders" title="Franchise orders" description="Track all customer orders placed through this local Dream Spex business." />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      {notice ? <p role="status" className="mb-4 text-sm text-emerald-600">{notice}</p> : null}
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var,--text-secondary)]">
              <tr>
                {['Order ID', 'Customer', 'Product', 'Amount', 'Fulfillment', 'Destination', 'Status', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]"><Link to={`/franchise/orders/${order.id}`}>{order.orderNumber}</Link></td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.customerName}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{order.products.join(', ')}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{isPickupOrder(order.fulfillmentType) ? 'Store Pickup' : 'Home Delivery'}</td>
                  <td className="max-w-64 px-4 py-4 text-[var(--text-secondary)]">
                    {isPickupOrder(order.fulfillmentType)
                      ? [order.fulfillmentStore?.name, order.fulfillmentStore?.address, order.fulfillmentStore?.city,
                        order.fulfillmentStore?.state, order.fulfillmentStore?.postalCode].filter(Boolean).join(', ')
                        || 'Pickup store details unavailable'
                      : [order.shippingAddress?.recipientName, order.shippingAddress?.line1, order.shippingAddress?.line2,
                        order.shippingAddress?.city, order.shippingAddress?.state, order.shippingAddress?.postalCode]
                        .filter(Boolean).join(', ') || 'Delivery address unavailable'}
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={orderStatusLabel(order.status, order.fulfillmentType)} /></td>
                  <td className="px-4 py-4">
                    <select
                      aria-label={`Update ${order.orderNumber} status`}
                      value=""
                      disabled={savingId === order.id}
                      onChange={(event) => void updateStatus(order, event.target.value)}
                      className="min-w-40 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm"
                    >
                      <option value="" disabled>Update status</option>
                      {order.paymentStatus === 'PAID' ? nextFranchiseOrderStatuses(order.status, order.fulfillmentType)
                        .filter((status) => status !== 'PICKED_UP' || isPickupOrder(order.fulfillmentType))
                        .map((status) => <option key={status} value={status}>{status.replaceAll('_', ' ')}</option>) : null}
                    </select>
                  </td>
                </tr>
              ))}
              {!orders.length ? <tr><td colSpan={8} className="px-4 py-8 text-center text-[var(--text-secondary)]">No orders have been assigned to this franchise.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </TableCard>
      <SectionTitle eyebrow="Returns" title="Return and refund requests" description="Customer returns and refund progress for orders fulfilled by your franchise." />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>{['Request', 'Order', 'Customer', 'Reason', 'Status', 'Refund', 'Date'].map((header) => (
                <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
              ))}</tr>
            </thead>
            <tbody>
              {returns.map((item) => <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{item.requestNumber}</td>
                <td className="px-4 py-4">{item.orderNumber}</td>
                <td className="px-4 py-4">{item.customerName}</td>
                <td className="px-4 py-4">{item.reasonCode}</td>
                <td className="px-4 py-4"><StatusBadge status={item.status} /></td>
                <td className="px-4 py-4">{formatCurrency(item.refundAmount)}</td>
                <td className="px-4 py-4">{formatDate(item.createdAt)}</td>
              </tr>)}
              {!returns.length ? <tr><td colSpan={7} className="px-4 py-8 text-center text-[var(--text-secondary)]">No return or refund requests.</td></tr> : null}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function FranchiseCustomersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<FranchiseOrder[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.accessToken) return;
    void franchiseService.orders(user.accessToken).then(setOrders)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load franchise customers.'));
  }, [user?.accessToken]);
  const customers = [...new Map(orders.map((order) => [order.customerEmail ?? order.customerPhone ?? order.customerName, order])).values()];
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Customers" title="Franchise customer base" description="Monitor local retention, repeat purchases, and customer engagement." />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Name', 'City', 'Orders', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {customers.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{order.customerName}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{order.customerEmail || order.customerPhone || '—'}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{orders.filter((entry) => entry.customerEmail === order.customerEmail).length}</td>
                  <td className="px-4 py-4"><StatusBadge status="ACTIVE" /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function SuperAdminOrdersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Orders" title="Network orders" description="Monitor the full order pipeline across all franchise hubs." />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var,--text-secondary)]">
              <tr>
                {['Order ID', 'Customer', 'Franchise', 'Amount', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franchiseOrders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{order.id}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.customer}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{order.franchise}</td>
                  <td className="px-4 py-4 text-[var,--text-primary)]">{formatCurrency(order.amount)}</td>
                  <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function SuperAdminProductsPage() {
  const { user, refreshSession } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [returnabilityByProductId, setReturnabilityByProductId] = useState<Record<string, boolean>>({});
  const [selected, setSelected] = useState<AdminProduct | null>(null);
  const [editorOpen, setEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [productQuery, setProductQuery] = useState(() => searchParams.get('q') ?? '');
  const [productStatus, setProductStatus] = useState(() => searchParams.get('status') ?? 'ALL');
  const [productCategory, setProductCategory] = useState(() => searchParams.get('categoryId') ?? 'ALL');
  const [productPage, setProductPage] = useState(0);

  const refresh = async () => {
    setLoading(true);
    setError('');
    try {
      const [nextProducts, nextCategories, returnability] = await Promise.all([
        adminProductService.list(),
        adminProductService.categories(),
        adminProductService.returnability(),
      ]);
      setProducts(nextProducts);
      setCategories(nextCategories.filter((category) => category.status === 'ACTIVE'));
      setReturnabilityByProductId(Object.fromEntries(returnability.map((item) => [item.productId, item.returnable])));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load products.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void refresh();
  }, []);

  useEffect(() => {
    setProductQuery(searchParams.get('q') ?? '');
    setProductStatus(searchParams.get('status') ?? 'ALL');
    setProductCategory(searchParams.get('categoryId') ?? 'ALL');
    setProductPage(0);
    const productId = searchParams.get('productId');
    const product = productId ? products.find((item) => item.id === productId) : undefined;
    if (product) {
      setSelected(product);
      setEditorOpen(true);
    }
  }, [products, searchParams]);

  const filteredProducts = useMemo(() => products.filter((product) => {
    const query = productQuery.trim().toLowerCase();
    const matchesQuery = !query || product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query) || product.brand.toLowerCase().includes(query) || product.categories.some((category) => category.name.toLowerCase().includes(query));
    const matchesStatus = productStatus === 'ALL' || product.status === productStatus;
    const matchesCategory = productCategory === 'ALL' || product.categories.some((category) => category.id === productCategory);
    return matchesQuery && matchesStatus && matchesCategory;
  }), [productCategory, productQuery, productStatus, products]);
  const productsPerPage = 9;
  const pagedProducts = filteredProducts.slice(productPage * productsPerPage, (productPage + 1) * productsPerPage);
  const productPageCount = Math.max(1, Math.ceil(filteredProducts.length / productsPerPage));
  const updateProductFilters = (updates: Record<string, string>) => {
    const next = new URLSearchParams(searchParams);
    Object.entries(updates).forEach(([key, value]) => value && value !== 'ALL' ? next.set(key, value) : next.delete(key));
    setSearchParams(next, { replace: true });
  };
  const openProductEditor = (product: AdminProduct | null) => {
    setSelected(product);
    setEditorOpen(true);
    const next = new URLSearchParams(searchParams);
    if (product) next.set('productId', product.id);
    else next.delete('productId');
    setSearchParams(next);
  };
  const closeProductEditor = () => {
    setSelected(null);
    setEditorOpen(false);
    const next = new URLSearchParams(searchParams);
    next.delete('productId');
    setSearchParams(next, { replace: true });
  };

  const storedMediaPath = (upload: { url: string; storageKey: string }) => ({
    ...upload,
    url: new URL(upload.url).pathname,
  });

  const uploadTryOnImage = async (file: File) => {
    if (!user?.accessToken) throw new Error('Your admin session has expired. Please sign in again.');
    try {
      return storedMediaPath(await adminService.uploadCmsImage(user.accessToken, file));
    } catch (reason) {
      if (!(reason instanceof AdminApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
      const session = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
      if (!session.accessToken) throw new Error('Your admin session has expired. Please sign in again.');
      return storedMediaPath(await adminService.uploadCmsImage(session.accessToken, file));
    }
  };

  const save = async (request: AdminProductRequest, gst: AdminProductGstRequest, returnable: boolean) => {
    setError('');
    setNotice('');
    setSaving(true);
    try {
      const savedProduct = selected
        ? await adminProductService.update(selected.id, request)
        : await adminProductService.create(request);
      setSelected(savedProduct);
      try {
        await adminProductService.updateGst(savedProduct.id, gst);
      } catch (reason) {
        await refresh();
        setError(`Product was saved, but its GST classification could not be updated: ${reason instanceof Error ? reason.message : 'Please try again.'}`);
        return;
      }
      try {
        await adminProductService.setReturnable(savedProduct.id, returnable);
      } catch (reason) {
        await refresh();
        setError(`Product was saved, but its return setting could not be updated: ${reason instanceof Error ? reason.message : 'Please try again.'}`);
        return;
      }
      setReturnabilityByProductId((current) => ({ ...current, [savedProduct.id]: returnable }));
      setNotice(selected ? 'Product and return setting updated successfully.' : 'Product created successfully.');
      setSelected(null);
      setEditorOpen(false);
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete('productId');
      setSearchParams(nextParams, { replace: true });
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save product.');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (product: AdminProduct, status: string) => {
    setError('');
    setNotice('');
    try {
      await adminProductService.setStatus(product.id, status);
      setNotice(`${product.name} is now ${status.toLowerCase().replace('_', ' ')}.`);
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to change product status.');
    }
  };

  const deleteProduct = async (product: AdminProduct) => {
    if (!window.confirm(`Delete "${product.name}"? This will remove it from the catalog.`)) return;
    setError('');
    setNotice('');
    setDeletingId(product.id);
    try {
      await adminProductService.delete(product.id);
      setNotice(`${product.name} was deleted successfully.`);
      if (selected?.id === product.id) {
        setSelected(null);
        setEditorOpen(false);
        const nextParams = new URLSearchParams(searchParams);
        nextParams.delete('productId');
        setSearchParams(nextParams, { replace: true });
      }
      await refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to delete product.');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Products" title="Network products" description="Manage the catalog, inventory and publishing status from the live backend." />
      {error ? <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}
      {notice ? <div className="mb-4 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div> : null}
      {editorOpen ? (
        <ProductEditor
          product={selected}
          returnable={selected ? returnabilityByProductId[selected.id] ?? false : false}
          categories={categories}
          saving={saving}
          onUploadTryOnImage={uploadTryOnImage}
          onCancel={closeProductEditor}
          onSave={save}
        />
      ) : null}
      <div className="mb-5 flex justify-end">
        <Button onClick={() => openProductEditor(null)}>Create Product</Button>
      </div>
      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {[
          { label: 'Total products', count: products.length, status: 'ALL' },
          { label: 'Published', count: products.filter((product) => product.status === 'PUBLISHED').length, status: 'PUBLISHED' },
          { label: 'Draft', count: products.filter((product) => product.status === 'DRAFT').length, status: 'DRAFT' },
          { label: 'Inactive', count: products.filter((product) => product.status === 'INACTIVE').length, status: 'INACTIVE' },
          { label: 'Categories', count: categories.length, href: '/admin/categories' },
        ].map((metric) => <Link key={metric.label} to={metric.href ?? `/admin/products${metric.status === 'ALL' ? '' : `?status=${metric.status}`}`} className="group rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--brand-green)]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
          <p className="text-xs font-medium text-[var(--text-secondary)]">{metric.label}</p><p className="mt-2 text-2xl font-semibold">{metric.count.toLocaleString('en-IN')}</p><span className="mt-2 block text-[11px] font-medium text-[var(--brand-green-dark)]">View details →</span>
        </Link>)}
      </div>
      <div className="mb-5 flex flex-wrap gap-3 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <input value={productQuery} onChange={(event) => { setProductQuery(event.target.value); setProductPage(0); updateProductFilters({ q: event.target.value }); }} placeholder="Search name, SKU or brand" className="min-w-[220px] flex-1 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
        <select value={productStatus} onChange={(event) => { setProductStatus(event.target.value); setProductPage(0); updateProductFilters({ status: event.target.value }); }} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]">
          <option value="ALL">All statuses</option>
          {['DRAFT', 'PUBLISHED', 'INACTIVE'].map((value) => <option key={value}>{value}</option>)}
        </select>
        <select value={productCategory} onChange={(event) => { setProductCategory(event.target.value); setProductPage(0); updateProductFilters({ categoryId: event.target.value }); }} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]">
          <option value="ALL">All categories</option>
          {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
        </select>
      </div>
      {loading && products.length === 0 ? (
        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-secondary)]">Loading products...</div>
      ) : filteredProducts.length === 0 ? (
        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 text-sm text-[var(--text-secondary)]">No products match the selected filters.</div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {pagedProducts.map((product) => (
            <div key={product.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
              {product.images[0]?.imageUrl ? <img src={product.images[0].imageUrl} alt={product.images[0].altText ?? product.name} className="mb-4 h-40 w-full rounded-2xl object-cover" /> : null}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-xl font-semibold text-[var(--text-primary)]"><button type="button" onClick={() => openProductEditor(product)} className="text-left underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand-green)]">{product.name}</button></h3>
                  <p className="mt-1 text-sm text-[var(--text-secondary)]">{product.brand} · {product.sku}</p>
                </div>
                <StatusBadge status={product.status} />
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-lg font-semibold text-[var(--text-primary)]">{formatCurrency(product.basePrice)}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {product.variants.reduce((total, variant) => total + (variant.availableQuantity ?? Math.max(0, variant.quantity - (variant.reservedQuantity ?? 0))), 0)} available
                </span>
              </div>
              <p className="mt-2 text-xs text-[var(--text-secondary)]">
                HSN {product.hsnCode || 'not set'} · {product.gstEnabled ? product.gstRate == null ? 'Global GST rate' : `${product.gstRate}% product rate` : 'GST disabled'}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => openProductEditor(product)}>Edit</Button>
                <Button variant="ghost" onClick={() => void changeStatus(product, product.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED')}>
                  {product.status === 'PUBLISHED' ? 'Unpublish' : 'Publish'}
                </Button>
                <Button variant="ghost" disabled={deletingId === product.id} onClick={() => void deleteProduct(product)}>
                  {deletingId === product.id ? 'Deleting...' : 'Delete'}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
      {!loading && filteredProducts.length > 0 ? <div className="mt-5 flex items-center justify-between gap-4 text-sm text-[var(--text-secondary)]"><span>Showing {productPage * productsPerPage + 1}-{Math.min((productPage + 1) * productsPerPage, filteredProducts.length)} of {filteredProducts.length}</span><div className="flex gap-2"><Button type="button" variant="ghost" disabled={productPage === 0} onClick={() => setProductPage((page) => page - 1)}>Previous</Button><Button type="button" variant="ghost" disabled={productPage + 1 >= productPageCount} onClick={() => setProductPage((page) => page + 1)}>Next</Button></div></div> : null}
    </DashboardShell>
  );
}

type ProductEditorProps = {
  product: AdminProduct | null;
  returnable: boolean;
  categories: AdminCategory[];
  saving: boolean;
  onUploadTryOnImage: (file: File) => Promise<{ url: string; storageKey: string }>;
  onCancel: () => void;
  onSave: (request: AdminProductRequest, gst: AdminProductGstRequest, returnable: boolean) => Promise<void>;
};

function ProductEditor({ product, returnable: initialReturnable, categories, saving, onUploadTryOnImage, onCancel, onSave }: ProductEditorProps) {
  const [form, setForm] = useState<AdminProductRequest>(() => productRequest(product));
  const [returnable, setReturnable] = useState(initialReturnable);
  const [hsnCode, setHsnCode] = useState(product?.hsnCode ?? '');
  const [useGlobalRate, setUseGlobalRate] = useState(product?.gstRate == null);
  const [gstRate, setGstRate] = useState(product?.gstRate == null ? '' : String(product.gstRate));
  const [gstEnabled, setGstEnabled] = useState(product?.gstEnabled ?? true);
  const [validationError, setValidationError] = useState('');
  const [tryOnFile, setTryOnFile] = useState<File | null>(null);
  const [tryOnPreviewUrl, setTryOnPreviewUrl] = useState<string | null>(null);
  const [uploadingTryOnImage, setUploadingTryOnImage] = useState(false);

  useEffect(() => {
    setForm(productRequest(product));
    setReturnable(initialReturnable);
    setHsnCode(product?.hsnCode ?? '');
    setUseGlobalRate(product?.gstRate == null);
    setGstRate(product?.gstRate == null ? '' : String(product.gstRate));
    setGstEnabled(product?.gstEnabled ?? true);
    setTryOnFile(null);
    setValidationError('');
  }, [initialReturnable, product]);

  useEffect(() => {
    if (!tryOnFile) {
      setTryOnPreviewUrl(null);
      return undefined;
    }
    const previewUrl = URL.createObjectURL(tryOnFile);
    setTryOnPreviewUrl(previewUrl);
    return () => URL.revokeObjectURL(previewUrl);
  }, [tryOnFile]);

  const update = <K extends keyof AdminProductRequest>(key: K, value: AdminProductRequest[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.sku.trim() || !form.name.trim() || !form.slug.trim() || !form.brand.trim() || !form.description.trim()) {
      setValidationError('SKU, name, slug, brand and description are required.');
      return;
    }
    if (form.basePrice < 0 || form.variants.some((variant) => !variant.sku.trim() || variant.quantity < 0 || variant.additionalPrice < 0 || variant.reservedQuantity < 0 || variant.reservedQuantity > variant.quantity)) {
      setValidationError('Prices and inventory must be non-negative, every variant needs a SKU, and reserved inventory cannot exceed quantity.');
      return;
    }
    if (form.images.some((image) => !image.imageUrl.trim())) {
      setValidationError('Every image needs an image URL.');
      return;
    }
    if (hsnCode.trim() && !/^(?:\d{4}|\d{6}|\d{8})$/.test(hsnCode.trim())) {
      setValidationError('HSN code must contain 4, 6, or 8 digits.');
      return;
    }
    const parsedGstRate = gstRate === '' ? null : Number(gstRate);
    if (!useGlobalRate && (parsedGstRate == null || !isValidGstRate(parsedGstRate))) {
      setValidationError('Enter a product GST rate between 0 and 100, or select the global rate.');
      return;
    }
    setValidationError('');
    let tryOnImageUrl = form.tryOnImageUrl;
    if (tryOnFile) {
      setUploadingTryOnImage(true);
      try {
        const uploaded = await onUploadTryOnImage(tryOnFile);
        tryOnImageUrl = uploaded.url;
      } catch (reason) {
        setValidationError(reason instanceof Error ? reason.message : 'Unable to upload the Virtual Try-On image.');
        return;
      } finally {
        setUploadingTryOnImage(false);
      }
    }
    await onSave({
      ...form,
      sku: form.sku.trim(),
      name: form.name.trim(),
      slug: form.slug.trim(),
      brand: form.brand.trim(),
      description: form.description.trim(),
      tryOnImageUrl,
    }, {
      hsnCode: hsnCode.trim() || null,
      useGlobalRate,
      gstRate: useGlobalRate ? null : parsedGstRate,
      gstEnabled,
    }, returnable);
  };

  return (
    <form onSubmit={submit} className="mb-6 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-green-dark)]">{product ? 'Edit product' : 'New product'}</p>
          <h3 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{product ? product.name : 'Create a catalog product'}</h3>
        </div>
        <Button type="button" variant="ghost" onClick={onCancel}>Close</Button>
      </div>
      {validationError ? <div className="mb-4 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">{validationError}</div> : null}
      <div className="grid gap-4 md:grid-cols-2">
        <ProductInput label="SKU" value={form.sku} onChange={(value) => update('sku', value)} required />
        <ProductInput label="Name" value={form.name} onChange={(value) => update('name', value)} required />
        <ProductInput label="Slug" value={form.slug} onChange={(value) => update('slug', value)} required />
        <ProductInput label="Brand" value={form.brand} onChange={(value) => update('brand', value)} required />
        <ProductInput label="Base price" type="number" min="0" step="0.01" value={String(form.basePrice)} onChange={(value) => update('basePrice', Number(value))} required />
        <ProductInput label="Compare-at price" type="number" min="0" step="0.01" value={form.compareAtPrice == null ? '' : String(form.compareAtPrice)} onChange={(value) => update('compareAtPrice', value === '' ? null : Number(value))} />
        <ProductInput label="Material" value={form.material ?? ''} onChange={(value) => update('material', value || null)} />
        <ProductInput label="Gender" value={form.gender ?? ''} onChange={(value) => update('gender', value || null)} />
        <ProductInput label="Frame shape" value={form.frameShape ?? ''} onChange={(value) => update('frameShape', value || null)} />
        <ProductInput label="Frame type" value={form.frameType ?? ''} onChange={(value) => update('frameType', value || null)} />
        <ProductInput label="Badge" value={form.badge ?? ''} onChange={(value) => update('badge', value || null)} />
        <label className="text-sm text-[var(--text-secondary)]">
          <span>Status</span>
          <select className={inputClass} value={form.status} onChange={(event) => update('status', event.target.value)}>
            {['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'PUBLISHED', 'INACTIVE'].map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
      </div>
      <section className="mt-5 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
        <h4 className="font-semibold text-[var(--text-primary)]">GST classification</h4>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">
            <span>HSN code</span>
            <input inputMode="numeric" maxLength={16} value={hsnCode} onChange={(event) => setHsnCode(event.target.value)} className={inputClass} />
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)]">
            <input type="checkbox" checked={gstEnabled} onChange={(event) => setGstEnabled(event.target.checked)} className="h-4 w-4 accent-[#7CBF00]" />
            GST applies to this product
          </label>
          <label className="flex items-center gap-3 text-sm text-[var(--text-secondary)] md:col-span-2">
            <input type="checkbox" checked={useGlobalRate} onChange={(event) => setUseGlobalRate(event.target.checked)} className="h-4 w-4 accent-[#7CBF00]" />
            Use global GST rate
          </label>
          {!useGlobalRate ? <ProductInput label="Product GST rate (%)" type="number" min="0" max="100" step="0.01" value={gstRate} onChange={setGstRate} required /> : null}
        </div>
      </section>
      <label className="mt-5 flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm">
        <input type="checkbox" checked={returnable} onChange={(event) => setReturnable(event.target.checked)} className="mt-0.5 h-4 w-4 accent-[#7CBF00]" />
        <span><span className="block font-semibold text-[var(--text-primary)]">{returnable ? 'Returnable' : 'Non-returnable'}</span><span className="mt-1 block text-xs text-[var(--text-secondary)]">Customers can request a return or replacement for this product only when enabled and when the order meets the configured return policy.</span></span>
      </label>
      <label className="mt-4 block text-sm text-[var(--text-secondary)]">
        <span>Description</span>
        <textarea className={`${inputClass} min-h-24 rounded-2xl`} value={form.description} onChange={(event) => update('description', event.target.value)} />
      </label>
      <section className="mt-6 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
        <h4 className="font-semibold text-[var(--text-primary)]">Virtual Try-On image</h4>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">Optional. Upload a transparent PNG or WebP containing only the glasses, without a background. This image is stored separately and does not replace the catalogue image.</p>
        {tryOnPreviewUrl || form.tryOnImageUrl ? <img
          src={tryOnPreviewUrl ?? resolveCmsMediaUrl(form.tryOnImageUrl) ?? ''}
          alt="Virtual Try-On frame preview"
          className="mt-3 h-28 w-full rounded-xl border border-[var(--border-subtle)] bg-[linear-gradient(45deg,#d1d5db_25%,transparent_25%,transparent_75%,#d1d5db_75%),linear-gradient(45deg,#d1d5db_25%,#fff_25%,#fff_75%,#d1d5db_75%)] bg-[length:16px_16px] bg-[position:0_0,8px_8px] object-contain"
        /> : null}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="inline-flex cursor-pointer items-center justify-center rounded-full border border-[var(--border-subtle)] px-4 py-2 text-sm font-semibold text-[var(--text-primary)] transition hover:border-[var(--brand-green)]">
            {tryOnFile || form.tryOnImageUrl ? 'Replace image' : 'Upload image'}
            <input
              type="file"
              accept="image/png,image/webp,.png,.webp"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                event.target.value = '';
                if (!file) return;
                if (!['image/png', 'image/webp'].includes(file.type) || file.size > 10 * 1024 * 1024) {
                  setValidationError('Choose a PNG or WebP image no larger than 10 MB.');
                  return;
                }
                setValidationError('');
                setTryOnFile(file);
              }}
            />
          </label>
          {form.tryOnImageUrl || tryOnFile ? <Button
            type="button"
            variant="ghost"
            onClick={() => {
              setTryOnFile(null);
              update('tryOnImageUrl', '');
            }}
          >Remove image</Button> : null}
          {uploadingTryOnImage ? <span role="status" className="text-sm text-[var(--text-secondary)]">Uploading image...</span> : null}
        </div>
      </section>
      <div className="mt-6">
        <EditorHeading title="Categories" action={<Button type="button" variant="ghost" onClick={() => update('categoryIds', [...form.categoryIds, ''])}>Add category</Button>} />
        <div className="space-y-2">
          {form.categoryIds.map((categoryId, index) => (
            <div key={`${categoryId}-${index}`} className="flex gap-2">
              <select className={inputClass} value={categoryId} onChange={(event) => update('categoryIds', form.categoryIds.map((id, itemIndex) => itemIndex === index ? event.target.value : id))}>
                <option value="">Select category</option>
                {categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}
              </select>
              <Button type="button" variant="ghost" onClick={() => update('categoryIds', form.categoryIds.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <EditorHeading title="Variants and inventory" action={<Button type="button" variant="ghost" onClick={() => update('variants', [...form.variants, emptyVariant()])}>Add variant</Button>} />
        <div className="space-y-3">
          {form.variants.map((variant, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3 md:grid-cols-8">
              <ProductInput label="SKU" value={variant.sku} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, sku: value } : item))} />
              <ProductInput label="Color" value={variant.color ?? ''} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, color: value || null } : item))} />
              <ProductInput label="Size" value={variant.size ?? ''} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, size: value || null } : item))} />
              <ProductInput label="Lens type" value={variant.lensType ?? ''} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, lensType: value || null } : item))} />
              <ProductInput label="Adjustment" type="number" min="0" step="0.01" value={String(variant.additionalPrice)} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, additionalPrice: Number(value) } : item))} />
              <ProductInput label="Quantity" type="number" min="0" value={String(variant.quantity)} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, quantity: Number(value) } : item))} />
              <ProductInput label="Reserved" type="number" min="0" max={String(variant.quantity)} value={String(variant.reservedQuantity)} onChange={(value) => update('variants', form.variants.map((item, itemIndex) => itemIndex === index ? { ...item, reservedQuantity: Number(value) } : item))} />
              <div className="flex items-end"><Button type="button" variant="ghost" onClick={() => update('variants', form.variants.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6">
        <EditorHeading title="Images" action={<Button type="button" variant="ghost" onClick={() => update('images', [...form.images, emptyImage(form.images.length)])}>Add image</Button>} />
        <div className="space-y-3">
          {form.images.map((image, index) => (
            <div key={index} className="grid gap-2 rounded-2xl border border-[var(--border-subtle)] p-3 md:grid-cols-5">
              <ProductInput label="Image URL" value={image.imageUrl} onChange={(value) => update('images', form.images.map((item, itemIndex) => itemIndex === index ? { ...item, imageUrl: value } : item))} />
              <ProductInput label="Storage key" value={image.storageKey ?? ''} onChange={(value) => update('images', form.images.map((item, itemIndex) => itemIndex === index ? { ...item, storageKey: value || null } : item))} />
              <ProductInput label="Alt text" value={image.altText ?? ''} onChange={(value) => update('images', form.images.map((item, itemIndex) => itemIndex === index ? { ...item, altText: value || null } : item))} />
              <ProductInput label="Sort order" type="number" min="0" value={String(image.sortOrder)} onChange={(value) => update('images', form.images.map((item, itemIndex) => itemIndex === index ? { ...item, sortOrder: Number(value) } : item))} />
              <div className="flex items-end gap-2"><label className="flex items-center gap-2 pb-3 text-xs text-[var(--text-secondary)]"><input type="checkbox" checked={image.primaryImage} onChange={(event) => update('images', form.images.map((item, itemIndex) => ({ ...item, primaryImage: itemIndex === index ? event.target.checked : event.target.checked ? false : item.primaryImage })))} /> Primary</label><Button type="button" variant="ghost" onClick={() => update('images', form.images.filter((_, itemIndex) => itemIndex !== index))}>Remove</Button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={saving || uploadingTryOnImage}>{uploadingTryOnImage ? 'Uploading image...' : saving ? 'Saving...' : product ? 'Save changes' : 'Create product'}</Button>
      </div>
    </form>
  );
}

const inputClass = 'mt-2 w-full rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none';

function ProductInput({ label, value, onChange, type = 'text', min, max, step, required = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; min?: string; max?: string; step?: string; required?: boolean }) {
  return <label className="block text-sm text-[var(--text-secondary)]"><span>{label}</span><input className={inputClass} type={type} min={min} max={max} step={step} required={required} value={value} onChange={(event) => onChange(event.target.value)} /></label>;
}

function EditorHeading({ title, action }: { title: string; action: React.ReactNode }) {
  return <div className="mb-3 flex items-center justify-between"><h4 className="font-semibold text-[var(--text-primary)]">{title}</h4>{action}</div>;
}

function emptyVariant() {
  return { sku: '', color: null, size: null, lensType: null, additionalPrice: 0, quantity: 0, reservedQuantity: 0, status: 'ACTIVE' };
}

function emptyImage(sortOrder: number) {
  return { imageUrl: '', storageKey: null, altText: null, sortOrder, primaryImage: sortOrder === 0 };
}

function productRequest(product: AdminProduct | null): AdminProductRequest {
  if (!product) {
    return { sku: '', name: '', slug: '', brand: '', description: '', material: null, gender: null, frameShape: null, frameType: null, basePrice: 0, compareAtPrice: null, badge: null, tryOnImageUrl: null, status: 'DRAFT', categoryIds: [], variants: [emptyVariant()], images: [emptyImage(0)] };
  }
  return {
    sku: product.sku,
    name: product.name,
    slug: product.slug,
    brand: product.brand,
    description: product.description,
    material: product.material,
    gender: product.gender,
    frameShape: product.frameShape,
    frameType: product.frameType,
    basePrice: product.basePrice,
    compareAtPrice: product.compareAtPrice,
    badge: product.badge,
    tryOnImageUrl: product.tryOnImageUrl,
    status: product.status,
    categoryIds: product.categories.map((category) => category.id),
    variants: product.variants.map(({ id, sku, color, size, lensType, additionalPrice, quantity, reservedQuantity, status }) => ({ id, sku, color, size, lensType, additionalPrice, quantity, reservedQuantity: reservedQuantity ?? 0, status })),
    images: product.images.map(({ imageUrl, storageKey, altText, sortOrder, primaryImage }) => ({ imageUrl, storageKey, altText, sortOrder, primaryImage })),
  };
}

export function StoresPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Stores" title="Dream Spex store locations" description="Browse storefront locations and their current operating status." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {franchises.map((franchise) => (
          <div key={franchise.id} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">{franchise.city}</p>
            <h3 className="mt-3 text-xl font-semibold text-[var,--text-primary)]">{franchise.name}</h3>
            <p className="mt-2 text-sm text-[var,--text-secondary)]">{franchise.address}</p>
            <div className="mt-4 flex items-center justify-between">
              <span className="text-sm text-[var(--text-primary)]">{franchise.phone}</span>
              <StatusBadge status={franchise.status} />
            </div>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function AddFranchiseProductPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Add Product" title="Create a new franchise product" description="Publish a product listing for this storefront so customers can browse it online and in-store." />
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-6 md:grid-cols-2">
         
          <label className="text-sm text-[var(--text-secondary)]">
            <span>Product Name</span>
            <input className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Dream Spex Luxe Pro" />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            <span>Brand</span>
            <input className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Dream Spex" />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            <span>Category</span>
            <input className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="Premium Sunglasses" />
          </label>
          <label className="text-sm text-[var(--text-secondary)]">
            <span>Price</span>
            <input className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" placeholder="₹4,999" />
          </label>
        </div>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button>Save Product</Button>
          <Link to="/franchise/products"><Button variant="ghost">Back to Products</Button></Link>
        </div>
      </div>
    </DashboardShell>
  );
}

export function FranchiseDashboardPage() {
  const { user } = useAuth();
  const [dashboard, setDashboard] = useState<FranchiseDashboard | null>(null);
  const [franchise, setFranchise] = useState<Franchise | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.accessToken) return;
    void Promise.all([franchiseService.dashboard(user.accessToken), franchiseService.me(user.accessToken)])
      .then(([stats, profile]) => { setDashboard(stats); setFranchise(profile); })
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load franchise dashboard.'));
  }, [user?.accessToken]);
  return (
    <DashboardShell heading="FRANCHISE ADMIN" subheading="Store Operations" locationLabel={franchise?.name ?? 'Franchise'}>
      <SectionTitle
        eyebrow="Overview"
        title="Franchise performance"
        description={`Live operating and inventory summary${franchise ? ` for ${franchise.name}` : ''}.`}
      />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[{
          label: 'Sales',
          value: formatCurrency(dashboard?.sales ?? 0),
          helper: 'Verified paid orders',
          icon: CircleDollarSign,
        },
        {
          label: 'Orders',
          value: String(dashboard?.totalOrders ?? 0),
          helper: `${dashboard?.pendingOrders ?? 0} pending`,
          icon: ShoppingCart,
        },
        {
          label: 'Assigned products',
          value: String(dashboard?.assignedProducts ?? 0),
          helper: `${dashboard?.availableUnits ?? 0} units available`,
          icon: PackageOpen,
        },
        {
          label: 'Stock alerts',
          value: String((dashboard?.lowStockProducts ?? 0) + (dashboard?.outOfStockProducts ?? 0)),
          helper: `${dashboard?.lowStockProducts ?? 0} low · ${dashboard?.outOfStockProducts ?? 0} out`,
          icon: Warehouse,
        }].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <div className="flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{item.label}</p>
              <item.icon className="h-4 w-4 text-[var,--brand-green]" />
            </div>
            <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">{item.helper}</p>
          </div>
        ))}
      </div>
      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          ['Processing', dashboard?.processingOrders ?? 0],
          ['Delivered', dashboard?.deliveredOrders ?? 0],
          ['Ready for pickup', dashboard?.readyForPickupOrders ?? 0],
          ['Picked up', dashboard?.pickedUpOrders ?? 0],
          ['Refund requests', dashboard?.refundRequests ?? 0],
          ['Completed refunds', formatCurrency(dashboard?.completedRefunds ?? 0)],
        ].map(([label, value]) => (
          <div key={String(label)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
            <p className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function FranchiseOrderDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [order, setOrder] = useState<FranchiseOrder | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    if (!user?.accessToken || !id) return;
    try { setOrder(await franchiseService.order(user.accessToken, id)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load order.'); }
  }, [id, user?.accessToken]);
  useEffect(() => { void load(); }, [load]);
  const moveOrder = async (status: string) => {
    if (!user?.accessToken || !order) return;
    if (status === 'PICKED_UP'
      && !window.confirm(`Confirm that the customer has collected order ${order.orderNumber}?`)) return;
    setSaving(true);
    setError('');
    setNotice('');
    try {
      await franchiseService.updateOrderStatus(user.accessToken, order.id, status);
      setNotice(`Order updated to ${status.toLowerCase()}.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update order.');
    } finally {
      setSaving(false);
    }
  };

  if (!order) return <DashboardShell><p role={error ? 'alert' : 'status'} className="py-10 text-center text-sm text-[var(--text-secondary)]">{error || 'Loading order...'}</p></DashboardShell>;
  return (
    <DashboardShell>
      <SectionTitle
        eyebrow="Order Detail"
        title={`Order ${order.orderNumber}`}
        description={`Review ${orderStatusLabel(order.status, order.fulfillmentType).toLowerCase()} status, payment details, and ${isPickupOrder(order.fulfillmentType) ? 'pickup progress' : 'delivery progress'} for this customer order.`}
      />
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Customer</p>
              <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">{order.customerName}</h2>
            </div>
            <StatusBadge status={orderStatusLabel(order.status, order.fulfillmentType)} />
          </div>
          <div className="mt-6 space-y-4 text-sm text-[var(--text-secondary)]">
            <p><span className="font-medium text-[var(--text-primary)]">Products:</span> {order.products.join(', ')}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Payment:</span> {order.paymentStatus}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Fulfillment:</span> {isPickupOrder(order.fulfillmentType) ? 'Store Pickup' : 'Home Delivery'}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Customer contact:</span> {order.customerEmail || order.customerPhone || '—'}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Order Date:</span> {formatDate(order.createdAt)}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Amount:</span> {formatCurrency(order.amount)}</p>
            {isPickupOrder(order.fulfillmentType) ? <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="font-semibold text-[var(--text-primary)]">Pickup store</p>
              <p className="mt-2">{order.fulfillmentStore?.name ?? 'Pickup store information unavailable'}</p>
              <p>{order.fulfillmentStore
                ? [order.fulfillmentStore.address, order.fulfillmentStore.city, order.fulfillmentStore.state,
                  order.fulfillmentStore.postalCode].filter(Boolean).join(', ')
                : 'Pickup address unavailable'}</p>
              {order.fulfillmentStore?.phone ? <p className="mt-1">Contact: <a className="underline" href={`tel:${order.fulfillmentStore.phone}`}>{order.fulfillmentStore.phone}</a></p> : null}
              <p className="mt-2">Pickup instructions: Bring the order confirmation and a valid photo ID. Store staff will confirm the handover.</p>
            </div> : null}
            {!isPickupOrder(order.fulfillmentType) ? <div className="border-t border-[var(--border-subtle)] pt-4">
              <p className="font-semibold text-[var(--text-primary)]">Delivery address</p>
              <p className="mt-2">{[order.shippingAddress?.recipientName, order.shippingAddress?.phone]
                .filter(Boolean).join(' · ') || 'Delivery contact unavailable'}</p>
              <p>{[order.shippingAddress?.line1, order.shippingAddress?.line2, order.shippingAddress?.city,
                order.shippingAddress?.state, order.shippingAddress?.postalCode, order.shippingAddress?.countryCode]
                .filter(Boolean).join(', ') || 'Delivery address unavailable'}</p>
            </div> : null}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--text-secondary)]">Actions</p>
          <div className="mt-6 space-y-3">
            {order.paymentStatus === 'PAID' && nextFranchiseOrderStatuses(order.status, order.fulfillmentType).map((nextStatus) => (
              <Button key={nextStatus} disabled={saving} onClick={() => void moveOrder(nextStatus)}>
                {nextStatus === 'PROCESSING' ? 'Start Processing'
                  : nextStatus === 'SHIPPED' ? 'Mark Shipped'
                    : nextStatus === 'READY_FOR_PICKUP' ? 'Mark Ready for Pickup'
                      : 'Mark Picked Up'}
              </Button>
            ))}
            <Link to="/franchise/orders"><Button variant="ghost">Back to Orders</Button></Link>
          </div>
          {error ? <p role="alert" className="mt-4 text-sm text-red-500">{error}</p> : null}
          {notice ? <p role="status" className="mt-4 text-sm text-emerald-600">{notice}</p> : null}
        </div>
      </div>
    </DashboardShell>
  );
}

export function FranchiseInventoryPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<FranchiseInventory[]>([]);
  const [error, setError] = useState('');
  const [savingId, setSavingId] = useState('');
  const [stockDraft, setStockDraft] = useState<Record<string, string>>({});
  const load = useCallback(async () => {
    if (!user?.accessToken) return;
    try { setItems(await franchiseService.inventory(user.accessToken)); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to load inventory.'); }
  }, [user?.accessToken]);
  useEffect(() => {
    void load();
  }, [load]);
  const saveStock = async (item: FranchiseInventory) => {
    if (!user?.accessToken) return;
    setSavingId(item.id);
    setError('');
    try {
      await franchiseService.adjustOwnInventory(user.accessToken, item.id,
        Number(stockDraft[item.id] ?? item.quantity), item.lowStockThreshold);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to update inventory.');
    } finally { setSavingId(''); }
  };
  return (
    <DashboardShell>
      <SectionTitle
        eyebrow="Inventory"
        title="Local inventory"
        description="Update stock quantities for products in the central catalog. Stock is isolated to your franchise."
      />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]"><tr>
              {['Product', 'SKU', 'Quantity', 'Reserved', 'Available', 'Threshold', 'Status', 'Update'].map((heading) => <th key={heading} className="px-4 py-4 font-medium whitespace-nowrap">{heading}</th>)}
            </tr></thead>
            <tbody>{items.map((item) => (
              <tr key={item.id} className="border-t border-[var(--border-subtle)]">
                <td className="px-4 py-4">{item.productName}</td><td className="px-4 py-4">{item.sku}</td>
                <td className="px-4 py-4">{item.quantity}</td><td className="px-4 py-4">{item.reservedQuantity}</td>
                <td className="px-4 py-4">{item.availableQuantity}</td><td className="px-4 py-4">{item.lowStockThreshold}</td>
                <td className="px-4 py-4"><StatusBadge status={item.stockState} /></td>
                <td className="px-4 py-4">
                  <div className="flex items-center gap-2">
                    <input aria-label={`Set stock for ${item.sku}`} type="number" min={item.reservedQuantity}
                      value={stockDraft[item.id] ?? item.quantity}
                      onChange={(event) => setStockDraft((draft) => ({ ...draft, [item.id]: event.target.value }))}
                      className="w-20 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-1" />
                    <Button type="button" variant="secondary" disabled={savingId === item.id}
                      onClick={() => void saveStock(item)}>{savingId === item.id ? 'Saving' : 'Save'}</Button>
                  </div>
                </td>
              </tr>
            ))}</tbody>
          </table>
          {!items.length && !error ? <p className="p-8 text-center text-sm text-[var(--text-secondary)]">Inventory will appear automatically when products are published centrally.</p> : null}
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function FranchiseProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<Franchise | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!user?.accessToken) return;
    void franchiseService.me(user.accessToken).then(setProfile)
      .catch((reason: unknown) => setError(reason instanceof Error ? reason.message : 'Unable to load franchise profile.'));
  }, [user?.accessToken]);
  return (
    <DashboardShell>
      <SectionTitle
        eyebrow="Store Profile"
        title={profile?.name ?? 'Franchise profile'}
        description="Manage your business profile, address, support settings, and operational metadata."
      />
      {error ? <p role="alert" className="mb-4 text-sm text-red-500">{error}</p> : null}
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {Object.entries({
            'Franchise Code': profile?.franchiseCode ?? '—',
            'Store Name': profile?.name ?? '—',
            Owner: profile?.ownerName ?? '—',
            Email: profile?.ownerEmail ?? '—',
            Phone: profile?.phone ?? '—',
            Address: profile ? `${profile.address}, ${profile.city}, ${profile.state} ${profile.postalCode}` : '—',
            Status: profile?.status ?? '—',
          }).map(([label, value]) => (
            <div key={label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
              <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p>
              <p className="mt-3 text-lg font-semibold text-[var(--text-primary)]">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </DashboardShell>
  );
}

export function ReportsPage({ scope = 'super-admin' }: { scope?: 'super-admin' | 'franchise-admin' }) {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const today = toReportDate(new Date());
  const initialStartDate = searchParams.get('startDate');
  const initialEndDate = searchParams.get('endDate');
  const [startDate, setStartDate] = useState(() => initialStartDate ?? reportRange('last30', today).start);
  const [endDate, setEndDate] = useState(() => initialEndDate ?? today);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [franchiseReport, setFranchiseReport] = useState<FranchiseReport | null>(null);
  const [franchiseReports, setFranchiseReports] = useState<FranchiseReport[]>([]);

  const load = useCallback(async () => {
    if (!user?.accessToken) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const fromDate = new Date(`${startDate}T00:00:00.000Z`);
      const toDate = new Date(`${endDate}T00:00:00.000Z`);
      toDate.setUTCDate(toDate.getUTCDate() + 1);
      if (scope === 'franchise-admin') {
        setFranchiseReport(await franchiseService.report(user.accessToken, fromDate.toISOString(), toDate.toISOString()));
        setFranchiseReports([]);
        setReport(null);
      } else {
        const [globalReport, franchiseData] = await Promise.all([
          adminService.reports(user.accessToken, startDate, endDate),
          franchiseService.adminReports(user.accessToken, fromDate.toISOString(), toDate.toISOString()),
        ]);
        setReport(globalReport);
        setFranchiseReports(franchiseData);
        setFranchiseReport(null);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load reports.');
      setReport(null);
      setFranchiseReport(null);
      setFranchiseReports([]);
    } finally {
      setLoading(false);
    }
  }, [endDate, scope, startDate, user?.accessToken]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const queryStart = searchParams.get('startDate');
    const queryEnd = searchParams.get('endDate');
    if (queryStart && queryEnd) {
      setStartDate(queryStart);
      setEndDate(queryEnd);
    }
  }, [searchParams]);

  const changeDateRange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    const next = new URLSearchParams(searchParams);
    if (start) next.set('startDate', start);
    else next.delete('startDate');
    if (end) next.set('endDate', end);
    else next.delete('endDate');
    setSearchParams(next, { replace: true });
  };

  const reportDocument = (): AdminReportDocument | null => {
    if (!report) return null;
    return {
      title: 'Global admin report',
      startDate: report.startDate,
      endDate: report.endDate,
      columns: [{ label: 'Section' }, { label: 'Metric' }, { label: 'Value' }],
      rows: [
        ['Sales', 'Paid revenue', report.revenue.paidRevenue],
        ['Sales', 'Refund deductions', report.revenue.refundDeductions],
        ['Sales', 'Net revenue', report.revenue.netRevenue],
          ['Sales', 'Discounts', report.revenue.discounts],
          ['Sales', 'GST collected', report.revenue.gstCollected],
        ['Orders', 'Total orders', report.orders.total],
        ['Orders', 'Paid orders', report.orders.paid],
        ['Orders', 'Pending orders', report.orders.pending],
        ['Orders', 'Cancelled orders', report.orders.cancelled],
        ['Orders', 'Delivered orders', report.orders.delivered],
        ['Customers', 'Registered customers', report.customers.totalRegistered],
        ['Customers', 'New customers', report.customers.newCustomers],
        ['Customers', 'Repeat customers', report.customers.repeatCustomers],
        ['Returns', 'Return requests', report.returns.total],
        ['Returns', 'Approved returns', report.returns.approved],
        ['Returns', 'Rejected returns', report.returns.rejected],
        ['Returns', 'Pending returns', report.returns.pending],
        ['Returns', 'Processed refunds', report.returns.processedRefunds],
        ['Returns', 'Refunded amount', report.returns.refundedAmount],
        ['Returns', 'Pending refund amount', report.returns.pendingRefundAmount],
        ['Memberships', 'Active memberships', report.memberships.active],
        ['Memberships', 'Expired memberships', report.memberships.expired],
        ['Memberships', 'Membership revenue', report.memberships.revenue],
        ...report.products.bestSelling.map((item) => ['Best-selling products', item.name, `${item.quantity} units · ${formatCurrency(item.revenue)}`]),
        ...report.revenue.trend.map((item) => ['Revenue trend', item.date, item.value]),
        ...report.orders.trend.map((item) => ['Order trend', item.date, item.count]),
        ...report.customers.trend.map((item) => ['Customer trend', item.date, item.count]),
        ...franchiseReports.flatMap((item) => [
          ['Franchise', item.franchiseName, ''],
          ['Franchise orders', item.franchiseName, item.orderCount],
          ['Franchise paid orders', item.franchiseName, item.paidOrders],
          ['Franchise revenue', item.franchiseName, item.revenue],
          ['Franchise refund requests', item.franchiseName, item.refundRequests],
          ['Franchise completed refunds', item.franchiseName, item.completedRefunds],
          ['Franchise refunded amount', item.franchiseName, item.refunds],
        ]),
      ],
      summary: [
        { label: 'Paid revenue', value: formatCurrency(report.revenue.paidRevenue) },
        { label: 'Net revenue', value: formatCurrency(report.revenue.netRevenue) },
        { label: 'Discounts', value: formatCurrency(report.revenue.discounts) },
        { label: 'GST collected', value: formatCurrency(report.revenue.gstCollected) },
        { label: 'Orders', value: report.orders.total },
        { label: 'Customers', value: report.customers.totalRegistered },
        { label: 'Refunded amount', value: formatCurrency(report.returns.refundedAmount) },
        { label: 'Pending refund amount', value: formatCurrency(report.returns.pendingRefundAmount) },
        { label: 'Active memberships', value: report.memberships.active },
        { label: 'Expired memberships', value: report.memberships.expired },
        { label: 'Membership revenue', value: formatCurrency(report.memberships.revenue) },
        ...report.memberships.planCounts.map((plan) => ({ label: `${plan.planName} memberships`, value: plan.count })),
        { label: 'Franchises reporting', value: franchiseReports.length },
      ],
    };
  };

  if (scope === 'franchise-admin') {
    const franchiseDocument: AdminReportDocument | null = franchiseReport ? {
      title: `${franchiseReport.franchiseName} franchise report`,
      startDate,
      endDate,
      columns: [{ label: 'Metric' }, { label: 'Value' }],
      rows: [
        ['Franchise', franchiseReport.franchiseName],
        ['Orders', franchiseReport.orderCount],
        ['Paid revenue', franchiseReport.revenue],
        ['Refunds', franchiseReport.refunds],
        ['Paid orders', franchiseReport.paidOrders],
        ['Pending orders', franchiseReport.pendingOrders],
        ['Cancelled orders', franchiseReport.cancelledOrders],
        ['Delivered orders', franchiseReport.deliveredOrders],
        ['Refund requests', franchiseReport.refundRequests],
        ['Completed refunds', franchiseReport.completedRefunds],
      ],
      summary: [
        { label: 'Orders', value: franchiseReport.orderCount },
        { label: 'Paid revenue', value: formatCurrency(franchiseReport.revenue) },
        { label: 'Refunds', value: formatCurrency(franchiseReport.refunds) },
        { label: 'Refund requests', value: franchiseReport.refundRequests },
        { label: 'Completed refunds', value: franchiseReport.completedRefunds },
      ],
    } : null;
    return (
      <DashboardShell>
        <SectionTitle eyebrow="Reports" title="Franchise reports" description="Live order and revenue data scoped to your franchise." />
        <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
          <div className="flex flex-wrap items-end gap-3">
            <AdminDateRangeFilter startDate={startDate} endDate={endDate} onApply={changeDateRange} />
            <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="secondary" onClick={() => { if (franchiseDocument) downloadReportExcel(franchiseDocument); }} disabled={!franchiseDocument || loading}><Download className="mr-2 h-4 w-4" />Excel</Button>
            <Button type="button" variant="secondary" onClick={() => { if (franchiseDocument) void downloadReportPdf(franchiseDocument); }} disabled={!franchiseDocument || loading}>PDF</Button>
            <Button type="button" variant="secondary" onClick={() => { if (franchiseDocument) printReport(franchiseDocument); }} disabled={!franchiseDocument || loading}><Printer className="mr-2 h-4 w-4" />Print</Button>
          </div>
        </div>
        {loading ? <p role="status" className="mt-5 text-sm text-[var(--text-secondary)]">Loading report data...</p> : null}
        {error ? <p role="alert" className="mt-5 text-sm text-red-500">{error}</p> : null}
        {franchiseReport ? <div className="mt-5 grid gap-4 md:grid-cols-3">
          {[['Orders', franchiseReport.orderCount], ['Paid revenue', formatCurrency(franchiseReport.revenue)], ['Refunds', formatCurrency(franchiseReport.refunds)]].map(([label, value]) => (
            <article key={String(label)} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5"><p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{label}</p><p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{value}</p></article>
          ))}
        </div> : null}
      </DashboardShell>
    );
  }

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Reports" title="Network reports" description="Live revenue, order, customer, product, inventory, and returns analytics from Dream Spex records." />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
        <div className="flex flex-wrap items-end gap-3">
          <AdminDateRangeFilter startDate={startDate} endDate={endDate} onApply={changeDateRange} />
          <Button type="button" variant="secondary" onClick={() => void load()} disabled={loading}><RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />Refresh</Button>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="secondary" onClick={() => { const document = reportDocument(); if (document) downloadReportExcel(document); }} disabled={!report || loading}><Download className="mr-2 h-4 w-4" />Excel</Button>
          <Button type="button" variant="secondary" onClick={() => { const document = reportDocument(); if (document) void downloadReportPdf(document); }} disabled={!report || loading}>PDF</Button>
          <Button type="button" variant="secondary" onClick={() => { const document = reportDocument(); if (document) printReport(document); }} disabled={!report || loading}><Printer className="mr-2 h-4 w-4" />Print</Button>
        </div>
      </div>
      {loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]" role="status">Loading report data…</p> : error ? <div className="mt-6 rounded-xl border border-red-300/40 bg-red-50 p-4 text-sm text-red-800" role="alert">{error}<Button type="button" variant="secondary" className="ml-3" onClick={() => void load()}>Retry</Button></div> : null}
      {!loading && !error && report ? <>
        <p className="mt-5 text-xs text-[var(--text-secondary)]">Reporting period: {report.startDate} – {report.endDate}</p>
        <section className="mt-6 overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
          <div className="border-b border-[var(--border-subtle)] px-5 py-4">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Franchise comparison</h2>
            <p className="mt-1 text-sm text-[var(--text-secondary)]">Orders, recognized sales and processed refunds for the selected period.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-sm">
              <thead className="bg-[var(--bg-primary)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>{['Franchise', 'Orders', 'Paid', 'Pending', 'Delivered', 'Cancelled', 'Refund requests', 'Refunded', 'Sales', 'Refund amount'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr>
              </thead>
              <tbody>
                {franchiseReports.map((item) => <tr key={item.franchiseId} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-3 font-medium text-[var(--text-primary)]">{item.franchiseName}</td>
                  <td className="px-4 py-3">{item.orderCount}</td>
                  <td className="px-4 py-3">{item.paidOrders}</td>
                  <td className="px-4 py-3">{item.pendingOrders}</td>
                  <td className="px-4 py-3">{item.deliveredOrders}</td>
                  <td className="px-4 py-3">{item.cancelledOrders}</td>
                  <td className="px-4 py-3">{item.refundRequests}</td>
                  <td className="px-4 py-3">{item.completedRefunds}</td>
                  <td className="px-4 py-3">{formatCurrency(item.revenue)}</td>
                  <td className="px-4 py-3">{formatCurrency(item.refunds)}</td>
                </tr>)}
                {!franchiseReports.length ? <tr><td colSpan={10} className="px-4 py-8 text-center text-[var(--text-secondary)]">No franchise data for this period.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
        <section className="mt-3" aria-labelledby="report-revenue-heading">
          <h2 id="report-revenue-heading" className="mb-3 text-lg font-semibold">Revenue</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Paid revenue', report.revenue.paidRevenue, rangeLink('/admin/orders?paymentStatus=PAID', report.startDate, report.endDate)],
              ['Refund deductions', report.revenue.refundDeductions, rangeLink('/admin/returns?status=REFUNDED', report.startDate, report.endDate)],
              ['Net revenue', report.revenue.netRevenue, rangeLink('/admin/orders?paymentStatus=PAID', report.startDate, report.endDate)],
              ['Discounts', report.revenue.discounts, rangeLink('/admin/orders?paymentStatus=PAID', report.startDate, report.endDate)],
              ['GST collected', report.revenue.gstCollected, rangeLink('/admin/orders?paymentStatus=PAID', report.startDate, report.endDate)],
              ['Today', report.revenue.today, reportDateLink('today', today)],
              ['Last 7 days', report.revenue.last7Days, reportDateLink('last7', today)],
              ['Last 30 days', report.revenue.last30Days, reportDateLink('last30', today)],
              ['This month', report.revenue.thisMonth, reportDateLink('month', today)],
              ['This year', report.revenue.thisYear, reportDateLink('year', today)],
            ].map(([label, amount, to]) => <ReportMetric key={String(label)} label={String(label)} value={formatCurrency(Number(amount))} to={String(to)} />)}
          </div>
          <ReportChart title="Revenue trend" points={report.revenue.trend} valueLabel="Paid revenue" formatValue={(value) => formatCurrency(value)} />
        </section>
        <section className="mt-7" aria-labelledby="report-orders-heading">
          <h2 id="report-orders-heading" className="mb-3 text-lg font-semibold">Orders</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            {[
              ['Total orders', report.orders.total, rangeLink('/admin/orders', report.startDate, report.endDate)], ['Paid orders', report.orders.paid, rangeLink('/admin/orders?paymentStatus=PAID', report.startDate, report.endDate)], ['Pending orders', report.orders.pending, rangeLink('/admin/orders?status=PENDING_PAYMENT', report.startDate, report.endDate)],
              ['Cancelled orders', report.orders.cancelled, rangeLink('/admin/orders?status=CANCELLED', report.startDate, report.endDate)], ['Delivered orders', report.orders.delivered, rangeLink('/admin/orders?status=DELIVERED', report.startDate, report.endDate)],
              ['Average order value', formatCurrency(report.orders.averageOrderValue), rangeLink('/admin/orders', report.startDate, report.endDate)],
            ].map(([label, value, to]) => <ReportMetric key={String(label)} label={String(label)} value={String(value)} to={String(to)} />)}
          </div>
          <ReportChart title="Order trend" points={report.orders.trend} valueLabel="Orders" formatValue={(value) => value.toLocaleString('en-IN')} />
        </section>
        <section className="mt-7" aria-labelledby="report-customers-heading">
          <h2 id="report-customers-heading" className="mb-3 text-lg font-semibold">Customers</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            <ReportMetric label="Registered customers" value={report.customers.totalRegistered.toLocaleString('en-IN')} to={rangeLink('/admin/customers', report.startDate, report.endDate)} />
            <ReportMetric label="New customers" value={report.customers.newCustomers.toLocaleString('en-IN')} to={rangeLink('/admin/customers', report.startDate, report.endDate)} />
            <ReportMetric label="Repeat customers" value={report.customers.repeatCustomers.toLocaleString('en-IN')} to={rangeLink('/admin/customers', report.startDate, report.endDate)} />
          </div>
          <ReportChart title="New customer trend" points={report.customers.trend} valueLabel="Customers" formatValue={(value) => value.toLocaleString('en-IN')} />
        </section>
        <section className="mt-7" aria-labelledby="report-membership-heading">
          <h2 id="report-membership-heading" className="mb-3 text-lg font-semibold">Memberships</h2>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <ReportMetric label="Active memberships" value={report.memberships.active.toLocaleString('en-IN')} to={rangeLink('/admin/membership?status=ACTIVE', report.startDate, report.endDate)} />
            <ReportMetric label="Expired memberships" value={report.memberships.expired.toLocaleString('en-IN')} to={rangeLink('/admin/membership?status=EXPIRED', report.startDate, report.endDate)} />
            <ReportMetric label="Membership revenue" value={formatCurrency(report.memberships.revenue)} to={rangeLink('/admin/membership', report.startDate, report.endDate)} />
            {report.memberships.planCounts.map((plan) => <ReportMetric key={plan.planName} label={`${plan.planName} memberships`} value={plan.count.toLocaleString('en-IN')} to={rangeLink('/admin/membership', report.startDate, report.endDate)} />)}
          </div>
        </section>
        <section className="mt-7 grid gap-5 xl:grid-cols-2" aria-labelledby="report-products-heading">
          <div>
            <h2 id="report-products-heading" className="mb-3 text-lg font-semibold">Best-selling products</h2>
            <ReportTable headers={['Product', 'Quantity sold', 'Revenue']} rows={report.products.bestSelling.map((item) => [item.name, item.quantity.toLocaleString('en-IN'), formatCurrency(item.revenue)])} rowLink={(row) => `/admin/products?q=${encodeURIComponent(row[0])}`} empty="No paid product sales for this period." />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Category-wise sales</h2>
            <ReportTable headers={['Category', 'Quantity sold', 'Revenue']} rows={report.products.categorySales.map((item) => [item.name, item.quantity.toLocaleString('en-IN'), formatCurrency(item.revenue)])} rowLink={(row) => `/admin/products?q=${encodeURIComponent(row[0])}`} empty="No category sales for this period." />
          </div>
        </section>
        <section className="mt-7 grid gap-5 xl:grid-cols-2">
          <div>
            <h2 className="mb-3 text-lg font-semibold">Low-stock products</h2>
            <ReportTable headers={['Product', 'SKU', 'Low-stock variants', 'Available']} rows={report.products.lowStock.map((item) => [item.name, item.sku, item.lowStockVariants.toLocaleString('en-IN'), item.availableUnits.toLocaleString('en-IN')])} rowLink={(row) => `/admin/inventory?filter=low-stock&q=${encodeURIComponent(row[1])}`} empty="No low-stock products." />
          </div>
          <div>
            <h2 className="mb-3 text-lg font-semibold">Returns & refunds</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <ReportMetric label="Return requests" value={report.returns.total.toLocaleString('en-IN')} to="/admin/returns" />
              <ReportMetric label="Approved returns" value={report.returns.approved.toLocaleString('en-IN')} to="/admin/returns?status=APPROVED" />
              <ReportMetric label="Rejected returns" value={report.returns.rejected.toLocaleString('en-IN')} to={rangeLink('/admin/returns?status=REJECTED', report.startDate, report.endDate)} />
              <ReportMetric label="Pending returns" value={report.returns.pending.toLocaleString('en-IN')} to={rangeLink('/admin/returns?status=REQUESTED', report.startDate, report.endDate)} />
              <ReportMetric label="Processed refunds" value={report.returns.processedRefunds.toLocaleString('en-IN')} to={rangeLink('/admin/returns?status=REFUNDED', report.startDate, report.endDate)} />
              <ReportMetric label="Refunded amount" value={formatCurrency(report.returns.refundedAmount)} to={rangeLink('/admin/returns?status=REFUNDED', report.startDate, report.endDate)} />
              <ReportMetric label="Pending refund amount" value={formatCurrency(report.returns.pendingRefundAmount)} to={rangeLink('/admin/returns', report.startDate, report.endDate)} />
            </div>
          </div>
        </section>
      </> : null}
    </DashboardShell>
  );
}

function toReportDate(date: Date) {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(date);
}

function reportRange(period: string, today: string) {
  const date = new Date(`${today}T00:00:00+05:30`);
  if (period === 'today') return { start: today, end: today };
  if (period === 'yesterday') {
    date.setUTCDate(date.getUTCDate() - 1);
    const yesterday = toReportDate(date);
    return { start: yesterday, end: yesterday };
  }
  if (period === 'month') return { start: `${today.slice(0, 7)}-01`, end: today };
  if (period === 'lastMonth') {
    date.setUTCDate(1);
    date.setUTCDate(date.getUTCDate() - 1);
    const end = toReportDate(date);
    return { start: `${end.slice(0, 7)}-01`, end };
  }
  if (period === 'year') return { start: `${today.slice(0, 4)}-01-01`, end: today };
  const days = period === 'last7' ? 6 : 29;
  date.setUTCDate(date.getUTCDate() - days);
  return { start: toReportDate(date), end: today };
}

function reportDateLink(period: string, today: string) {
  const { start, end } = reportRange(period, today);
  return `/admin/reports?startDate=${start}&endDate=${end}&period=${period}`;
}

function rangeLink(path: string, startDate: string, endDate: string) {
  const url = new URL(path, window.location.origin);
  const isReturns = url.pathname === '/admin/returns';
  url.searchParams.set(isReturns ? 'from' : 'startDate', startDate);
  url.searchParams.set(isReturns ? 'to' : 'endDate', endDate);
  return `${url.pathname}${url.search}`;
}

function ReportMetric({ label, value, to }: { label: string; value: string; to: string }) {
  return <Link to={to} className="group block rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-[var(--brand-green)]/50 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--brand-green)]">
    <p className="text-xs font-medium text-[var(--text-secondary)]">{label}</p><p className="mt-2 text-xl font-semibold tracking-tight text-[var(--text-primary)]">{value}</p><span className="mt-1 block text-[10px] font-medium text-[var(--brand-green-dark)] opacity-0 transition group-hover:opacity-100 group-focus-visible:opacity-100">View details →</span>
  </Link>;
}

function ReportChart({ title, points, valueLabel, formatValue }: { title: string; points: AdminReport['revenue']['trend']; valueLabel: string; formatValue: (value: number) => string }) {
  const groupedPoints = useMemo(() => {
    if (points.length <= 31) return points.map((point) => ({ ...point, endDate: point.date }));
    const grouping: 'week' | 'month' = points.length > 100 ? 'month' : 'week';
    const groups = new Map<string, { date: string; value: number; count: number }>();
    points.forEach((point) => {
      const date = new Date(`${point.date}T00:00:00+05:30`);
      if (grouping === 'week') date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7));
      else date.setUTCDate(1);
      const key = toReportDate(date);
      const current = groups.get(key) ?? { date: key, value: 0, count: 0 };
      current.value += point.value;
      current.count += point.count;
      groups.set(key, current);
    });
    return [...groups.values()].map((point) => {
      const endDate = new Date(`${point.date}T00:00:00+05:30`);
      if (grouping === 'week') endDate.setUTCDate(endDate.getUTCDate() + 6);
      else {
        endDate.setUTCMonth(endDate.getUTCMonth() + 1);
        endDate.setUTCDate(0);
      }
      return { ...point, endDate: toReportDate(endDate) };
    });
  }, [points]);
  const maximum = Math.max(1, ...groupedPoints.map((point) => point.value));
  return <section className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5" aria-label={`${title}: ${valueLabel}`}>
    <h3 className="font-semibold">{title}</h3>
    {groupedPoints.length ? <div className="mt-5 flex h-52 items-end gap-1 overflow-x-auto border-b border-[var(--border-subtle)] px-1 sm:gap-2">
      {groupedPoints.map((point) => <Link key={point.date} to={`/admin/reports?startDate=${point.date}&endDate=${point.endDate}`} className="group flex h-full min-w-5 flex-1 flex-col items-center justify-end gap-2 rounded-t sm:min-w-8 focus-visible:outline-2 focus-visible:outline-[var(--brand-green)]" aria-label={`Open ${title} report for ${point.date} to ${point.endDate}`} title={`${point.date}: ${formatValue(point.value)}`}>
        <span className="hidden text-[10px] text-[var(--text-secondary)] group-hover:block">{formatValue(point.value)}</span>
        <div className="w-full max-w-12 rounded-t bg-[#6b946d] transition-colors group-hover:bg-[var(--brand-green-dark)]" style={{ height: `${point.value > 0 ? Math.max(3, (point.value / maximum) * 145) : 2}px` }} />
        <span className="max-w-full truncate text-[9px] text-[var(--text-secondary)]">{point.date.slice(5)}</span>
      </Link>)}
    </div> : <p className="mt-4 rounded-lg bg-[var(--bg-primary)] p-5 text-sm text-[var(--text-secondary)]">No {valueLabel.toLowerCase()} data for this period.</p>}
  </section>;
}

function ReportTable({ headers, rows, empty, rowLink }: { headers: string[]; rows: string[][]; empty: string; rowLink?: (row: string[]) => string }) {
  return <div className="overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)]">
    {rows.length ? <div className="overflow-x-auto"><table className="w-full min-w-[420px] text-left text-sm"><thead className="bg-[var(--bg-primary)] text-xs text-[var(--text-secondary)]"><tr>{headers.map((header) => <th key={header} className="px-4 py-3 font-medium">{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={`${row[0]}-${index}`} className="border-t border-[var(--border-subtle)] hover:bg-[var(--bg-secondary)]">{row.map((cell, cellIndex) => <td key={`${cellIndex}-${cell}`} className="px-4 py-3 text-[var(--text-primary)]">{rowLink && cellIndex === 0 ? <Link to={rowLink(row)} className="block rounded-sm font-medium underline-offset-2 hover:underline focus-visible:outline-2 focus-visible:outline-[var(--brand-green)]">{cell}</Link> : cell}</td>)}</tr>)}</tbody></table></div> : <p className="p-5 text-sm text-[var(--text-secondary)]">{empty}</p>}
  </div>;
}

type StoreDeliveryForm = AdminStoreRequest;

function emptyStoreDeliveryForm(): StoreDeliveryForm {
  return {
    name: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    postalCode: '',
    latitude: null,
    longitude: null,
    deliveryRadiusKm: null,
    status: 'ACTIVE',
  };
}

function storeDeliveryForm(store: AdminStore): StoreDeliveryForm {
  return {
    name: store.name,
    phone: store.phone ?? '',
    address: store.address,
    city: store.city,
    state: store.state,
    postalCode: store.postalCode,
    latitude: store.latitude,
    longitude: store.longitude,
    deliveryRadiusKm: store.deliveryRadiusKm,
    status: store.status,
  };
}

function StoreDeliverySettingsPanel({ accessToken }: { accessToken: string }) {
  const [stores, setStores] = useState<AdminStore[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [form, setForm] = useState<StoreDeliveryForm>(emptyStoreDeliveryForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const field = 'mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)]';

  const loadStores = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const loaded = await adminService.stores(accessToken);
      setStores(loaded);
      const current = loaded[0];
      if (current) {
        setSelectedId(current.id);
        setForm(storeDeliveryForm(current));
      } else {
        setSelectedId('');
        setForm(emptyStoreDeliveryForm());
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load store delivery settings.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void loadStores(); }, [loadStores]);

  const setField = <K extends keyof StoreDeliveryForm>(key: K, value: StoreDeliveryForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setMessage('');
  };

  const coordinates: Coordinates | null = form.latitude !== null && form.longitude !== null
    ? { latitude: form.latitude, longitude: form.longitude }
    : null;
  const radiusPresets = ['50', '100', '200', '300'];
  const radiusPreset = form.deliveryRadiusKm !== null && radiusPresets.includes(String(form.deliveryRadiusKm))
    ? String(form.deliveryRadiusKm)
    : 'custom';

  const saveStore = async () => {
    setError('');
    setMessage('');
    if ([form.name, form.address, form.city, form.state, form.postalCode].some((value) => !value.trim())) {
      setError('Enter the store name and complete address.');
      return;
    }
    if (!coordinates || !isValidCoordinates(coordinates.latitude, coordinates.longitude)) {
      setError('Select a valid store location on the map or use the current location.');
      return;
    }
    if (form.deliveryRadiusKm === null || !Number.isFinite(form.deliveryRadiusKm)
      || form.deliveryRadiusKm <= 0 || form.deliveryRadiusKm > 10000) {
      setError('Enter a delivery radius greater than 0 and no more than 10000 km.');
      return;
    }
    setSaving(true);
    try {
      const saved = selectedId
        ? await adminService.updateStore(accessToken, selectedId, form)
        : await adminService.createStore(accessToken, form);
      setStores((current) => current.some((item) => item.id === saved.id)
        ? current.map((item) => item.id === saved.id ? saved : item)
        : [...current, saved]);
      setSelectedId(saved.id);
      setForm(storeDeliveryForm(saved));
      setMessage('Store delivery settings saved.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save store delivery settings.');
    } finally {
      setSaving(false);
    }
  };

  return <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 lg:col-span-2">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">Store Delivery Settings</h2>
        <p className="mt-2 text-sm text-[var(--text-secondary)]">Active store locations are checked independently. Distance is straight-line, not road distance.</p>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="ghost" onClick={() => void loadStores()} disabled={loading}>Reload stores</Button>
        <Button type="button" variant="ghost" onClick={() => {
          setSelectedId('');
          setForm(emptyStoreDeliveryForm());
          setError('');
          setMessage('');
        }}>Add store</Button>
      </div>
    </div>
    {loading ? <p className="mt-4 text-sm text-[var(--text-secondary)]" role="status">Loading stores…</p> : null}
    {stores.length > 0 ? <label className="mt-5 block max-w-xl text-sm text-[var(--text-secondary)]">
      Edit store
      <select value={selectedId} onChange={(event) => {
        const selected = stores.find((store) => store.id === event.target.value);
        if (selected) {
          setSelectedId(selected.id);
          setForm(storeDeliveryForm(selected));
          setError('');
          setMessage('');
        }
      }} className={field}>
        {stores.map((store) => <option key={store.id} value={store.id}>{store.name} · {store.status}</option>)}
      </select>
    </label> : null}
    {error ? <p className="mt-4 text-sm text-rose-300" role="alert">{error}</p> : null}
    {message ? <p className="mt-4 text-sm text-emerald-300" role="status">{message}</p> : null}
    {!loading ? <div className="mt-5 grid gap-5 lg:grid-cols-2">
      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm text-[var(--text-secondary)]">Store name<input className={field} value={form.name} onChange={(event) => setField('name', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)]">Phone (optional)<input className={field} value={form.phone ?? ''} onChange={(event) => setField('phone', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Street / building address<input className={field} value={form.address} onChange={(event) => setField('address', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)]">City<input className={field} value={form.city} onChange={(event) => setField('city', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)]">State<input className={field} value={form.state} onChange={(event) => setField('state', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)]">PIN / postal code<input className={field} value={form.postalCode} onChange={(event) => setField('postalCode', event.target.value)} /></label>
          <label className="text-sm text-[var(--text-secondary)]">Status<select className={field} value={form.status} onChange={(event) => setField('status', event.target.value)}>{!['ACTIVE', 'INACTIVE'].includes(form.status) ? <option value={form.status}>{form.status}</option> : null}<option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option></select></label>
          <label className="text-sm text-[var(--text-secondary)] sm:col-span-2">Maximum delivery radius
            <select className={field} value={radiusPreset} onChange={(event) => setField('deliveryRadiusKm', event.target.value === 'custom' ? null : Number(event.target.value))}>
              <option value="50">50 km</option><option value="100">100 km</option><option value="200">200 km</option><option value="300">300 km</option><option value="custom">Custom radius</option>
            </select>
            {radiusPreset === 'custom' ? <input type="number" min="0.01" max="10000" step="0.01" aria-label="Custom delivery radius in kilometres" placeholder="Enter radius in kilometres" className={field} value={form.deliveryRadiusKm ?? ''} onChange={(event) => setField('deliveryRadiusKm', event.target.value === '' ? null : Number(event.target.value))} /> : null}
          </label>
        </div>
        <Button type="button" onClick={() => void saveStore()} disabled={saving || loading}>{saving ? 'Saving…' : selectedId ? 'Save store delivery settings' : 'Create store'}</Button>
      </div>
      <div className="space-y-3">
        <CustomerLocationPicker
          title="Store location"
          description="Use GPS or click/drag the pin to mark the store location."
          value={coordinates}
          onChange={(value) => {
            setForm((current) => ({ ...current, latitude: value.latitude, longitude: value.longitude }));
            setMessage('');
          }}
        />
        {coordinates ? <p className="text-xs text-[var(--text-secondary)]">Store pin: {coordinates.latitude.toFixed(6)}, {coordinates.longitude.toFixed(6)}</p> : null}
      </div>
    </div> : null}
  </section>;
}

export function SuperAdminSettingsPage() {
  const { user, refreshSession } = useAuth();
  const [form, setForm] = useState<AdminSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [smtpPassword, setSmtpPassword] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  const token = user?.accessToken ?? '';

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true); setError('');
    try { const result = await adminService.settings(token); setForm(result); }
    catch (reason) { if ((reason as { status?: number }).status === 401) { await refreshSession(); } setError(reason instanceof Error ? reason.message : 'Unable to load settings.'); }
    finally { setLoading(false); }
  }, [refreshSession, token]);
  useEffect(() => { void load(); }, [load]);

  if (loading) return <DashboardShell><SectionTitle eyebrow="Settings" title="System configuration" description="Manage secure Dream Spex operational settings." /><p className="mt-8 text-sm text-[var(--text-secondary)]">Loading settings...</p></DashboardShell>;
  if (!form) return <DashboardShell><SectionTitle eyebrow="Settings" title="System configuration" description="Manage secure Dream Spex operational settings." /><div className="mt-6 rounded-2xl border border-red-300/30 bg-red-400/10 p-5 text-sm text-red-200">{error || 'Settings are unavailable.'}<Button type="button" variant="ghost" className="mt-4" onClick={() => void load()}>Retry</Button></div></DashboardShell>;

  const update = (patch: Partial<AdminSettings>) => setForm((current) => current ? { ...current, ...patch } : current);
  const updateNotifications = (key: keyof AdminSettings['notifications']) => setForm((current) => current ? { ...current, notifications: { ...current.notifications, [key]: !current.notifications[key] } } : current);
  const save = async () => {
    setSaving(true); setMessage(''); setError('');
    try { const result = await adminService.saveSettings(token, form); setForm(result); setMessage('Settings saved successfully.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save settings.'); }
    finally { setSaving(false); }
  };
  const changePassword = async (event: React.FormEvent) => {
    event.preventDefault(); setMessage(''); setError('');
    try { await adminService.changeAdminPassword(token, currentPassword, newPassword); setCurrentPassword(''); setNewPassword(''); setMessage('Password changed. Existing sessions were revoked.'); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to change password.'); }
  };
  const test = async (integration: string) => {
    try { const result = await adminService.testIntegration(token, integration); setMessage(`${integration}: ${result.message} ${result.configured ? 'Configured.' : 'Not configured.'}`); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Connection test failed.'); }
  };
  const testSmtpConnection = async () => {
    try { const result = await adminService.testSmtpConnection(token); setMessage(result.message); } catch (reason) { setError(reason instanceof Error ? reason.message : 'SMTP connection test failed.'); }
  };
  const sendTestEmail = async () => {
    try { await adminService.sendTestEmail(token, testRecipient); setMessage('Test email sent.'); } catch (reason) { setError(reason instanceof Error ? reason.message : 'Test email could not be sent.'); }
  };
  const saveEmail = async () => {
    setSaving(true); setMessage(''); setError('');
    try {
      const result = await adminService.saveSettings(token, { ...form, email: { ...form.email, smtpPassword } });
      setForm(result); setSmtpPassword(''); setMessage('Email configuration saved.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save email configuration.'); }
    finally { setSaving(false); }
  };
  const field = 'mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm outline-none';
  return <DashboardShell>
    <SectionTitle eyebrow="Settings" title="System configuration" description="Manage secure Dream Spex operational settings." />
    <Link to="/admin/settings/gst" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 hover:border-[var(--brand-green)]"><span><span className="block font-semibold">Global GST settings</span><span className="mt-1 block text-sm text-[var(--text-secondary)]">Update the GST rate stored by the backend and view its change history.</span></span><ArrowRight className="h-5 w-5 shrink-0 text-[var(--brand-green-dark)]" /></Link>
    {message ? <p className="mt-5 rounded-2xl border border-emerald-300/30 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200">{message}</p> : null}
    {error ? <p className="mt-5 rounded-2xl border border-red-300/30 bg-red-400/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
    <div className="mt-6 grid gap-6 lg:grid-cols-2">
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"><h2 className="text-xl font-semibold">Brand settings</h2><div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="text-sm">Store name<input className={field} value={form.storeName} onChange={(e) => update({ storeName: e.target.value })} /></label>
        <label className="text-sm">Currency<input className={field} value={form.currency} readOnly /></label>
        <label className="text-sm">Logo URL<input className={field} value={form.logoUrl ?? ''} onChange={(e) => update({ logoUrl: e.target.value })} /></label>
        <label className="text-sm">Favicon URL<input className={field} value={form.faviconUrl ?? ''} onChange={(e) => update({ faviconUrl: e.target.value })} /></label>
        <label className="text-sm">Primary colour<input type="color" className="mt-2 h-11 w-full rounded-xl" value={form.primaryColor} onChange={(e) => update({ primaryColor: e.target.value })} /></label>
        <label className="text-sm">Secondary colour<input type="color" className="mt-2 h-11 w-full rounded-xl" value={form.secondaryColor} onChange={(e) => update({ secondaryColor: e.target.value })} /></label>
        <label className="text-sm">Default shipping fee<input type="number" min="0" className={field} value={form.shippingFee} onChange={(e) => update({ shippingFee: Number(e.target.value) })} /></label>
        <label className="text-sm">Free shipping threshold<input type="number" min="0" className={field} value={form.freeShippingThreshold} onChange={(e) => update({ freeShippingThreshold: Number(e.target.value) })} /></label>
      </div><Button className="mt-5" disabled={saving} onClick={() => void save()}>{saving ? 'Saving...' : 'Save brand settings'}</Button></section>
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"><h2 className="text-xl font-semibold">Security</h2><p className="mt-3 text-sm text-[var(--text-secondary)]">{form.security.adminName} · {form.security.adminEmail ?? 'No email'}<br />{form.security.passwordPolicy}</p><label className="mt-5 block text-sm">Session timeout (minutes)<input type="number" min="5" max="1440" className={field} value={form.sessionTimeoutMinutes} onChange={(e) => update({ sessionTimeoutMinutes: Number(e.target.value) })} /></label><form onSubmit={changePassword} className="mt-5 space-y-3 border-t border-[var(--border-subtle)] pt-5"><h3 className="font-medium">Change admin password</h3><input required type="password" placeholder="Current password" className={field} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} /><input required minLength={12} type="password" placeholder="New password (12+ characters)" className={field} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} /><Button type="submit">Change password</Button></form></section>
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"><h2 className="text-xl font-semibold">Notifications</h2><div className="mt-4 space-y-3">{([['emailNotifications', 'Email notifications'], ['orderConfirmationAlerts', 'Order confirmation alerts'], ['paymentAlerts', 'Payment success/failure alerts'], ['newCustomerAlerts', 'New customer registration alerts'], ['lowStockAlerts', 'Low-stock alerts']] as const).map(([key, label]) => <label key={key} className="flex items-center justify-between gap-4 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm">{label}<input type="checkbox" checked={form.notifications[key]} onChange={() => updateNotifications(key)} /></label>)}</div><Button className="mt-5" onClick={() => void save()}>Save notification settings</Button></section>
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6"><h2 className="text-xl font-semibold">Integrations</h2><div className="mt-4 space-y-3">{([['razorpay', 'Razorpay payment gateway', form.integrations.razorpayConfigured], ['smtp', 'Email SMTP', form.integrations.smtpConfigured], ['sms', 'SMS provider', form.integrations.smsConfigured], ['whatsapp', 'WhatsApp support', form.integrations.whatsappConfigured]] as const).map(([key, label, configured]) => <div key={key} className="flex items-center justify-between gap-3 rounded-2xl bg-[var(--bg-primary)] p-4 text-sm"><div><p>{label}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{configured ? 'Configured' : 'Not configured'}</p></div><Button type="button" variant="ghost" onClick={() => void test(key)}>Test connection</Button></div>)}</div><p className="mt-4 text-xs text-[var(--text-secondary)]">Secrets remain server-side environment configuration and are never returned to the browser.</p></section>
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 lg:col-span-2"><h2 className="text-xl font-semibold">Email &amp; SMTP</h2><p className="mt-2 text-sm text-[var(--text-secondary)]">Saved SMTP credentials override environment fallback without restarting the server.</p><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <label className="text-sm">SMTP host<input className={field} value={form.email.smtpHost ?? ''} onChange={(e) => update({ email: { ...form.email, smtpHost: e.target.value } })} /></label>
        <label className="text-sm">SMTP port<input type="number" min="1" max="65535" className={field} value={form.email.smtpPort ?? 587} onChange={(e) => update({ email: { ...form.email, smtpPort: Number(e.target.value) } })} /></label>
        <label className="text-sm">SMTP username<input className={field} value={form.email.smtpUsername ?? ''} onChange={(e) => update({ email: { ...form.email, smtpUsername: e.target.value } })} /></label>
        <label className="text-sm">SMTP password / App Password<input type="password" autoComplete="new-password" placeholder={form.email.passwordConfigured ? 'Configured — enter to replace' : 'Required for saved SMTP'} className={field} value={smtpPassword} onChange={(e) => setSmtpPassword(e.target.value)} /></label>
        <label className="text-sm">From email<input type="email" className={field} value={form.email.fromEmail ?? ''} onChange={(e) => update({ email: { ...form.email, fromEmail: e.target.value } })} /></label>
        <label className="text-sm">Sender display name<input className={field} value={form.email.senderDisplayName ?? ''} onChange={(e) => update({ email: { ...form.email, senderDisplayName: e.target.value } })} /></label>
      </div><div className="mt-4 flex flex-wrap gap-5 text-sm"><label><input type="checkbox" checked={form.email.tlsEnabled} onChange={(e) => update({ email: { ...form.email, tlsEnabled: e.target.checked } })} /> TLS enabled</label><label><input type="checkbox" checked={form.email.sslEnabled} onChange={(e) => update({ email: { ...form.email, sslEnabled: e.target.checked } })} /> SSL enabled</label><label><input type="checkbox" checked={form.email.enabled} onChange={(e) => update({ email: { ...form.email, enabled: e.target.checked } })} /> Email notifications enabled</label></div><div className="mt-5 flex flex-wrap gap-3"><Button disabled={saving} onClick={() => void saveEmail()}>Save configuration</Button><Button type="button" variant="ghost" onClick={() => void testSmtpConnection()}>Test SMTP connection</Button></div><div className="mt-5 flex flex-wrap gap-3 border-t border-[var(--border-subtle)] pt-5"><input type="email" placeholder="Test recipient email" className={`${field} max-w-sm`} value={testRecipient} onChange={(e) => setTestRecipient(e.target.value)} /><Button type="button" variant="ghost" disabled={!testRecipient} onClick={() => void sendTestEmail()}>Send test email</Button></div><p className="mt-4 text-xs text-[var(--text-secondary)]">Password configured: {form.email.passwordConfigured ? 'Yes' : 'No'}. Passwords are encrypted at rest and never returned.</p></section>
      <StoreDeliverySettingsPanel accessToken={token} />
    </div>
  </DashboardShell>;
}

export function SuperAdminGstSettingsPage() {
  const { user, refreshSession } = useAuth();
  const token = user?.accessToken ?? '';
  const [settings, setSettings] = useState<AdminGstSettings | null>(null);
  const [history, setHistory] = useState<AdminGstHistoryEntry[]>([]);
  const [rate, setRate] = useState('');
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!token) {
      setLoading(false);
      setError('Your admin session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const [current, entries] = await Promise.all([
        adminService.gstSettings(token),
        adminService.gstHistory(token),
      ]);
      setSettings(current);
      setRate(String(current.defaultRate));
      setHistory(entries);
    } catch (reason) {
      if (reason instanceof AdminApiError && reason.status === 401) await refreshSession();
      setError(reason instanceof Error ? reason.message : 'Unable to load GST settings.');
    } finally {
      setLoading(false);
    }
  }, [refreshSession, token]);

  useEffect(() => { void load(); }, [load]);

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    const parsedRate = Number(rate);
    if (!isValidGstRate(parsedRate)) {
      setError('Enter a GST rate between 0 and 100.');
      setMessage('');
      return;
    }
    if (!settings || !token) {
      setError('GST settings are not loaded. Retry before saving.');
      return;
    }
    setSaving(true);
    setError('');
    setMessage('');
    try {
      const updated = await adminService.updateGstSettings(token, {
        defaultRate: parsedRate,
        priceTreatment: settings.priceTreatment,
        enabled: settings.enabled,
      });
      setSettings(updated);
      setRate(String(updated.defaultRate));
      setHistory(await adminService.gstHistory(token));
      setEditing(false);
      setMessage('Global GST rate saved to the backend.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save the GST rate.');
    } finally {
      setSaving(false);
    }
  };

  return <DashboardShell>
    <SectionTitle eyebrow="Admin settings" title="Global GST settings" description="Manage the global GST rate stored by the backend and review previous changes." />
    <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
      <section className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
        {loading ? <p className="text-sm text-[var(--text-secondary)]" role="status">Loading GST settings...</p>
          : settings ? <>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-sm text-[var(--text-secondary)]">Current GST rate</p>
                <p className="mt-2 text-4xl font-semibold text-[var(--text-primary)]">{settings.defaultRate}%</p>
                <p className="mt-3 text-sm text-[var(--text-secondary)]">
                  Last updated {new Date(settings.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
                <p className="mt-2 text-xs text-[var(--text-secondary)]">
                  {settings.enabled ? 'Enabled' : 'Disabled'} · {settings.priceTreatment.toLowerCase()} pricing
                </p>
              </div>
              {!editing ? <Button type="button" onClick={() => { setMessage(''); setError(''); setEditing(true); }}>Update</Button> : null}
            </div>
          </> : null}
        {editing && settings ? <form onSubmit={(event) => void save(event)} className="mt-6">
          <label htmlFor="global-gst-rate" className="block text-sm font-medium text-[var(--text-primary)]">GST percentage</label>
          <div className="mt-2 flex max-w-sm items-center gap-3">
            <input id="global-gst-rate" type="number" min="0" max="100" step="0.01" required value={rate} onChange={(event) => setRate(event.target.value)} className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-green)]" />
            <span className="text-lg font-semibold">%</span>
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Button type="submit" disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
            <Button type="button" variant="ghost" disabled={saving} onClick={() => { setEditing(false); setRate(String(settings.defaultRate)); setError(''); }}>Cancel</Button>
          </div>
        </form> : null}
        {message ? <p className="mt-5 text-sm text-emerald-700" role="status">{message}</p> : null}
        {error ? <div className="mt-5 text-sm text-red-600" role="alert"><p>{error}</p>{!settings ? <Button type="button" variant="ghost" className="mt-3" onClick={() => void load()}>Retry</Button> : null}</div> : null}
      </section>
      <aside className="rounded-[26px] border border-amber-400/30 bg-amber-400/10 p-6 text-sm leading-6 text-[var(--text-secondary)]">
        <h2 className="font-semibold text-[var(--text-primary)]">Checkout integration status</h2>
        <p className="mt-3">Checkout quotes now calculate inclusive GST using the selected store and delivery state. New orders save a GST snapshot, and Razorpay uses the unchanged inclusive order payable total.</p>
      </aside>
    </div>
    <section className="mt-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 sm:p-8">
      <h2 className="text-xl font-semibold text-[var(--text-primary)]">GST change history</h2>
      {history.length ? <ol className="mt-4 divide-y divide-[var(--border-subtle)]">
        {history.map((entry) => <li key={entry.id} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
          <span className="font-medium text-[var(--text-primary)]">{entry.defaultRate}% · {entry.priceTreatment.toLowerCase()} · {entry.enabled ? 'enabled' : 'disabled'}{entry.active ? ' · current' : ''}</span>
          <span className="text-[var(--text-secondary)]">{new Date(entry.updatedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}{entry.updatedByName ? ` · ${entry.updatedByName}` : ''}</span>
        </li>)}
      </ol> : !loading && !error ? <p className="mt-3 text-sm text-[var(--text-secondary)]">No GST changes are available.</p> : null}
    </section>
  </DashboardShell>;
}
