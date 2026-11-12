import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/auth/AuthLayout';
import PasswordField from '../components/auth/PasswordField';
import { authService } from '../services/authService';

export default function FranchiseSetupPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token) {
      setError('This setup link is incomplete. Ask your Super Admin to send a new invitation.');
      return;
    }
    if (password.length < 12) {
      setError('Use at least 12 characters for your password.');
      return;
    }
    if (password !== confirmation) {
      setError('The passwords do not match.');
      return;
    }
    setLoading(true);
    try {
      await authService.setupFranchisePassword(token, password);
      setComplete(true);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to set up your password.');
    } finally {
      setLoading(false);
    }
  };

  return <AuthLayout>
    <div className="mb-6 text-center">
      <p className="text-[10px] font-semibold uppercase tracking-[0.34em] text-[var(--brand-green-dark)]">FRANCHISE ACCOUNT</p>
      <h1 className="mt-3 text-3xl font-semibold tracking-tight text-[#1a221c]">Set up your password</h1>
      <p className="mt-2 text-sm text-[#58675d]">Create a secure password to access your franchise dashboard.</p>
    </div>
    {complete ? <div className="space-y-4 text-center">
      <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800" role="status">
        Your password is set. You can now sign in to your franchise account.
      </p>
      <Link to="/franchise/login" className="inline-flex rounded-full bg-[#15391f] px-5 py-3 text-sm font-semibold text-white">
        Go to franchise login
      </Link>
    </div> : <form onSubmit={submit} className="space-y-4">
      <PasswordField id="franchise-password" label="New password" value={password}
        onChange={setPassword} autoComplete="new-password" />
      <PasswordField id="franchise-password-confirm" label="Confirm password" value={confirmation}
        onChange={setConfirmation} autoComplete="new-password" />
      {error ? <p className="text-sm text-red-600" role="alert">{error}</p> : null}
      <button type="submit" disabled={loading || !token}
        className="w-full rounded-full bg-[#15391f] px-5 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60">
        {loading ? 'Setting password…' : 'Set password'}
      </button>
      <p className="text-center text-xs text-[#58675d]">This invitation link can only be used once and expires after 48 hours.</p>
    </form>}
  </AuthLayout>;
}
