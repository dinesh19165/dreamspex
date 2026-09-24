import { useEffect, useState } from 'react';
import { Eye, EyeOff, Lock, Mail, ShieldCheck, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/useAuth';
import { mockDemoCredentials, getMockFranchiseUserByEmail } from '../data/mockAuth';

function LoginShell({
  title,
  subtitle,
  accent,
  children,
}: {
  title: string;
  subtitle: string;
  accent: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-[var(--bg-primary)] px-4 py-10 text-[var(--text-primary)] sm:px-6">
      <div className="mx-auto max-w-6xl overflow-hidden rounded-[32px] border border-[var(--border-subtle)] bg-[var(--bg-card)] shadow-2xl shadow-black/20">
        <div className="grid min-h-[760px] lg:grid-cols-[1.1fr_0.9fr]">
          <div className={`relative hidden overflow-hidden lg:block ${accent}`}>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(255,255,255,0.2),_transparent_45%)]" />
            <div className="relative flex h-full flex-col justify-between p-10 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-white/70">Dream Spex</p>
                  <p className="mt-1 text-xl font-semibold">{title}</p>
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/70">DEMO ACCESS</p>
                <h1 className="mt-6 max-w-md text-5xl font-semibold leading-tight">Premium eyewear operations, simplified.</h1>
                <p className="mt-5 max-w-sm text-base leading-7 text-white/75">Frontend mock access only for demonstrating the customer, franchise, and admin experience.</p>
              </div>
              <div className="rounded-2xl border border-white/15 bg-white/5 p-4 backdrop-blur-sm">
                <p className="text-xs uppercase tracking-[0.25em] text-white/65">Demo credentials</p>
                <div className="mt-3 space-y-2 text-sm text-white/80">
                  <p>Customer: customer@dreamspex.com</p>
                  <p>Franchise: hyderabad@dreamspex.com</p>
                  <p>Super Admin: admin@dreamspex.com</p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center p-6 sm:p-10 lg:p-14">
            <div className="w-full max-w-md">
              <div className="mb-8">
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-[var(--brand-green)]">Dream Spex</p>
                <h2 className="mt-3 text-3xl font-semibold text-[var(--text-primary)]">{subtitle}</h2>
              </div>
              {children}
            </div>
          </div>
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
    <form className="space-y-5" onSubmit={handleSubmit} noValidate>
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
            autoComplete={kind === 'admin' ? 'current-password' : 'current-password'}
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
        <Link to={kind === 'customer' ? '/forgot-password' : kind === 'franchise' ? '/franchise/login' : '/admin/login'} className="font-medium text-[var(--brand-green)]">Forgot Password</Link>
      </div>

      {error ? <p className="rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p> : null}

      <button type="submit" disabled={loading} className="inline-flex w-full items-center justify-center rounded-full bg-[var(--brand-green)] px-5 py-3 text-sm font-semibold text-[#172015] transition hover:bg-[var(--brand-green-light)] disabled:cursor-not-allowed disabled:opacity-70">
        {loading ? 'Logging in...' : 'Login'}
      </button>

      <div className="flex items-center justify-between gap-3 pt-2 text-sm text-[var(--text-secondary)]">
        <Link to={kind === 'customer' ? '/register' : kind === 'franchise' ? '/franchise/login' : '/admin/login'} className="font-medium text-[var(--brand-green)]">
          {kind === 'customer' ? 'Create account' : 'Back to Dream Spex'}
        </Link>
        {kind === 'customer' ? <Link to="/" className="font-medium text-[var(--text-secondary)]">Back to Dream Spex</Link> : <Link to="/" className="font-medium text-[var(--text-secondary)]">Back to Dream Spex</Link> }
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
    <LoginShell title="Customer Login" subtitle="Welcome back to Dream Spex" accent="bg-[linear-gradient(135deg,_#0d1510,_#1d3227,_#182218)]">
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
    </LoginShell>
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
    <LoginShell title="Franchise" subtitle="Franchise Partner Login" accent="bg-[linear-gradient(135deg,_#13232d,_#173744,_#091c24)]">
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
    </LoginShell>
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
    <LoginShell title="Admin" subtitle="Super Admin Login" accent="bg-[linear-gradient(135deg,_#111827,_#1f2937,_#0f172a)]">
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
    </LoginShell>
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
