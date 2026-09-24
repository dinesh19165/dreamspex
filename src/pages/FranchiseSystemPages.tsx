import { useMemo, useState } from 'react';
import { ArrowRight, Bell, Building2, CheckCircle2, ChevronDown, CircleDollarSign, LayoutGrid, LogOut, MapPin, Moon, PackageCheck, PackageOpen, Search, Settings, ShoppingCart, Store, SunMedium, TrendingUp, UserRound, Users, Warehouse } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import Button from '../components/ui/Button';
import { useAuth } from '../context/useAuth';
import { useTheme } from '../context/useTheme';
import { adminSalesOverview, franchiseOrders, franchiseProducts, franchiseRegistrations, franchises, franchiseStats, franchiseUsers, topProducts } from '../data/franchiseData';

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

type PageProps = { children: React.ReactNode };

type DashboardNavItem = { label: string; href: string; icon: LucideIcon; active?: boolean };

function getDefaultNavigationItems(role: 'SUPER_ADMIN' | 'FRANCHISE_ADMIN' | 'CUSTOMER' | null): DashboardNavItem[] {
  if (role === 'SUPER_ADMIN') {
    return [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutGrid },
      { label: 'Franchises', href: '/admin/franchises', icon: Building2 },
      { label: 'Products', href: '/admin/products', icon: PackageOpen },
      { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
      { label: 'Orders', href: '/admin/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/admin/customers', icon: Users },
      { label: 'Reports', href: '/admin/reports', icon: TrendingUp },
      { label: 'Users', href: '/admin/users', icon: UserRound },
      { label: 'Settings', href: '/admin/settings', icon: Settings },
    ];
  }

  if (role === 'FRANCHISE_ADMIN') {
    return [
      { label: 'Dashboard', href: '/franchise/dashboard', icon: LayoutGrid },
      { label: 'Products', href: '/franchise/products', icon: PackageOpen },
      { label: 'Inventory', href: '/admin/inventory', icon: Warehouse },
      { label: 'Orders', href: '/franchise/orders', icon: ShoppingCart },
      { label: 'Customers', href: '/franchise/customers', icon: Users },
      { label: 'Reports', href: '/franchise/reports', icon: TrendingUp },
      { label: 'Store Profile', href: '/franchise/profile', icon: Store },
    ];
  }

  return [];
}

function DashboardShell({
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
  const { theme, toggleTheme } = useTheme();
  const { role, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const resolvedNavItems = useMemo(() => {
    const sourceItems = navItems.length > 0 ? navItems : getDefaultNavigationItems(role);

    return sourceItems.map((item) => ({
      ...item,
      active: item.active ?? (location.pathname === item.href || location.pathname.startsWith(`${item.href}/`)),
    }));
  }, [location.pathname, navItems, role]);

  const profileHref = role === 'SUPER_ADMIN' ? '/admin/profile' : role === 'FRANCHISE_ADMIN' ? '/franchise/profile' : '/account';

  const handleLogout = () => {
    logout();

    if (role === 'SUPER_ADMIN') {
      navigate('/admin/login', { replace: true });
      return;
    }

    if (role === 'FRANCHISE_ADMIN') {
      navigate('/franchise/login', { replace: true });
      return;
    }

    navigate('/login', { replace: true });
  };

  const sidebar = (
    <div className="flex h-full flex-col">
      <div className="mb-5 flex items-center gap-3 px-2">
        <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-green)] text-sm font-bold text-[#101810]">DS</div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.32em] text-[var(--text-secondary)]">Dream Spex</p>
          <h2 className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{locationLabel}</h2>
        </div>
      </div>

      <nav className="flex-1 space-y-1.5 overflow-y-auto pb-4">
        {resolvedNavItems.map(({ label, href, icon: Icon, active }) => (
          <Link
            key={label}
            to={href}
            onClick={() => setMobileOpen(false)}
            className={`group flex items-center gap-3 rounded-2xl px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green)] ${active ? 'bg-[var(--brand-green)]/12 text-[var(--text-primary)] shadow-[inset_0_0_0_1px_rgba(154,219,108,0.2)] ring-1 ring-[var(--brand-green)]/20' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)]'}`}
          >
            <span className={`flex h-8 w-8 items-center justify-center rounded-xl ${active ? 'bg-[var(--brand-green)]/15 text-[var(--brand-green)]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)] group-hover:text-[var(--text-primary)]'}`}>
              <Icon className="h-4 w-4" />
            </span>
            {label}
          </Link>
        ))}
      </nav>

      <div className="space-y-2 border-t border-[var(--border-subtle)] pt-4">
        <Link to={profileHref} onClick={() => setMobileOpen(false)} className="flex w-full items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-[var(--bg-primary)] hover:text-[var(--text-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--brand-green)]">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--bg-primary)]"><UserRound className="h-4 w-4" /></span>
          Profile
        </Link>
        <button type="button" onClick={handleLogout} className="flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left text-sm text-[var(--text-secondary)] transition hover:bg-red-500/8 hover:text-red-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-400">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-red-500/8"><LogOut className="h-4 w-4" /></span>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]">
      <div className="fixed inset-y-0 left-0 z-30 hidden w-72 border-r border-[var(--border-subtle)] bg-[var(--bg-card)]/95 p-5 backdrop-blur-xl lg:block">
        {sidebar}
      </div>

      {mobileOpen ? (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      ) : null}

      <div className={`fixed inset-y-0 left-0 z-50 w-72 -translate-x-full border-r border-[var(--border-subtle)] bg-[var(--bg-card)]/95 p-5 backdrop-blur-xl transition-transform duration-200 lg:hidden ${mobileOpen ? 'translate-x-0' : ''}`}>
        {sidebar}
      </div>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-20 border-b border-[var(--border-subtle)] bg-[var(--bg-primary)]/90 backdrop-blur-xl">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6 lg:px-8">
            <button type="button" onClick={() => setMobileOpen(true)} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)] lg:hidden" aria-label="Open navigation">
              <span className="sr-only">Open menu</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5"><path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" /></svg>
            </button>

            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.32em] text-[var(--text-secondary)]">{heading}</p>
              <h1 className="mt-1 text-2xl font-semibold text-[var(--text-primary)] sm:text-[28px]">{subheading}</h1>
            </div>

            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-secondary)] sm:flex">
                <Search className="h-4 w-4 text-[var(--brand-green)]" />
                <input className="w-36 bg-transparent text-sm outline-none placeholder:text-[var(--text-secondary)]" placeholder="Search..." />
              </div>
              <button type="button" className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]">
                <Bell className="h-4 w-4" />
              </button>
              <button type="button" className="hidden items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-sm text-[var(--text-primary)] sm:flex">
                <Store className="h-4 w-4 text-[var(--brand-green)]" />
                <span>All Franchises</span>
                <ChevronDown className="h-4 w-4 text-[var(--text-secondary)]" />
              </button>
              <button type="button" onClick={toggleTheme} className="flex h-10 w-10 items-center justify-center rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-[var(--text-primary)]">
                {theme === 'dark' ? <SunMedium className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </button>
              <div className="flex items-center gap-3 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-2.5 py-1.5">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--brand-green)] text-xs font-semibold text-[#101810]">AR</div>
                <div className="hidden sm:block">
                  <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Admin</p>
                  <p className="text-sm font-medium">Amit</p>
                </div>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}

