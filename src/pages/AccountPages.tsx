import { useCallback, useEffect, useState } from 'react';
import { ArrowRight, CheckCircle, Gift, Heart, Package, RefreshCw, RotateCcw, Settings, UserRound, WalletCards } from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';
import Footer from '../components/layout/Footer';
import SectionTitle from '../components/ui/SectionTitle';
import Button from '../components/ui/Button';
import { useShop } from '../context/ShopContext';
import { formatINR } from '../utils/currency';
import { useAuth } from '../context/useAuth';
import { profileService, type CustomerProfile, type CustomerProfileUpdate, ProfileApiError } from '../services/profileService';
import { addressService, type CustomerAddress, type CustomerAddressRequest, AddressApiError } from '../services/addressService';
import { orderService, type OrderResponse, OrderApiError } from '../services/orderService';
import { membershipService, type MembershipDashboard } from '../services/membershipService';
import { isValidCoordinates } from '../utils/deliveryNavigation';
import {
  formatPhoneInput,
  phoneCountries,
  phoneInputFromSavedAddress,
  resolveCountryCode,
} from '../utils/customerAddressPhone';
import {
  getOrderItemReturnAction,
  returnService,
  ReturnApiError,
  type CustomerReturn,
  type ReturnEligibility,
} from '../services/returnService';
import { loyaltyService, type LoyaltyDashboard, type Wallet } from '../services/loyaltyService';

function AccountShell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-primary)]"><Navbar /><main className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">{children}</main><Footer /></div>;
}

function EmptyState({ icon: Icon, title, copy, to, action }: { icon: typeof Package; title: string; copy: string; to: string; action: string }) {
  return <div className="mt-8 rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-10 text-center backdrop-blur-xl"><Icon className="mx-auto h-10 w-10 text-cyan-300" /><h2 className="mt-5 text-xl font-semibold text-[var(--text-primary)]">{title}</h2><p className="mx-auto mt-3 max-w-md text-sm leading-7 text-[var(--text-secondary)]">{copy}</p><Link to={to} className="mt-6 inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-5 py-3 text-sm font-semibold text-[var(--text-primary)]">{action}<ArrowRight className="h-4 w-4" /></Link></div>;
}

