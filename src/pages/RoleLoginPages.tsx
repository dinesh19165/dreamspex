import { useEffect, useState } from 'react';
import { ArrowRight, Camera, Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import BrandLogo from '../components/ui/BrandLogo';
import { useAuth } from '../context/useAuth';
import { mockDemoCredentials, getMockFranchiseUserByEmail } from '../data/mockAuth';

const CUSTOMER_PROMO = 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1400&q=80';

function CustomerPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen overflow-hidden px-3 py-2 sm:px-4 lg:px-5 bg-[#f3efe8] text-[#1a221b]">
      <div className="mx-auto max-w-[1520px] overflow-hidden rounded-[34px] border border-[#dfe4d5] bg-[#f6f3ee] shadow-[0_32px_90px_rgba(17,24,39,0.12)]">
        <div className="grid min-h-[calc(100vh-1rem)] grid-cols-1 lg:grid-cols-[1.45fr_1fr]">
          <div className="relative block overflow-hidden bg-[var(--bg-secondary)] lg:block">
            <div className="relative h-[270px] overflow-hidden md:h-[320px] lg:h-full lg:min-h-[680px]">
              <img
                src={CUSTOMER_PROMO}
                alt="Premium eyewear lifestyle"
                className="absolute inset-0 h-full w-full object-cover object-center"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(244,239,232,0.74),rgba(244,239,232,0.42),rgba(244,239,232,0.18))]" />

              <div className="relative z-10 flex h-full flex-col justify-between p-4 sm:p-6 lg:p-6 xl:p-8">
                <div className="max-w-[180px] bg-transparent">
                  <BrandLogo compact />
                </div>

                <div className="max-w-[580px] pb-2">
                  <h1 className="max-w-[420px] text-[clamp(2.5rem,4vw,3.75rem)] font-semibold leading-[0.96] tracking-[-0.06em] text-[#17211a]">
                    Glasses that<br />
                    define your<br />
                    <span className="text-[var(--brand-green)]">everyday style.</span>
                  </h1>

                  <p className="mt-3 max-w-md text-sm leading-6 text-[#2d4033] sm:text-base">
                    Curated frames, expert guidance and premium care designed around your look.
                  </p>

                  <div className="mt-5 flex flex-wrap items-center gap-3 md:gap-4">
                    { [
                      { icon: Sparkles, label: 'Premium\nFrames' },
                      { icon: Camera, label: 'Virtual\nTry-On' },
                      { icon: ShieldCheck, label: 'Free\nConsultation' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex min-w-[92px] flex-col items-center gap-2 text-center text-[#17211a]">
                        <div className="flex h-11 w-11 items-center justify-center rounded-full border border-[#1d2a1d]/20 bg-[#f4faf0]/80 shadow-[0_10px_30px_rgba(0,0,0,0.06)]">
                          <Icon className="h-4 w-4 text-[#17211a]" />
                        </div>
                        <span className="whitespace-pre-line text-center text-[11px] font-medium leading-4">{label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="relative flex items-center justify-center bg-[#f8f6f2] px-4 py-4 sm:px-6 lg:px-7">
            <div className="absolute -left-10 top-8 h-24 w-24 rounded-full bg-[#dfead1]/80 blur-2xl" />
            <div className="absolute -right-10 bottom-6 h-28 w-28 rounded-full bg-[#dfead1]/80 blur-2xl" />

            <div className="relative z-10 w-full max-w-[470px] rounded-[28px] border border-[#e0e7d8] bg-[#f9f8f5] p-4 shadow-[0_20px_50px_rgba(15,23,42,0.08)] sm:p-6">
              <div className="mb-5 flex items-center justify-center">
                <div className="max-w-[150px]">
                  <BrandLogo compact />
                </div>
              </div>

              <div className="mb-6 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-green)]">WELCOME BACK</p>
                <h2 className="mt-3 text-[clamp(2rem,2.6vw,2.5rem)] font-semibold tracking-[-0.04em] text-[#1b251a]">Sign in to Dream Spex</h2>
                <p className="mt-2 text-sm text-[#536456]">Discover eyewear that fits your style.</p>
              </div>

              {children}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminPortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#efefeb] px-4 py-3 text-[#17211a] sm:px-6 lg:px-8">
      <div className="w-full max-w-[560px] rounded-[30px] border border-[#e4e8df] bg-[#f5f5f3] p-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex justify-center">
          <div className="max-w-[200px]">
            <BrandLogo compact />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-green)]">ADMIN PORTAL</p>
          <h1 className="mt-4 text-[clamp(2.2rem,3vw,2.8rem)] font-semibold tracking-[-0.05em] text-[#1a221c]">Admin Login</h1>
          <p className="mt-2 text-sm text-[#58675d]">Sign in to access the administrative dashboard.</p>
        </div>

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function FranchisePortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#efefeb] px-4 py-3 text-[#17211a] sm:px-6 lg:px-8">
      <div className="w-full max-w-[560px] rounded-[30px] border border-[#e4e8df] bg-[#f5f5f3] p-5 shadow-[0_28px_60px_rgba(15,23,42,0.08)] sm:p-6">
        <div className="mb-5 flex justify-center">
          <div className="max-w-[200px]">
            <BrandLogo compact />
          </div>
        </div>

        <div className="text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-green)]">FRANCHISE ADMIN PORTAL</p>
          <h1 className="mt-4 text-[clamp(2.1rem,2.8vw,2.8rem)] font-semibold tracking-[-0.05em] text-[#1a221c]">Franchise Admin Login</h1>
          <p className="mt-2 text-sm text-[#58675d]">Sign in to manage your franchise store.</p>
        </div>

        <div className="mt-6">
          {children}
        </div>
      </div>
    </div>
  );
}

function RoleLoginForm({
  kind,
  onSubmit,
}: {
  kind: 'customer' | 'franchise' | 'admin';
  onSubmit: (email: string, password: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter both email and password.');
      return;
    }

    setLoading(true);
    await new Promise((resolve) => window.setTimeout(resolve, 500));
    setLoading(false);

    try {
      onSubmit(email.trim(), password.trim());
      if (rememberMe) {
        window.localStorage.setItem('dream-spex-remember-me', email.trim());
      } else {
        window.localStorage.removeItem('dream-spex-remember-me');
      }
    } catch {
      setError('Invalid demo credentials.');
    }
  };

  return (
    <form className="space-y-4" onSubmit={handleSubmit} noValidate>
      <label className="block text-sm text-[var(--text-secondary)]">
        <span className="mb-2 inline-block">Email</span>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3">
          <Mail className="h-4 w-4 text-[var(--brand-green)]" />
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            autoComplete="email"
            placeholder="Enter your email"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
        </div>
      </label>

      <label className="block text-sm text-[var(--text-secondary)]">
        <span className="mb-2 inline-block">Password</span>
        <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3">
          <Lock className="h-4 w-4 text-[var(--brand-green)]" />
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="Enter your password"
            className="w-full bg-transparent text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-secondary)]"
          />
          <button type="button" onClick={() => setShowPassword((current) => !current)} className="text-[var(--text-secondary)]" aria-label="Toggle password visibility">
            {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </label>

      <div className="flex items-center justify-between gap-3 text-sm text-[var(--text-secondary)]">
        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={rememberMe} onChange={() => setRememberMe((current) => !current)} className="h-4 w-4 accent-[var(--brand-green)]" />
          <span>Remember Me</span>
        </label>
        <Link to="/forgot-password" className="font-medium text-[var(--brand-green)]">Forgot Password?</Link>
      </div>

      {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-700">{error}</p> : null}
      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-[linear-gradient(135deg,#9ecf4d_0%,#7cae2e_100%)] px-5 py-3 text-base font-semibold text-[#172015] shadow-[0_18px_42px_rgba(131,188,58,0.28)] transition hover:-translate-y-0.5 hover:bg-[#90ca41] disabled:cursor-not-allowed disabled:opacity-75">
        {loading ? 'Logging in...' : 'Login'}
        {!loading ? <ArrowRight className="h-4 w-4" /> : null}
      </button>

      <div className="flex items-center justify-between gap-3 pt-1 text-sm text-[var(--text-secondary)]">
        <Link to="/" className="font-medium text-[var(--text-secondary)]">Back to Dream Spex</Link>
        {kind === 'customer' ? <Link to="/register" className="font-medium text-[var(--brand-green)]">Create account</Link> : null}
      </div>
    </form>
  );
}

export function CustomerLoginPage() {
  const navigate = useNavigate();
  const { loginAsCustomer, isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (isAuthenticated && role === 'CUSTOMER') {
      navigate('/', { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  return (
    <CustomerPortalLayout>
      <RoleLoginForm
        kind="customer"
        onSubmit={(email, password) => {
          const valid = email.toLowerCase() === mockDemoCredentials.customer.email && password === mockDemoCredentials.customer.password;
          if (!valid) {
            throw new Error('Invalid customer credentials');
          }
          loginAsCustomer();
          navigate('/', { replace: true });
        }}
      />
    </CustomerPortalLayout>
  );
}

export function FranchiseLoginPage() {
  const navigate = useNavigate();
  const { loginAsFranchiseAdmin, isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (isAuthenticated && role === 'FRANCHISE_ADMIN') {
      navigate('/franchise/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  return (
    <FranchisePortalLayout>
      <RoleLoginForm
        kind="franchise"
        onSubmit={(email, password) => {
          const franchiseUser = getMockFranchiseUserByEmail(email);
          const valid = franchiseUser && email.toLowerCase() === mockDemoCredentials.franchise.email && password === mockDemoCredentials.franchise.password;
          if (!valid) {
            throw new Error('Invalid franchise credentials');
          }
          loginAsFranchiseAdmin(franchiseUser.franchiseId);
          navigate('/franchise/dashboard', { replace: true });
        }}
      />
    </FranchisePortalLayout>
  );
}

export function AdminLoginPage() {
  const navigate = useNavigate();
  const { loginAsSuperAdmin, isAuthenticated, role } = useAuth();

  useEffect(() => {
    if (isAuthenticated && role === 'SUPER_ADMIN') {
      navigate('/admin/dashboard', { replace: true });
    }
  }, [isAuthenticated, navigate, role]);

  return (
    <AdminPortalLayout>
      <RoleLoginForm
        kind="admin"
        onSubmit={(email, password) => {
          const valid = email.toLowerCase() === mockDemoCredentials.admin.email && password === mockDemoCredentials.admin.password;
          if (!valid) {
            throw new Error('Invalid admin credentials');
          }
          loginAsSuperAdmin();
          navigate('/admin/dashboard', { replace: true });
        }}
      />
    </AdminPortalLayout>
  );
}

export function DemoAccessBadge() {
  return (
    <div className="flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] px-3 py-2 text-xs font-medium text-[var(--brand-green)]">
      <ShieldCheck className="h-4 w-4" />
      DEMO ACCOUNT
    </div>
  );
}