export function SuperAdminInventoryPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Inventory" title="Network inventory overview" description="Monitor enterprise stock levels, replenishment priorities, and fulfillment readiness across all franchise locations." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ready stock', value: '86%' },
          { label: 'Low stock', value: '44 items' },
          { label: 'Fast movers', value: '128 items' },
          { label: 'Restock due', value: '6 days' },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>
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
                  <td className="px-4 py-4 text-[var(--text-primary)]">{user.franchise ?? 'Network-wide'}</td>
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-[var(--brand-green)]">{eyebrow}</p>
        <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)] sm:text-4xl">{title}</h1>
      </div>
      <p className="max-w-xl text-sm leading-6 text-[var(--text-secondary)]">{description}</p>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const palette: Record<string, string> = {
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
    <span className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${palette[status] ?? 'bg-slate-500/15 text-slate-300 border-slate-500/30'}`}>
      {status}
    </span>
  );
}

function OverviewChart({ values }: { values: { label: string; value: number }[] }) {
  const max = Math.max(...values.map((item) => item.value), 1);

  return (
    <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Sales overview</p>
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Revenue trend</h3>
        </div>
        <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-300">+18.4%</span>
      </div>
      <div className="flex h-52 items-end gap-3">
        {values.map((item) => (
          <div key={item.label} className="flex flex-1 flex-col items-center gap-3">
            <div className="flex h-full w-full items-end justify-center">
              <div
                className="w-full rounded-t-[14px] bg-gradient-to-t from-[var(--brand-green-dark)] via-[var(--brand-green)] to-emerald-300"
                style={{ height: `${(item.value / max) * 100}%`, minHeight: '20%' }}
              />
            </div>
            <span className="text-[11px] text-[var(--text-secondary)]">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function TableCard({ children }: { children: React.ReactNode }) {
  return <div className="overflow-hidden rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)]">{children}</div>;
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
          <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">Network sales</h3>
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
      <div className="mb-6 flex flex-col gap-4 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between">
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
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-green)]/12 text-[var(--brand-green)]">
                <stat.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
              <span>{stat.helper}</span>
              <span className="inline-flex items-center rounded-full bg-[var(--brand-green)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--brand-green)]">+12.4%</span>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.8fr_0.9fr]">
        <RevenueChart data={adminSalesOverview.map((item) => ({ label: item.label, value: item.value * 12 }))} />

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Orders overview</p>
            <span className="rounded-full bg-[var(--brand-green)]/10 px-2 py-1 text-[10px] font-semibold text-[var(--brand-green)]">This week</span>
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
            <Link to="/admin/franchises" className="text-sm font-semibold text-[var(--brand-green)]">View all</Link>
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
                    <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{franchise.orders}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.24em] text-[var(--text-secondary)]">Products</p>
                    <p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{franchise.products}</p>
                  </div>
                </div>
                <div className="mt-4 flex items-center justify-between rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs text-[var(--text-secondary)]">
                  <span>Trend</span>
                  <span className="font-semibold text-[var(--brand-green)]">{franchise.trend}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Inventory alerts</p>
            <span className="text-sm font-semibold text-[var(--brand-green)]">Low stock</span>
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
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent orders</p>
            <Link to="/admin/orders" className="text-sm font-semibold text-[var(--brand-green)]">View all</Link>
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
                    <td className="px-3 py-3 text-[var(--text-primary)]">{order.customer}</td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{order.franchise}</td>
                    <td className="px-3 py-3 text-[var(--text-primary)]">{order.product}</td>
                    <td className="px-3 py-3 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                    <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                    <td className="px-3 py-3 text-[var(--text-secondary)]">{order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Top selling products</p>
            <ArrowRight className="h-4 w-4 text-[var(--brand-green)]" />
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
                  <p className="mt-1 text-sm font-semibold text-[var(--brand-green)]">{formatCurrency(topProducts[index]?.revenue ?? product.price * 10)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent registrations</p>
          <Link to="/admin/franchises" className="text-sm font-semibold text-[var(--brand-green)]">Open list</Link>
        </div>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {franchiseRegistrations.map((entry) => (
            <div key={entry.name} className="rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
              <p className="font-medium text-[var(--text-primary)]">{entry.name}</p>
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
  return (
    <DashboardShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <SectionTitle eyebrow="Franchise Management" title="All franchises" description="Track franchise health, operational status, performance, and user readiness across the network." />
        <Link to="/admin/franchises/new">
          <Button>+ Add Franchise</Button>
        </Link>
      </div>

      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Franchise ID', 'Franchise Name', 'Franchise Owner', 'Location', 'City', 'State', 'Phone', 'Email', 'Products', 'Orders', 'Sales', 'Status', 'Created Date', 'Actions'].map((heading) => (
                  <th key={heading} className="px-4 py-4 font-medium whitespace-nowrap">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franchises.map((franchise) => (
                <tr key={franchise.id} className="border-t border-[var(--border-subtle)] align-top">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{franchise.id}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.name}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.owner}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{franchise.address}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.city}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.state}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.phone}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{franchise.email}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.products ?? 0}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{franchise.orders ?? 0}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{formatCurrency(franchise.sales ?? 0)}</td>
                  <td className="px-4 py-4"><StatusBadge status={franchise.status} /></td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(franchise.createdAt)}</td>
                  <td className="px-4 py-4">
                    <div className="flex flex-wrap gap-2">
                      <Link to={`/admin/franchises/${franchise.id}`} className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]">View</Link>
                      <Link to={`/admin/franchises/${franchise.id}/users`} className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1.5 text-xs font-medium text-[var(--text-primary)]">Users</Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function AddFranchisePage() {
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
    status: 'Active',
    adminEmail: '',
    adminName: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const updateField = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const hasMissing = Object.values(form).some((value) => value.trim().length === 0);
    if (hasMissing) {
      setSubmitted(false);
      return;
    }
    setSubmitted(true);
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
              ['country', 'Country'],
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
          </div>

          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Business</h2>
            {[
              ['gstNumber', 'GST Number'],
              ['businessType', 'Business Type'],
              ['status', 'Status'],
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
          </div>

          <div className="space-y-5">
            <h2 className="text-lg font-semibold text-[var(--text-primary)]">Login</h2>
            {[
              ['adminEmail', 'Franchise Admin Email'],
              ['adminName', 'Franchise Admin Name'],
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
          </div>
        </div>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="submit">Create Franchise</Button>
          <Link to="/admin/franchises"><Button variant="ghost">Cancel</Button></Link>
        </div>

        {submitted ? <p className="mt-5 text-sm font-medium text-emerald-300">Franchise drafted successfully. This is a frontend-only form.</p> : null}
      </form>
    </DashboardShell>
  );
}

export function FranchiseDetailPage() {
  const { id } = useParams();
  const franchise = franchises.find((item) => item.id === id) ?? franchises[0];
  const cityKey = franchise.city.toLowerCase().replace(/\s+/g, '');
  const stats = franchiseStats[cityKey] ?? franchiseStats.hyderabad;
  const [activeTab, setActiveTab] = useState('Overview');

  const tabs = ['Overview', 'Products', 'Orders', 'Customers', 'Inventory', 'Users', 'Reports'];

  const overviewCards = [
    { label: 'Products', value: stats.products, icon: PackageCheck },
    { label: 'Orders', value: stats.orders, icon: ShoppingCart },
    { label: 'Customers', value: stats.customers, icon: Users },
    { label: 'Revenue', value: formatCurrency(stats.revenue), icon: CircleDollarSign },
    { label: 'Inventory', value: `${stats.inventory}%`, icon: Warehouse },
  ];

  return (
    <DashboardShell>
      <div className="mb-6 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[11px] uppercase tracking-[0.28em] text-[var(--brand-green)]">Franchise</p>
            <h1 className="mt-2 text-3xl font-semibold text-[var(--text-primary)]">{franchise.name}</h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-[var(--text-secondary)]"><MapPin className="h-4 w-4 text-[var(--brand-green)]" /> {franchise.city} Franchise</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link to="/admin/franchises"><Button variant="ghost">Back to all</Button></Link>
            <Button>Manage Franchise</Button>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Status</p>
            <StatusBadge status={franchise.status} />
          </div>
          <div className="mt-5 space-y-4 text-sm text-[var(--text-secondary)]">
            <p><span className="font-medium text-[var(--text-primary)]">Location:</span> {franchise.city}, {franchise.state}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Owner:</span> {franchise.owner}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Contact:</span> {franchise.phone}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Email:</span> {franchise.email}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Address:</span> {franchise.address}</p>
          </div>
        </div>

        <div className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Statistics</p>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {overviewCards.map((card) => (
              <div key={card.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                <div className="flex items-center justify-between"><span className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{card.label}</span><card.icon className="h-4 w-4 text-[var(--brand-green)]" /></div>
                <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{card.value}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-8 rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-3.5 py-2 text-sm font-medium transition ${activeTab === tab ? 'bg-[var(--brand-green)] text-[#172015]' : 'text-[var(--text-secondary)] hover:bg-[var(--bg-primary)]'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-8">
        {activeTab === 'Overview' ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <OverviewChart values={adminSalesOverview.map((item, index) => ({ label: item.label, value: item.value + (index * 4) }))} />
            <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
              <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Recent activity</p>
              <div className="mt-5 space-y-4">
                {['Inventory restocked', 'New bundled offer published', 'Customer campaign launched', 'Franchise staff onboarding complete'].map((event) => (
                  <div key={event} className="flex items-start gap-3 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 text-[var(--brand-green)]" />
                    <span className="text-sm text-[var(--text-primary)]">{event}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : null}

        {activeTab === 'Products' ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {franchiseProducts.slice(0, 3).map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)]">
                <img src={product.image} alt={product.name} className="h-52 w-full object-cover" />
                <div className="p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-[var(--text-primary)]">{product.name}</p>
                    <StatusBadge status={product.status} />
                  </div>
                  <p className="mt-2 text-sm text-[var(--text-secondary)]">{product.brand} • {product.category}</p>
                  <div className="mt-4 flex items-center justify-between text-sm">
                    <span className="font-semibold text-[var(--text-primary)]">{formatCurrency(product.price)}</span>
                    <span className="text-[var(--text-secondary)]">Stock: {product.stock}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : null}

        {activeTab === 'Orders' ? (
          <TableCard>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                  <tr>
                    {['Order ID', 'Customer', 'Product', 'Amount', 'Delivery', 'Status'].map((header) => (
                      <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {franchiseOrders.filter((item) => item.franchiseId === franchise.id || item.franchise === franchise.city).map((order) => (
                    <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                      <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{order.id}</td>
                      <td className="px-4 py-4 text-[var(--text-primary)]">{order.customer}</td>
                      <td className="px-4 py-4 text-[var(--text-primary)]">{order.product}</td>
                      <td className="px-4 py-4 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                      <td className="px-4 py-4 text-[var(--text-secondary)]">{order.delivery}</td>
                      <td className="px-4 py-4"><StatusBadge status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        ) : null}

        {activeTab === 'Customers' ? (
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Customer segment</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { label: 'New', value: '430' },
                { label: 'Returning', value: '812' },
                { label: 'VIP', value: '42' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-center">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'Inventory' ? (
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <p className="text-lg font-semibold text-[var(--text-primary)]">Inventory health</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              {[
                { label: 'Available stock', value: '94%' },
                { label: 'Restock priority', value: '12 items' },
                { label: 'Fast moving', value: 'Frames' },
                { label: 'Low stock alerts', value: '3 items' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'Users' ? (
          <TableCard>
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
                  <tr>
                    {['User', 'Role', 'Status', 'Last Login'].map((header) => (
                      <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {franchiseUsers.slice(0, 3).map((user) => (
                    <tr key={user.id} className="border-t border-[var(--border-subtle)]">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium text-[var(--text-primary)]">{user.name}</p>
                          <p className="text-xs text-[var(--text-secondary)]">{user.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-[var(--text-primary)]">{user.role}</td>
                      <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                      <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(user.lastLogin)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TableCard>
        ) : null}

        {activeTab === 'Reports' ? (
          <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {[
                { label: 'Revenue', value: formatCurrency(842000) },
                { label: 'Orders', value: '632' },
                { label: 'Products', value: '184' },
                { label: 'Customers', value: '1284' },
              ].map((item) => (
                <div key={item.label} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-[var(--text-secondary)]">{item.label}</p>
                  <p className="mt-3 text-2xl font-semibold text-[var(--text-primary)]">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </DashboardShell>
  );
}

export function FranchiseDashboardPage() {
  const stats = franchiseStats.hyderabad;
  const franchiseOrdersForCity = franchiseOrders.filter((order) => order.franchise === 'Hyderabad');
  const quickActions = [
    { label: '+ Add Product', href: '/franchise/products/new' },
    { label: 'Manage Inventory', href: '/franchise/inventory' },
    { label: 'View Orders', href: '/franchise/orders' },
    { label: 'View Reports', href: '/franchise/reports' },
  ];

  return (
    <DashboardShell
      navItems={[
        { label: 'Dashboard', href: '/franchise/dashboard', icon: LayoutGrid, active: true },
        { label: 'Products', href: '/franchise/products', icon: PackageOpen },
        { label: 'Inventory', href: '/franchise/inventory', icon: Warehouse },
        { label: 'Orders', href: '/franchise/orders', icon: ShoppingCart },
        { label: 'Customers', href: '/franchise/customers', icon: Users },
        { label: 'Reports', href: '/franchise/reports', icon: TrendingUp },
        { label: 'Store Profile', href: '/franchise/profile', icon: Store },
      ]}
      heading="FRANCHISE ADMIN"
      subheading="Dream Spex Hyderabad"
      locationLabel="Hyderabad Franchise"
    >
      <div className="mb-6 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--brand-green)]">Hyderabad, Telangana</p>
            <h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Dream Spex Hyderabad</h2>
            <p className="mt-2 text-sm text-[var(--text-secondary)]">DS-HYD-001</p>
          </div>
          <Link to="/franchise/products/new"><Button>+ Add Product</Button></Link>
        </div>
      </div>

      <div className="mb-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Products', value: String(stats.products), helper: 'Active SKUs', icon: PackageCheck },
          { label: 'Inventory', value: `${stats.inventory}%`, helper: 'Stock health', icon: Warehouse },
          { label: 'Orders', value: String(stats.orders), helper: 'This month', icon: ShoppingCart },
          { label: 'Revenue', value: formatCurrency(stats.revenue), helper: 'Current sales', icon: CircleDollarSign },
          { label: 'Customers', value: String(stats.customers), helper: 'Local shoppers', icon: Users },
        ].map((card) => (
          <div key={card.label} className="rounded-[22px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.26em] text-[var(--text-secondary)]">{card.label}</p>
                <p className="mt-4 text-3xl font-semibold text-[var(--text-primary)]">{card.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[var(--brand-green)]/12 text-[var(--brand-green)]">
                <card.icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-4 text-sm text-[var(--text-secondary)]">{card.helper}</div>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.5fr_0.7fr]">
        <RevenueChart data={adminSalesOverview.map((item) => ({ label: item.label, value: item.value * 9 }))} />

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Quick actions</p>
          <div className="mt-4 space-y-3">
            {quickActions.map((action) => (
              <Link key={action.label} to={action.href} className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3.5 py-3 text-sm font-medium text-[var(--text-primary)] transition hover:border-[var(--brand-green)]/40 hover:bg-[var(--brand-green)]/5">
                <span>{action.label}</span>
                <ArrowRight className="h-4 w-4 text-[var(--brand-green)]" />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <div className="mb-5 flex items-center justify-between gap-3">
            <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Top products</p>
            <Link to="/franchise/products" className="text-sm font-semibold text-[var(--brand-green)]">Manage</Link>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {franchiseProducts.slice(0, 4).map((product) => (
              <article key={product.id} className="overflow-hidden rounded-[20px] border border-[var(--border-subtle)] bg-[var(--bg-primary)]">
                <img src={product.image} alt={product.name} className="h-32 w-full object-cover" />
                <div className="p-3.5">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-[var(--text-primary)]">{product.name}</p>
                      <p className="mt-1 text-xs text-[var(--text-secondary)]">{product.brand}</p>
                    </div>
                    <span className="text-sm font-semibold text-[var(--brand-green)]">{formatCurrency(product.price)}</span>
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                    <span>Units sold: {Math.max(12, product.stock - 10)}</span>
                    <span>Stock: {product.stock}</span>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Inventory status</p>
          <div className="mt-4 space-y-4">
            {[
              { label: 'In Stock', value: 72, tone: 'bg-[var(--brand-green)]' },
              { label: 'Low Stock', value: 21, tone: 'bg-amber-500' },
              { label: 'Out of Stock', value: 7, tone: 'bg-rose-500' },
            ].map((item) => (
              <div key={item.label}>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-[var(--text-secondary)]">{item.label}</span>
                  <span className="font-semibold text-[var(--text-primary)]">{item.value}%</span>
                </div>
                <div className="h-2.5 rounded-full bg-[var(--bg-primary)]">
                  <div className={`h-full rounded-full ${item.tone}`} style={{ width: `${item.value}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
        <div className="mb-5 flex items-center justify-between gap-3">
          <p className="text-[10px] uppercase tracking-[0.28em] text-[var(--text-secondary)]">Recent orders</p>
          <Link to="/franchise/orders" className="text-sm font-semibold text-[var(--brand-green)]">View all</Link>
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
              {franchiseOrdersForCity.slice(0, 5).map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-3 py-3 font-medium text-[var(--text-primary)]">{order.id}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{order.customer}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{order.product}</td>
                  <td className="px-3 py-3 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                  <td className="px-3 py-3"><StatusBadge status={order.status} /></td>
                  <td className="px-3 py-3 text-[var(--text-secondary)]">{new Date(order.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  );
}

export function FranchiseProductsPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');
  const [stock, setStock] = useState('All');

  const filteredProducts = useMemo(() => {
    return franchiseProducts.filter((product) => {
      const matchesSearch = product.name.toLowerCase().includes(search.toLowerCase()) || product.brand.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'All' || product.status === status;
      const matchesStock = stock === 'All' || (stock === 'Low' ? product.stock <= 20 : product.stock > 20);
      return matchesSearch && matchesStatus && matchesStock;
    });
  }, [search, status, stock]);

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Franchise Products" title="Manage product portfolio" description="Search, filter, stock-manage, and activate products for the Hyderabad franchise." />

      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.5fr]">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search products" className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>All</option>
          <option>Active</option>
          <option>Low Stock</option>
        </select>
        <select value={stock} onChange={(event) => setStock(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>All</option>
          <option>Low</option>
          <option>Healthy</option>
        </select>
        <Link to="/franchise/products/new"><Button>+ Add Product</Button></Link>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredProducts.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <img src={product.image} alt={product.name} className="h-52 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--text-primary)]">{product.name}</p>
                <StatusBadge status={product.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{product.brand} • {product.category}</p>
              <div className="mt-4 grid gap-2 text-sm text-[var(--text-secondary)]">
                <p>SKU: {product.sku}</p>
                <p>Price: {formatCurrency(product.price)}</p>
                <p>Stock: {product.stock}</p>
                <p>Location: {product.city}</p>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link to="/franchise/products" className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">View</Link>
                <Link to="/franchise/products/new" className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">Edit</Link>
                <button type="button" className="rounded-full border border-[var(--border-subtle)] px-3 py-2 text-xs font-medium text-[var(--text-primary)]">Stock</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}

export function AddFranchiseProductPage() {
  const [form, setForm] = useState({
    productName: '',
    brand: '',
    category: 'Frames',
    description: '',
    price: '',
    discount: '',
    sku: '',
    stock: '',
    frameType: 'Rimless',
    frameShape: 'Rectangle',
    lensType: 'Blue Light',
    status: 'Active',
  });

  const setValue = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Add Product" title="Add product for Hyderabad Franchise" description="Create a franchise-ready product entry with pricing, stock, lens type, and status for frontend-only inventory management." />

      <form className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-6 lg:grid-cols-2">
          {[
            ['productName', 'Product Name'],
            ['brand', 'Brand'],
            ['category', 'Category'],
            ['description', 'Description'],
            ['price', 'Price'],
            ['discount', 'Discount'],
            ['sku', 'SKU'],
            ['stock', 'Stock'],
            ['frameType', 'Frame Type'],
            ['frameShape', 'Frame Shape'],
            ['lensType', 'Lens Type'],
            ['status', 'Status'],
          ].map(([key, label]) => (
            <label key={key} className="block text-sm text-[var(--text-secondary)]">
              <span>{label}</span>
              <input value={form[key as keyof typeof form]} onChange={(event) => setValue(key as keyof typeof form, event.target.value)} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none" />
            </label>
          ))}
        </div>

        <div className="mt-8 flex gap-3">
          <Button type="submit">Save Product</Button>
          <Link to="/franchise/products"><Button variant="ghost">Back to products</Button></Link>
        </div>
      </form>
    </DashboardShell>
  );
}

export function FranchiseOrdersPage() {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('All');

  const filtered = useMemo(() => {
    return franchiseOrders.filter((order) => {
      const matchesSearch = order.customer.toLowerCase().includes(search.toLowerCase()) || order.product.toLowerCase().includes(search.toLowerCase());
      const matchesStatus = status === 'All' || order.status === status;
      return matchesSearch && matchesStatus;
    });
  }, [search, status]);

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Franchise Orders" title="Order management" description="Track orders from purchase to dispatch and fulfilment in the Hyderabad franchise." />

      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-[1.5fr_0.8fr_0.8fr_0.8fr]">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" placeholder="Search order or customer" />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>All</option>
          <option>Delivered</option>
          <option>Processing</option>
          <option>Pending</option>
          <option>Shipped</option>
        </select>
        <select className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>Date</option>
        </select>
        <select className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>Payment</option>
        </select>
      </div>

      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Order ID', 'Customer', 'Product', 'Amount', 'Order Date', 'Payment', 'Delivery', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]"><Link to={`/franchise/orders/${order.id}`} className="text-[var(--brand-green)]">{order.id}</Link></td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.customer}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.product}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(order.orderDate)}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.payment}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{order.delivery}</td>
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

export function FranchiseOrderDetailPage() {
  const { id } = useParams();
  const order = franchiseOrders.find((item) => item.id === id) ?? franchiseOrders[0];

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Order Details" title={`Order ${order.id}`} description="Detailed view for the selected franchise order." />
      <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Order summary</p>
          <div className="mt-5 space-y-3 text-sm text-[var(--text-secondary)]">
            <p><span className="font-medium text-[var(--text-primary)]">Customer:</span> {order.customer}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Product:</span> {order.product}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Amount:</span> {formatCurrency(order.amount)}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Payment:</span> {order.payment}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Delivery:</span> {order.delivery}</p>
            <p><span className="font-medium text-[var(--text-primary)]">Location:</span> {order.location}</p>
          </div>
          <div className="mt-6"><StatusBadge status={order.status} /></div>
        </div>

        <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
          <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">Timeline</p>
          <div className="mt-6 space-y-4">
            {[
              'Order created',
              'Payment confirmed',
              'Packed and assigned',
              'Out for delivery',
              'Delivered',
            ].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className={`flex h-8 w-8 items-center justify-center rounded-full ${index <= 3 ? 'bg-[var(--brand-green)] text-[#172015]' : 'bg-[var(--bg-primary)] text-[var(--text-secondary)]'}`}>{index + 1}</div>
                <span className="text-sm text-[var(--text-primary)]">{step}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export function SuperAdminOrdersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="All Orders" title="Network order overview" description="Review every franchise order with filters for franchise, location, status, date, and search." />
      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-5">
        {['All Franchises', 'All Locations', 'All Status', 'Date', 'Search'].map((label) => (
          <div key={label} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{label}</div>
        ))}
      </div>

      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['Order ID', 'Franchise', 'Location', 'Customer', 'Product', 'Amount', 'Status'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franchiseOrders.map((order) => (
                <tr key={order.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{order.id}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.franchise}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{order.location}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.customer}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{order.product}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{formatCurrency(order.amount)}</td>
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
  return (
    <DashboardShell>
      <SectionTitle eyebrow="All Products" title="Network-wide product catalog" description="Review products across all franchise locations with filters by franchise, region, category, brand, status, and stock." />

      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-6">
        {['Franchise', 'Location', 'Category', 'Brand', 'Status', 'Stock'].map((label) => (
          <div key={label} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{label}: All</div>
        ))}
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {franchiseProducts.map((product) => (
          <article key={product.id} className="overflow-hidden rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)]">
            <img src={product.image} alt={product.name} className="h-52 w-full object-cover" />
            <div className="p-5">
              <div className="flex items-center justify-between gap-3">
                <p className="font-semibold text-[var(--text-primary)]">{product.name}</p>
                <StatusBadge status={product.status} />
              </div>
              <p className="mt-2 text-sm text-[var(--text-secondary)]">{product.franchiseName}</p>
              <div className="mt-4 text-sm text-[var(--text-secondary)]">
                <p>Brand: {product.brand}</p>
                <p>Price: {formatCurrency(product.price)}</p>
                <p>Stock: {product.stock}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}

export function StoresPage() {
  const [search, setSearch] = useState('');
  const [cityFilter, setCityFilter] = useState('All');
  const [stateFilter, setStateFilter] = useState('All');

  const filteredStores = useMemo(() => {
    return franchises.filter((franchise) => {
      const matchesSearch = `${franchise.name} ${franchise.city} ${franchise.state} ${franchise.address}`.toLowerCase().includes(search.toLowerCase());
      const matchesCity = cityFilter === 'All' || franchise.city === cityFilter;
      const matchesState = stateFilter === 'All' || franchise.state === stateFilter;
      return matchesSearch && matchesCity && matchesState;
    });
  }, [search, cityFilter, stateFilter]);

  return (
    <DashboardShell>
      <SectionTitle eyebrow="Stores" title="Dream Spex franchise locator" description="Find the right store, view opening hours, services, and request directions to the closest location." />

      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 lg:grid-cols-3">
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--text-secondary)]" />
          <input value={search} onChange={(event) => setSearch(event.target.value)} className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]" placeholder="Search location" />
        </div>
        <select value={cityFilter} onChange={(event) => setCityFilter(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>All</option>
          {franchises.map((franchise) => <option key={franchise.city}>{franchise.city}</option>)}
        </select>
        <select value={stateFilter} onChange={(event) => setStateFilter(event.target.value)} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none">
          <option>All</option>
          {Array.from(new Set(franchises.map((franchise) => franchise.state))).map((state) => <option key={state}>{state}</option>)}
        </select>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredStores.map((franchise) => (
          <article key={franchise.id} className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-[var(--brand-green)]">{franchise.city}</p>
                <h3 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{franchise.name}</h3>
              </div>
              <StatusBadge status={franchise.status} />
            </div>
            <div className="mt-5 space-y-2 text-sm text-[var(--text-secondary)]">
              <p>{franchise.address}</p>
              <p>{franchise.city}, {franchise.state}</p>
              <p>{franchise.phone}</p>
              <p>Opening hours: {franchise.openingHours}</p>
              <p>Available services: {franchise.services.join(', ')}</p>
            </div>
            <div className="mt-6 flex gap-3">
              <Link to={`/admin/franchises/${franchise.id}`} className="flex-1"><Button variant="secondary">View Store</Button></Link>
              <Button variant="secondary">Get Directions</Button>
            </div>
          </article>
        ))}
      </div>
    </DashboardShell>
  );
}

export function FranchiseUsersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Franchise Users" title="Franchise role access" description="Review staff, managers, and admin access across the assigned network outlet." />
      <TableCard>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-[var(--bg-primary)] text-[var(--text-secondary)]">
              <tr>
                {['User Name', 'Email', 'Phone', 'Role', 'Status', 'Last Login', 'Actions'].map((header) => (
                  <th key={header} className="px-4 py-4 font-medium whitespace-nowrap">{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {franchiseUsers.map((user) => (
                <tr key={user.id} className="border-t border-[var(--border-subtle)]">
                  <td className="px-4 py-4 font-medium text-[var(--text-primary)]">{user.name}</td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{user.email}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{user.phone}</td>
                  <td className="px-4 py-4 text-[var(--text-primary)]">{user.role}</td>
                  <td className="px-4 py-4"><StatusBadge status={user.status} /></td>
                  <td className="px-4 py-4 text-[var(--text-secondary)]">{formatDate(user.lastLogin)}</td>
                  <td className="px-4 py-4"><button type="button" className="rounded-full border border-[var(--border-subtle)] px-3 py-1.5 text-xs font-medium text-[var(--text-primary)]">Manage</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </TableCard>
    </DashboardShell>
  );
}

export function FranchiseCustomersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Franchise Customers" title="Customer retention dashboard" description="Break down returning customers, purchased optical categories, and local conversion trends." />
      <div className="grid gap-4 md:grid-cols-3">
        {[
          { label: 'New customers', value: '1,244' },
          { label: 'Returning', value: '2,310' },
          { label: 'VIP members', value: '312' },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function FranchiseInventoryPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Inventory" title="Stock and replenishment" description="Monitor frame inventory, stock level alerts, and replenishment priority for this franchise location." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Ready stock', value: '78%' },
          { label: 'Low stock', value: '18 items' },
          { label: 'Fast movers', value: '26 items' },
          { label: 'Restock due', value: '3 days' },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function FranchiseProfilePage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Franchise Profile" title="Outlet profile & settings" description="Review legal details, brand compliance, staff, and location information for this franchise." />
      <div className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6">
        <div className="grid gap-5 md:grid-cols-2">
          {[
            ['Franchise Name', 'Dream Spex Hyderabad'],
            ['Owner', 'Rohit Narayan'],
            ['Phone', '+91 98765 43210'],
            ['Email', 'hyderabad@dreamspex.com'],
            ['Address', 'Gachibowli, Hyderabad'],
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

export function SuperAdminCustomersPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Customers" title="Network-wide customer intelligence" description="Track customer acquisition, loyalty performance, and regional demand drivers across all storefronts." />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Total customers', value: '18,420' },
          { label: 'New this month', value: '2,410' },
          { label: 'Returning', value: '7,644' },
          { label: 'VIP members', value: '880' },
        ].map((item) => (
          <div key={item.label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{item.label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{item.value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function SuperAdminSettingsPage() {
  return (
    <DashboardShell>
      <SectionTitle eyebrow="Settings" title="Platform configuration" description="Manage brand rules, campaign defaults, franchise compliance settings, and account controls." />
      <div className="grid gap-4 md:grid-cols-2">
        {[
          'Brand preferences',
          'Outlet access rules',
          'Inventory alerts',
          'Commission policies',
        ].map((item) => (
          <div key={item} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 text-[var(--text-primary)]">
            {item}
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}

export function ReportsPage({ scope = 'super-admin' }: { scope?: 'super-admin' | 'franchise-admin' }) {
  const title = scope === 'super-admin' ? 'Commercial reports' : 'Franchise reports';
  const filters = scope === 'super-admin' ? ['Franchise', 'Location', 'Date range', 'Category'] : ['Date range', 'Category'];

  return (
    <DashboardShell>
      <SectionTitle eyebrow={scope === 'super-admin' ? 'Super Admin Reports' : 'Franchise Reports'} title={title} description="Review revenue, orders, products, customers, inventory, and sales trend insights for the selected operation." />

      <div className="mb-8 grid gap-4 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4 md:grid-cols-2 xl:grid-cols-4">
        {filters.map((label) => (
          <div key={label} className="rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2 text-sm text-[var(--text-secondary)]">{label}</div>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {[
          ['Revenue', formatCurrency(3450000)],
          ['Orders', '2,084'],
          ['Products', '722'],
          ['Customers', '4,544'],
          ['Inventory', '91%'],
          ['Sales trend', '+18.4%'],
        ].map(([label, value]) => (
          <div key={label} className="rounded-[26px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5">
            <p className="text-xs uppercase tracking-[0.25em] text-[var(--text-secondary)]">{label}</p>
            <p className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{value}</p>
          </div>
        ))}
      </div>
    </DashboardShell>
  );
}