export function DashboardPage() {
  const { wishlist, cart } = useShop();
  const { user } = useAuth();
  const [membership, setMembership] = useState<MembershipDashboard | null>(null);
  const [membershipError, setMembershipError] = useState('');
  const [loyalty, setLoyalty] = useState<LoyaltyDashboard | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [rewardsError, setRewardsError] = useState('');
  useEffect(() => {
    let active = true;
    if (!user?.accessToken) {
      setMembership(null);
      return () => { active = false; };
    }
    membershipService.dashboard(user.accessToken)
      .then((value) => { if (active) setMembership(value); })
      .catch((reason: unknown) => {
        if (active) setMembershipError(reason instanceof Error ? reason.message : 'Unable to load membership information.');
      });
    return () => { active = false; };
  }, [user?.accessToken]);

  useEffect(() => {
    let active = true;
    if (!user?.accessToken) return () => { active = false; };
    Promise.all([loyaltyService.dashboard(user.accessToken), loyaltyService.wallet(user.accessToken)])
      .then(([loyaltySummary, walletSummary]) => {
        if (active) { setLoyalty(loyaltySummary); setWallet(walletSummary); setRewardsError(''); }
      })
      .catch((reason: unknown) => { if (active) { setLoyalty(null); setWallet(null); setRewardsError(reason instanceof Error ? reason.message : 'Unable to load rewards summary.'); } });
    return () => { active = false; };
  }, [user?.accessToken]);

  const currentMembership = membership?.current;
  const date = (value: string | null | undefined) => value
    ? new Date(value).toLocaleDateString('en-IN', { dateStyle: 'medium' })
    : 'Not available';

  return <AccountShell><SectionTitle eyebrow="My account" title="Welcome back" description="Your eyewear journey, membership benefits, and account details in one place." />
    <div className="mt-10 grid gap-6 lg:grid-cols-[1.15fr_.85fr]">
      <section className="rounded-[28px] border border-cyan-400/30 bg-cyan-400/10 p-8">
        <div className="flex items-start justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Account summary</p><h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">Your private eyewear edit</h2><p className="mt-3 text-sm leading-7 text-[var(--text-secondary)]">Manage your orders, wishlist, wallet, and preferences from here.</p></div><UserRound className="h-8 w-8 text-cyan-300" /></div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Membership</p><p className="mt-2 font-semibold text-[var(--text-primary)]">{currentMembership ? `${currentMembership.planName} · ${currentMembership.status}` : 'No membership'}</p></div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Wallet balance</p><p className="mt-2 font-semibold text-[var(--text-primary)]">{formatINR(wallet?.balance ?? 0)}</p></div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Loyalty points</p><p className="mt-2 font-semibold text-[var(--text-primary)]">{loyalty?.availablePoints.toLocaleString('en-IN') ?? '—'} available</p></div>
          <div className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-4"><p className="text-xs text-[var(--text-secondary)]">Wishlist</p><p className="mt-2 font-semibold text-[var(--text-primary)]">{wishlist.length} saved</p></div>
        </div>
      </section>
      <aside className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl"><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Quick actions</p><div className="mt-5 grid gap-3">
        <Link to="/orders" className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><span className="flex items-center gap-3"><Package className="h-5 w-5 text-cyan-300" /> Orders</span><ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" /></Link>
        <Link to="/wallet" className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><span className="flex items-center gap-3"><WalletCards className="h-5 w-5 text-cyan-300" /> Wallet</span><ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" /></Link>
        <Link to="/loyalty" className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><span className="flex items-center gap-3"><CheckCircle className="h-5 w-5 text-cyan-300" /> Loyalty & Rewards</span><ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" /></Link>
        <Link to="/referral" className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><span className="flex items-center gap-3"><Gift className="h-5 w-5 text-cyan-300" /> Refer & Earn</span><ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" /></Link>
        <Link to="/wishlist" className="flex items-center justify-between rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><span className="flex items-center gap-3"><Heart className="h-5 w-5 text-cyan-300" /> Wishlist ({wishlist.length})</span><ArrowRight className="h-4 w-4 text-[var(--text-secondary)]" /></Link>
      </div></aside>
    </div>
    {rewardsError ? <p className="mt-4 text-sm text-rose-300" role="alert">{rewardsError}</p> : null}
    <section className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8">
      <div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs font-semibold uppercase tracking-[0.25em] text-cyan-300">Membership</p><h2 className="mt-2 text-xl font-semibold">{currentMembership ? `${currentMembership.planName} · ${currentMembership.status}` : 'No current membership'}</h2></div><Link to={currentMembership && currentMembership.status !== 'ACTIVE' ? `/membership/checkout?plan=${encodeURIComponent(currentMembership.planId)}` : '/membership'} className="rounded-full bg-[#7CBF00] px-5 py-2.5 text-sm font-semibold text-[var(--text-primary)]">{currentMembership?.status === 'ACTIVE' ? 'View plans' : 'Explore plans'}</Link></div>
      {membershipError ? <p className="mt-4 text-sm text-red-600" role="alert">{membershipError}</p> : null}
      {currentMembership ? <div className="mt-5 grid gap-3 sm:grid-cols-3"><p className="rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">Purchase date <strong className="mt-1 block text-[var(--text-primary)]">{date(currentMembership.purchasedAt)}</strong></p><p className="rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">Expiry date <strong className="mt-1 block text-[var(--text-primary)]">{date(currentMembership.expiresAt)}</strong></p><p className="rounded-xl bg-[var(--bg-primary)] p-4 text-sm text-[var(--text-secondary)]">Benefits <strong className="mt-1 block text-[var(--text-primary)]">{currentMembership.benefits.length ? currentMembership.benefits.join(', ') : 'Not configured'}</strong></p></div> : null}
      {membership?.paymentHistory.length ? <div className="mt-6"><h3 className="font-semibold">Membership payments</h3><div className="mt-3 divide-y divide-[var(--border-subtle)]">{membership.paymentHistory.map((payment) => <div key={payment.id} className="flex flex-wrap justify-between gap-2 py-3 text-sm"><span>{payment.planName} · {payment.status} · {date(payment.createdAt)}</span><strong>{formatINR(payment.amount)}</strong></div>)}</div></div> : null}
    </section>
    <div className="mt-8 rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><div className="flex items-center justify-between"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Recent orders</h2><Link to="/orders" className="text-sm font-semibold text-cyan-300">View all</Link></div><p className="mt-6 text-sm text-[var(--text-secondary)]">{cart.length ? 'Your current bag is ready for checkout.' : 'Your recent orders will appear here after your first purchase.'}</p></div>
  </AccountShell>;
}

export function OrdersPage() {
  const { user, refreshSession } = useAuth();
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [returns, setReturns] = useState<CustomerReturn[]>([]);
  const [returnEligibility, setReturnEligibility] = useState<Record<string, ReturnEligibility | null>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrders = useCallback(async () => {
    if (!user?.accessToken) {
      setLoading(false);
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setLoading(true);
    setError('');
    const loadForToken = async (accessToken: string) => {
      const [nextOrders, nextReturns] = await Promise.all([
        orderService.list(accessToken),
        returnService.list(accessToken),
      ]);
      const deliveredOrders = nextOrders.filter((order) =>
        order.status === 'DELIVERED' && order.paymentStatus === 'PAID');
      const results = await Promise.all(deliveredOrders.map(async (order) => {
        try {
          return { orderId: order.id, eligibility: await returnService.eligibility(accessToken, order.id) };
        } catch (reason) {
          return { orderId: order.id, error: reason };
        }
      }));
      const unauthorized = results.find((result) =>
        'error' in result && result.error instanceof ReturnApiError && result.error.status === 401);
      if (unauthorized && 'error' in unauthorized) throw unauthorized.error;

      const nextEligibility: Record<string, ReturnEligibility | null> = {};
      results.forEach((result) => {
        nextEligibility[result.orderId] = 'eligibility' in result ? result.eligibility ?? null : null;
      });
      setOrders(nextOrders);
      setReturns(nextReturns);
      setReturnEligibility(nextEligibility);
    };
    try {
      let accessToken = user.accessToken;
      try {
        await loadForToken(accessToken);
      } catch (reason) {
        const unauthorized = (reason instanceof OrderApiError || reason instanceof ReturnApiError)
          && reason.status === 401;
        if (!unauthorized || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        await loadForToken(accessToken);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your orders.');
    } finally {
      setLoading(false);
    }
  }, [refreshSession, user?.accessToken]);

  useEffect(() => { void loadOrders(); }, [loadOrders]);

  return <AccountShell><SectionTitle eyebrow="My orders" title="Your order history" description="Review purchases, payment status, and delivery progress." /><div className="mt-5 flex justify-end"><Link to="/returns" className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-4 py-2.5 text-sm font-semibold text-[var(--text-primary)] transition hover:border-cyan-400/40"><RotateCcw className="h-4 w-4 text-cyan-300" />My returns</Link></div>{loading ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Loading your orders...</p> : error ? <div className="mt-8 rounded-[24px] border border-red-400/30 bg-red-400/10 p-8 text-center"><p className="text-sm text-red-200" role="alert">{error}</p><Button type="button" variant="ghost" className="mt-5" onClick={() => void loadOrders()}><RefreshCw className="mr-2 h-4 w-4" />Retry</Button></div> : orders.length === 0 ? <EmptyState icon={Package} title="No orders yet" copy="Your completed Dream Spex purchases will appear here with their product details and delivery status." to="/shop" action="Explore eyewear" /> : <div className="mt-8 grid gap-5">{orders.map((order) => {
    const orderReturns = returns.filter((entry) => entry.orderId === order.id);
    const eligibility = returnEligibility[order.id] ?? null;
    return <article key={order.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-6 transition hover:border-cyan-400/40"><Link to={`/orders/${encodeURIComponent(order.id)}`} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-cyan-400"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{order.orderNumber}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{new Date(order.createdAt).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</p></div><p className="text-lg font-semibold text-[var(--text-primary)]">{formatINR(order.total)}</p></div><div className="mt-5 grid gap-2 text-sm text-[var(--text-secondary)] sm:grid-cols-2"><p>{order.items.reduce((total, item) => total + item.quantity, 0)} item{order.items.reduce((total, item) => total + item.quantity, 0) === 1 ? '' : 's'} · {order.items.map((item) => item.productName).join(', ')}</p><p className="sm:text-right"><span className="text-[var(--text-primary)]">Payment:</span> {order.paymentStatus} · <span className="text-[var(--text-primary)]">Order:</span> {order.status}</p></div></Link>{orderReturns.map((entry) => <div key={entry.id} className="mt-4 rounded-xl bg-[var(--bg-primary)] p-4 text-sm"><p className="font-semibold">Return {entry.requestNumber} · {entry.status.replaceAll('_', ' ')}</p>{entry.refunds.map((refund, index) => <p key={`${refund.createdAt}-${index}`} className="mt-2 text-[var(--text-secondary)]">Refund {formatINR(refund.amount)} · {refund.status.replaceAll('_', ' ')} · Razorpay reference: {refund.providerRefundId ?? 'Pending'}</p>)}</div>)}
      {order.status === 'DELIVERED' && order.paymentStatus === 'PAID' ? <div className="mt-5 space-y-3">{order.items.map((item) => {
        const action = getOrderItemReturnAction(eligibility, orderReturns, item.id);
        return <div key={item.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-[var(--bg-primary)] p-4 text-sm">
          <div><p className="font-medium">{item.productName} · Qty {item.quantity}</p>{action.statusLabel ? <p className="mt-1 text-xs text-[var(--text-secondary)]">{action.statusLabel}</p> : null}</div>
          {action.canRequest ? <Link to={`/returns/new?orderId=${encodeURIComponent(order.id)}`} className="inline-flex items-center gap-2 rounded-full bg-[var(--brand-green)] px-4 py-2.5 text-sm font-semibold text-[#101810]"><RotateCcw className="h-4 w-4" />Return / Replace{action.remainingQuantity < item.quantity ? ` · ${action.remainingQuantity} remaining` : ''}</Link> : null}
        </div>;
      })}</div> : null}</article>;
  })}</div>}</AccountShell>;
}

export function WalletPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!user?.accessToken) { setLoading(false); setError('Your session has expired.'); return () => { active = false; }; }
    loyaltyService.wallet(user.accessToken).then((value) => { if (active) setWallet(value); })
      .catch((reason: unknown) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load your wallet.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [user?.accessToken]);
  return <AccountShell><SectionTitle eyebrow="Wallet" title="Your Dream Spex wallet" description="View wallet credits earned through eligible referral rewards." />
    <div className="mt-10 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-[28px] border border-cyan-400/30 bg-cyan-400/10 p-8"><WalletCards className="h-8 w-8 text-cyan-300" /><p className="mt-8 text-sm text-[var(--text-secondary)]">Current balance</p><p className="mt-2 text-5xl font-semibold text-[var(--text-primary)]">{loading ? '…' : formatINR(wallet?.balance ?? 0)}</p>
        <p className="mt-4 text-sm text-[var(--text-secondary)]">Total credited {formatINR(wallet?.totalCredited ?? 0)}</p>
      </section>
      <section className="rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8"><h2 className="text-xl font-semibold text-[var(--text-primary)]">Transaction history</h2>
        {error ? <p className="mt-5 text-sm text-rose-300" role="alert">{error}</p> : loading ? <p className="mt-5 text-sm text-[var(--text-secondary)]">Loading wallet activity...</p>
          : wallet?.transactions.length ? <div className="mt-5 divide-y divide-[var(--border-subtle)]">{wallet.transactions.map((transaction, index) => <div key={`${transaction.createdAt}-${index}`} className="flex justify-between gap-4 py-4 text-sm">
            <div><p>{transaction.description}</p><p className="mt-1 text-xs text-[var(--text-secondary)]">{new Date(transaction.createdAt).toLocaleDateString('en-IN')}</p></div>
            <span className={transaction.amount >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{formatINR(transaction.amount)}</span>
          </div>)}</div> : <p className="mt-6 text-sm text-[var(--text-secondary)]">No wallet transactions yet. Referral wallet rewards will appear here when a referral qualifies.</p>}
      </section>
    </div>
  </AccountShell>;
}

export function WishlistPage() {
  const { wishlist, removeFromWishlist, addToCart } = useShop();
  return <AccountShell><SectionTitle eyebrow="Wishlist" title="Saved pieces for later" description="Keep your favourite frames in one place and revisit them anytime." />{wishlist.length === 0 ? <EmptyState icon={Heart} title="Your wishlist is empty" copy="Explore the collection and save the frames that catch your eye." to="/shop" action="Browse frames" /> : <div className="mt-8 grid gap-6 lg:grid-cols-2">{wishlist.map((product) => <article key={product.id} className="rounded-[24px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-5 backdrop-blur-xl"><div className="flex gap-5"><img src={product.image} alt={product.name} className="h-28 w-28 rounded-2xl object-cover" /><div className="min-w-0 flex-1"><p className="text-xs uppercase tracking-[0.25em] text-cyan-300">{product.category}</p><h2 className="mt-2 text-xl font-semibold text-[var(--text-primary)]">{product.name}</h2><p className="mt-2 text-lg font-semibold text-[var(--text-primary)]">{formatINR(product.price)}</p></div></div><div className="mt-5 flex gap-3"><button type="button" onClick={() => { addToCart(product); removeFromWishlist(product.id); }} className="flex-1 rounded-full bg-gradient-to-r from-cyan-400 to-blue-600 px-4 py-3 text-sm font-semibold text-[var(--text-primary)]">Add to cart</button><button type="button" onClick={() => removeFromWishlist(product.id)} className="rounded-full border border-[var(--border-subtle)] px-4 py-3 text-sm font-semibold text-[var(--text-secondary)]">Remove</button></div></article>)}</div>}</AccountShell>;
}

export function AccountPage() {
  const { user, refreshSession } = useAuth();
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [form, setForm] = useState<CustomerProfileUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);
  const [consentSaving, setConsentSaving] = useState(false);
  const [consentError, setConsentError] = useState('');
  const [consentNotice, setConsentNotice] = useState('');
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [addressSaving, setAddressSaving] = useState(false);
  const [addressError, setAddressError] = useState('');
  const [addressNotice, setAddressNotice] = useState('');
  const [editingAddressId, setEditingAddressId] = useState<string | null>(null);
  const [addressForm, setAddressForm] = useState<CustomerAddressRequest>(emptyAddress());
  const [phoneInput, setPhoneInput] = useState('');

  const loadProfile = useCallback(async () => {
    if (!user?.accessToken) {
      setError('Your session has expired. Please sign in again.');
      setLoading(false);
      return;
    }
    try {
      let accessToken = user.accessToken;
      try {
        const nextProfile = await profileService.get(accessToken);
        setProfile(nextProfile);
        setFormFromProfile(nextProfile);
      } catch (reason) {
        if (!(reason instanceof ProfileApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        const nextProfile = await profileService.get(accessToken);
        setProfile(nextProfile);
        setFormFromProfile(nextProfile);
      }
      setError('');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load your profile.');
    } finally {
      setLoading(false);
    }
  }, [refreshSession, user?.accessToken]);

  const setFormFromProfile = (nextProfile: CustomerProfile) => {
    setForm({
      displayName: nextProfile.displayName,
      firstName: nextProfile.firstName ?? '',
      lastName: nextProfile.lastName ?? '',
      dateOfBirth: nextProfile.dateOfBirth ?? '',
      gender: nextProfile.gender ?? '',
      marketingOptIn: nextProfile.marketingOptIn,
    });
  };

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  const loadAddresses = useCallback(async () => {
    if (!user?.accessToken) {
      setAddressError('Your session has expired. Please sign in again.');
      setAddressesLoading(false);
      return;
    }
    try {
      let accessToken = user.accessToken;
      try {
        setAddresses(await addressService.list(accessToken));
      } catch (reason) {
        if (!(reason instanceof AddressApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        setAddresses(await addressService.list(accessToken));
      }
      setAddressError('');
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : 'Unable to load your addresses.');
    } finally {
      setAddressesLoading(false);
    }
  }, [refreshSession, user?.accessToken]);

  useEffect(() => {
    void loadAddresses();
  }, [loadAddresses]);

  const updateField = (key: keyof CustomerProfileUpdate, value: string | boolean) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const updateWhatsappConsent = async (optedIn: boolean) => {
    if (!profile || !user?.accessToken) {
      setConsentError('Your session has expired. Please sign in again.');
      return;
    }
    const confirmation = optedIn
      ? 'Please confirm: you agree to receive promotional offers, discounts, and campaign messages from Dream Spex on WhatsApp. You can withdraw consent at any time.'
      : 'Withdraw your consent to receive WhatsApp marketing messages?';
    if (!window.confirm(confirmation)) return;

    setConsentSaving(true);
    setConsentError('');
    setConsentNotice('');
    try {
      let accessToken = user.accessToken;
      let nextProfile: CustomerProfile;
      try {
        nextProfile = await profileService.updateWhatsappMarketingConsent(accessToken, optedIn);
      } catch (reason) {
        if (!(reason instanceof ProfileApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        nextProfile = await profileService.updateWhatsappMarketingConsent(accessToken, optedIn);
      }
      setProfile(nextProfile);
      setConsentNotice(optedIn ? 'WhatsApp marketing consent enabled.' : 'WhatsApp marketing consent withdrawn.');
      if ('BroadcastChannel' in window) {
        const channel = new BroadcastChannel('dream-spex-marketing-consent');
        channel.postMessage('consent-updated');
        channel.close();
      }
    } catch (reason) {
      setConsentError(reason instanceof Error ? reason.message : 'Unable to update WhatsApp marketing consent.');
    } finally {
      setConsentSaving(false);
    }
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!form.displayName?.trim()) {
      setError('Display name is required.');
      return;
    }
    if (!user?.accessToken) {
      setError('Your session has expired. Please sign in again.');
      return;
    }
    setSaving(true);
    setSaved(false);
    setError('');
    try {
      let accessToken = user.accessToken;
      let nextProfile: CustomerProfile;
      const payload: CustomerProfileUpdate = {
        ...form,
        dateOfBirth: form.dateOfBirth || undefined,
      };
      try {
        nextProfile = await profileService.update(accessToken, payload);
      } catch (reason) {
        if (!(reason instanceof ProfileApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        nextProfile = await profileService.update(accessToken, payload);
      }
      setProfile(nextProfile);
      setFormFromProfile(nextProfile);
      setSaved(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to save your profile.');
    } finally {
      setSaving(false);
    }
  };

  const updateAddressField = (key: Exclude<keyof CustomerAddressRequest, 'latitude' | 'longitude'>, value: string | boolean) => {
    setAddressForm((current) => ({ ...current, [key]: value }));
    setAddressNotice('');
  };

  const editAddress = (address: CustomerAddress) => {
    const savedPhone = phoneInputFromSavedAddress(address.phone, address.countryCode);
    setEditingAddressId(address.id);
    setAddressForm({
      label: address.label ?? '',
      recipientName: address.recipientName,
      phone: '',
      line1: address.line1,
      line2: address.line2 ?? '',
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      countryCode: savedPhone.countryCode,
      defaultAddress: address.defaultAddress,
      latitude: address.latitude,
      longitude: address.longitude,
    });
    setPhoneInput(savedPhone.phone);
    setAddressError('');
    setAddressNotice('');
  };

  const saveAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    const requiredFields: Array<keyof CustomerAddressRequest> = ['recipientName', 'line1', 'city', 'state', 'postalCode', 'countryCode'];
    if (requiredFields.some((field) => !String(addressForm[field]).trim())) {
      setAddressError('Recipient, phone, address, city, state, postal code and country are required.');
      return;
    }
    const phone = formatPhoneInput(phoneInput, addressForm.countryCode);
    if (!phone) {
      setAddressError('Enter a valid phone number for the selected country.');
      return;
    }
    if ((addressForm.latitude === null) !== (addressForm.longitude === null)
        || (addressForm.latitude !== null && addressForm.longitude !== null
          && !isValidCoordinates(addressForm.latitude, addressForm.longitude))) {
      setAddressError('Choose a valid map location with latitude from -90 to 90 and longitude from -180 to 180.');
      return;
    }
    if (!user?.accessToken) {
      setAddressError('Your session has expired. Please sign in again.');
      return;
    }
    setAddressSaving(true);
    setAddressError('');
    setAddressNotice('');
    const payload = {
      ...addressForm,
      label: addressForm.label.trim(),
      recipientName: addressForm.recipientName.trim(),
      phone: phone.phone,
      line1: addressForm.line1.trim(),
      line2: addressForm.line2.trim(),
      city: addressForm.city.trim(),
      state: addressForm.state.trim(),
      postalCode: addressForm.postalCode.trim(),
      countryCode: resolveCountryCode(addressForm.countryCode),
    };
    try {
      let accessToken = user.accessToken;
      try {
        if (editingAddressId) await addressService.update(accessToken, editingAddressId, payload);
        else await addressService.create(accessToken, payload);
      } catch (reason) {
        if (!(reason instanceof AddressApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        if (editingAddressId) await addressService.update(accessToken, editingAddressId, payload);
        else await addressService.create(accessToken, payload);
      }
      setAddressForm(emptyAddress());
      setPhoneInput('');
      setEditingAddressId(null);
      setAddressNotice(editingAddressId ? 'Address updated successfully.' : 'Address added successfully.');
      await loadAddresses();
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : 'Unable to save your address.');
    } finally {
      setAddressSaving(false);
    }
  };

  const deleteAddress = async (address: CustomerAddress) => {
    if (!window.confirm(`Delete the address for ${address.recipientName}?`)) return;
    if (!user?.accessToken) {
      setAddressError('Your session has expired. Please sign in again.');
      return;
    }
    setAddressError('');
    setAddressNotice('');
    try {
      let accessToken = user.accessToken;
      try {
        await addressService.remove(accessToken, address.id);
      } catch (reason) {
        if (!(reason instanceof AddressApiError) || reason.status !== 401 || !(await refreshSession())) throw reason;
        const stored = JSON.parse(window.localStorage.getItem('dream-spex-auth-session') ?? '{}') as { accessToken?: string };
        accessToken = stored.accessToken ?? accessToken;
        await addressService.remove(accessToken, address.id);
      }
      if (editingAddressId === address.id) {
        setEditingAddressId(null);
        setAddressForm(emptyAddress());
        setPhoneInput('');
      }
      setAddressNotice('Address deleted successfully.');
      await loadAddresses();
    } catch (reason) {
      setAddressError(reason instanceof Error ? reason.message : 'Unable to delete your address.');
    }
  };

  return <AccountShell><SectionTitle eyebrow="Account settings" title="Your account details" description="Keep your contact information and preferences up to date." /><form onSubmit={submit} className="mx-auto mt-10 max-w-3xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl">{loading ? <p className="text-sm text-[var(--text-secondary)]">Loading your profile...</p> : <><div className="grid gap-5 sm:grid-cols-2"><ProfileInput label="Display name" value={form.displayName ?? ''} onChange={(value) => updateField('displayName', value)} /><ProfileInput label="First name" value={form.firstName ?? ''} onChange={(value) => updateField('firstName', value)} /><ProfileInput label="Last name" value={form.lastName ?? ''} onChange={(value) => updateField('lastName', value)} /><ProfileInput label="Date of birth" type="date" value={form.dateOfBirth ?? ''} onChange={(value) => updateField('dateOfBirth', value)} /><ProfileInput label="Gender" value={form.gender ?? ''} onChange={(value) => updateField('gender', value)} /><ProfileInput label="Email" value={profile?.email ?? ''} onChange={() => undefined} disabled /><ProfileInput label="Phone" value={profile?.phone ?? ''} onChange={() => undefined} disabled /></div>  <label className="mt-5 flex items-center gap-3 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={Boolean(form.marketingOptIn)} onChange={(event) => updateField('marketingOptIn', event.target.checked)} /> Receive marketing updates</label><label className="mt-3 flex items-start gap-3 text-sm text-[var(--text-secondary)]"><input className="mt-1" type="checkbox" checked={Boolean(profile?.whatsappMarketingOptIn)} disabled={consentSaving || !profile} onChange={(event) => void updateWhatsappConsent(event.target.checked)} /> Receive promotional offers, discounts, and campaign messages from Dream Spex on WhatsApp. Turning this on requires confirmation; you can withdraw consent at any time.</label>{consentSaving ? <p className="mt-2 text-sm text-[var(--text-secondary)]">Updating WhatsApp consent...</p> : null}{consentError ? <p className="mt-2 text-sm text-red-600" role="alert">{consentError}</p> : null}{consentNotice ? <p className="mt-2 text-sm text-cyan-300" role="status">{consentNotice}</p> : null}<div className="mt-6 flex items-center gap-3"><Settings className="h-5 w-5 text-cyan-300" /><h2 className="font-semibold text-[var(--text-primary)]">Security</h2></div><Link to="/forgot-password" className="mt-4 inline-flex text-sm font-semibold text-cyan-300">Change password</Link><Button type="submit" fullWidth className="mt-8" disabled={saving}>{saving ? 'Saving...' : 'Save changes'}</Button>{error ? <p className="mt-4 text-sm text-red-600" role="alert">{error}</p> : null}{saved ? <p className="mt-4 flex items-center justify-center gap-2 text-sm text-cyan-300"><CheckCircle className="h-4 w-4" /> Changes saved</p> : null}</>}</form><section className="mx-auto mt-8 max-w-3xl rounded-[28px] border border-[var(--border-subtle)] bg-[var(--bg-card)] p-8 backdrop-blur-xl"><div className="flex items-center justify-between gap-4"><div><p className="text-sm uppercase tracking-[0.3em] text-cyan-300">Saved addresses</p><h2 className="mt-2 text-2xl font-semibold text-[var(--text-primary)]">Delivery addresses</h2></div><Button type="button" variant="ghost" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddress()); setPhoneInput(''); setAddressError(''); setAddressNotice(''); }}>Add address</Button></div>{addressesLoading ? <p className="mt-6 text-sm text-[var(--text-secondary)]">Loading addresses...</p> : addresses.length === 0 ? <p className="mt-6 text-sm text-[var(--text-secondary)]">No saved addresses yet.</p> : <div className="mt-6 grid gap-4">{addresses.map((address) => <article key={address.id} className="rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-5"><div className="flex items-start justify-between gap-4"><div><p className="font-semibold text-[var(--text-primary)]">{address.label || 'Address'} {address.defaultAddress ? <span className="ml-2 text-xs uppercase tracking-[0.2em] text-cyan-300">Default</span> : null}</p><p className="mt-2 text-sm text-[var(--text-secondary)]">{address.recipientName} · {address.phone}</p><p className="mt-1 text-sm text-[var(--text-secondary)]">{address.line1}{address.line2 ? `, ${address.line2}` : ''}, {address.city}, {address.state} {address.postalCode}, {address.countryCode}</p></div><div className="flex gap-2"><Button type="button" variant="ghost" onClick={() => editAddress(address)}>Edit</Button><Button type="button" variant="ghost" onClick={() => void deleteAddress(address)}>Delete</Button></div></div></article>)}</div>}<form onSubmit={saveAddress} className="mt-8 border-t border-[var(--border-subtle)] pt-8"><h3 className="text-lg font-semibold text-[var(--text-primary)]">{editingAddressId ? 'Edit address' : 'Add an address'}</h3><div className="mt-4 grid gap-4 sm:grid-cols-2"><ProfileInput label="Label" value={addressForm.label} onChange={(value) => updateAddressField('label', value)} /><ProfileInput label="Recipient name" value={addressForm.recipientName} onChange={(value) => updateAddressField('recipientName', value)} /><PhoneCountryInput selectedCountryCode={addressForm.countryCode} phone={phoneInput} onPhoneChange={setPhoneInput} onCountryChange={(value) => updateAddressField('countryCode', value)} /><ProfileInput label="Address line 1" value={addressForm.line1} onChange={(value) => updateAddressField('line1', value)} /><ProfileInput label="Address line 2" value={addressForm.line2} onChange={(value) => updateAddressField('line2', value)} /><ProfileInput label="City" value={addressForm.city} onChange={(value) => updateAddressField('city', value)} /><ProfileInput label="State" value={addressForm.state} onChange={(value) => updateAddressField('state', value)} /><ProfileInput label="Postal code" value={addressForm.postalCode} onChange={(value) => updateAddressField('postalCode', value)} /></div><label className="mt-4 flex items-center gap-3 text-sm text-[var(--text-secondary)]"><input type="checkbox" checked={addressForm.defaultAddress} onChange={(event) => updateAddressField('defaultAddress', event.target.checked)} /> Make this my default address</label><div className="mt-4 flex gap-3"><Button type="submit" disabled={addressSaving}>{addressSaving ? 'Saving...' : editingAddressId ? 'Update address' : 'Save address'}</Button>{editingAddressId ? <Button type="button" variant="ghost" onClick={() => { setEditingAddressId(null); setAddressForm(emptyAddress()); setPhoneInput(''); }}>Cancel</Button> : null}</div>{addressError ? <p className="mt-4 text-sm text-red-600" role="alert">{addressError}</p> : null}{addressNotice ? <p className="mt-4 flex items-center gap-2 text-sm text-cyan-300"><CheckCircle className="h-4 w-4" />{addressNotice}</p> : null}</form></section></AccountShell>;
}

function emptyAddress(): CustomerAddressRequest {
  return { label: '', recipientName: '', phone: '', line1: '', line2: '', city: '', state: '', postalCode: '', countryCode: 'IN', defaultAddress: false, latitude: null, longitude: null };
}

function ProfileInput({ label, value, onChange, type = 'text', disabled = false }: { label: string; value: string; onChange: (value: string) => void; type?: string; disabled?: boolean }) {
  return <label className="text-sm text-[var(--text-secondary)]"><span>{label}</span><input type={type} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled} className="mt-2 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none disabled:cursor-not-allowed disabled:opacity-60" /></label>;
}

function PhoneCountryInput({
  selectedCountryCode,
  phone,
  onPhoneChange,
  onCountryChange,
}: {
  selectedCountryCode: string;
  phone: string;
  onPhoneChange: (value: string) => void;
  onCountryChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const country = phoneCountries.find((item) => item.code === resolveCountryCode(selectedCountryCode))
    ?? phoneCountries.find((item) => item.code === 'IN')!;
  const filteredCountries = phoneCountries.filter((item) =>
    `${item.name} ${item.code} +${item.callingCode}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));

  return <div className="min-w-0 text-sm text-[var(--text-secondary)]">
    <span>Phone</span>
    <div className="mt-2 grid grid-cols-[minmax(0,0.85fr)_minmax(0,1.35fr)] gap-2">
      <div className="relative min-w-0">
        <button
          type="button"
          aria-label={`Calling code: ${country.name}, +${country.callingCode}`}
          aria-expanded={open}
          onClick={() => { setOpen((value) => !value); setQuery(''); }}
          className="flex min-h-12 w-full items-center justify-between gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 text-[var(--text-primary)] outline-none focus:border-[#7CBF00]"
        >
          <span className="flex min-w-0 items-center gap-1.5"><span aria-hidden="true">{country.flag}</span><span className="truncate">+{country.callingCode}</span></span>
          <span aria-hidden="true" className="text-xs">⌄</span>
        </button>
        {open ? <div className="absolute left-0 top-full z-30 mt-2 w-[min(22rem,calc(100vw-3rem))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-card)] p-2 shadow-xl">
          <input
            type="search"
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search countries"
            aria-label="Search countries"
            className="w-full rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[#7CBF00]"
          />
          <ul role="listbox" aria-label="Countries" className="mt-2 max-h-56 overflow-y-auto">
            {filteredCountries.map((item) => <li key={item.code}>
              <button
                type="button"
                role="option"
                aria-selected={item.code === country.code}
                onClick={() => { onCountryChange(item.code); setOpen(false); setQuery(''); }}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm text-[var(--text-primary)] hover:bg-[#7CBF00]/15"
              >
                <span aria-hidden="true">{item.flag}</span><span className="min-w-0 flex-1 truncate">{item.name}</span><span className="text-[var(--text-secondary)]">+{item.callingCode}</span>
              </button>
            </li>)}
            {filteredCountries.length === 0 ? <li className="px-3 py-3 text-sm text-[var(--text-secondary)]">No countries found.</li> : null}
          </ul>
        </div> : null}
      </div>
      <input
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={phone}
        onChange={(event) => onPhoneChange(event.target.value)}
        aria-label={`Phone number for ${country.name}`}
        placeholder="Phone number"
        className="min-h-12 min-w-0 w-full rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 text-sm text-[var(--text-primary)] outline-none focus:border-[#7CBF00]"
      />
    </div>
  </div>;
}
