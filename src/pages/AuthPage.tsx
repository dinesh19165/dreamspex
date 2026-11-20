import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Apple, ArrowRight, Mail } from 'lucide-react';
import AuthLayout from '../components/auth/AuthLayout';
import OtpVerification from '../components/auth/OtpVerification';
import PasswordField from '../components/auth/PasswordField';
import {
  authService,
  type RegistrationOtpChannel,
  type RegistrationOtpOptions,
  type RegistrationWidgetConfig,
} from '../services/authService';
import { useAuth } from '../context/useAuth';
import { intendedPath } from '../utils/authNavigation';
import { getTokenExpiration } from '../utils/authExpiration';
import { pendingProductActionPath } from '../utils/pendingProductAction';
import { formatPhoneInput, phoneCountries } from '../utils/customerAddressPhone';
import { isValidEmailOrIndianPhone } from '../utils/authIdentifier';

type Mode = 'login' | 'register' | 'forgot';
type Errors = Record<string, string>;

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const referralCodePattern = /^[A-Za-z0-9-]{1,32}$/;

function Field({ id, label, value, onChange, error, type = 'text', autoComplete, placeholder, icon }:
  { id: string; label: string; value: string; onChange: (value: string) => void; error?: string;
    type?: string; autoComplete?: string; placeholder?: string; icon?: React.ReactNode }) {
  return <div className="auth-field-wrap">
    <label htmlFor={id}>{label}</label>
    <div className="auth-input-wrap">
      {icon ? <span className="auth-input-icon" aria-hidden="true">{icon}</span> : null}
      <input id={id} type={type} value={value} placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)} autoComplete={autoComplete}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    </div>
    {error ? <span id={`${id}-error`} className="auth-error">{error}</span> : null}
  </div>;
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthenticated } = useAuth();
  const [step, setStep] = useState<'form' | 'otp' | 'reset' | 'success'>('form');
  const [loading, setLoading] = useState(false);
  const [otpOptionsLoading, setOtpOptionsLoading] = useState(false);
  const [otpOptions, setOtpOptions] = useState<RegistrationOtpOptions | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [challengeId, setChallengeId] = useState('');
  const [widgetConfig, setWidgetConfig] = useState<RegistrationWidgetConfig | null>(null);
  const [registrationChannel, setRegistrationChannel] = useState<RegistrationOtpChannel>('EMAIL');
  const [verificationChannel, setVerificationChannel] = useState<RegistrationOtpChannel>('EMAIL');
  const [phoneCountryCode, setPhoneCountryCode] = useState('IN');
  const [resetToken, setResetToken] = useState('');
  const [recoverySent, setRecoverySent] = useState(false);
  const [referralCode, setReferralCode] = useState(() => new URLSearchParams(location.search).get('ref') ?? '');
  const [form, setForm] = useState({
    identifier: '', name: '', email: '', phone: '', password: '', confirmPassword: '',
  });
  const setValue = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));
  const formattedPhone = formatPhoneInput(form.phone, phoneCountryCode)?.phone ?? '';
  const registrationChannels: RegistrationOtpChannel[] = [
    ...(otpOptions?.emailOtpEnabled ? ['EMAIL' as const] : []),
    ...(otpOptions?.mobileOtpEnabled && otpOptions.smsConfigured ? ['SMS' as const] : []),
  ];
  const identifier = mode === 'register'
    ? verificationChannel === 'EMAIL' ? form.email : formattedPhone
    : form.identifier;
  const maskedIdentifier = identifier.includes('@')
    ? `${identifier[0]}****${identifier.slice(identifier.indexOf('@'))}`
    : `******${identifier.replace(/\D/g, '').slice(-4)}`;

  useEffect(() => {
    let active = true;
    const resetParams = new URLSearchParams(location.search);
    const linkToken = resetParams.get('token') ?? '';
    setStep(mode === 'forgot' && linkToken ? 'reset' : 'form');
    setLoading(false);
    setErrors({});
    setChallengeId('');
    setWidgetConfig(null);
    setResetToken(linkToken);
    setRecoverySent(false);
    setOtpOptions(null);
    setOtpOptionsLoading(mode === 'register');
    setRegistrationChannel('EMAIL');
    setVerificationChannel('EMAIL');
    setPhoneCountryCode('IN');
    setForm({
      identifier: mode === 'forgot' ? resetParams.get('identifier') ?? '' : '',
      name: '', email: '', phone: '', password: '', confirmPassword: '',
    });
    setReferralCode(new URLSearchParams(location.search).get('ref') ?? '');
    if (mode === 'register') {
      authService.registrationOtpOptions().then((settings) => {
        if (!active) return;
        setOtpOptions(settings);
        const preferredChannel = settings.emailOtpEnabled ? 'EMAIL' : 'SMS';
        setRegistrationChannel(preferredChannel);
        setVerificationChannel(preferredChannel);
      }).catch((reason) => {
        if (active) setErrors({ form: reason instanceof Error ? reason.message : 'Unable to load registration settings.' });
      }).finally(() => {
        if (active) setOtpOptionsLoading(false);
      });
    }
    return () => { active = false; };
  }, [location.search, mode]);

  const validate = () => {
    const next: Errors = {};
    if (mode === 'login' || mode === 'forgot') {
      if (!form.identifier.trim()) next.identifier = 'Email or phone number is required.';
      else if (!isValidEmailOrIndianPhone(form.identifier)) next.identifier = 'Enter a valid email or 10-digit Indian mobile number.';
    }
    if (mode === 'register') {
      if (otpOptionsLoading || !otpOptions) {
        next.form = 'Registration verification settings are still loading.';
      } else if (registrationChannels.length === 0) {
        next.form = otpOptions.mobileOtpEnabled && !otpOptions.smsConfigured
          ? 'Mobile verification is not configured. Please contact the administrator.'
          : 'Registration is currently unavailable. Please contact the administrator.';
      }
      if (form.name.trim().length < 2) next.name = 'Please enter your full name.';
      if (form.email.trim() && !emailPattern.test(form.email.trim())) next.email = 'Enter a valid email address.';
      if (registrationChannel === 'EMAIL' && !emailPattern.test(form.email.trim())) {
        next.email = 'Enter a valid email address for Email OTP.';
      }
      if (form.phone.trim() && !formattedPhone) next.phone = 'Enter a valid phone number for the selected country.';
      if (registrationChannel === 'SMS' && !formattedPhone) {
        next.phone = 'Enter a valid phone number for Mobile OTP.';
      }
      if (referralCode.trim() && !referralCodePattern.test(referralCode.trim())) {
        next.referralCode = 'Enter a valid referral code.';
      }
    }
    if ((mode === 'login' || mode === 'register') && form.password.length < 8) {
      next.password = 'Use at least 8 characters.';
    }
    if (mode === 'register' && form.confirmPassword !== form.password) {
      next.confirmPassword = 'Passwords do not match.';
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setErrors({});
    try {
      if (mode === 'login') {
        const login = await authService.login({ identifier: form.identifier.trim(), password: form.password });
        setAuthenticated('CUSTOMER', {
          id: login.user.id, name: login.user.displayName, email: login.user.email ?? form.identifier,
          role: 'CUSTOMER', accessToken: login.accessToken,
          accessTokenExpiresAt: getTokenExpiration(login.accessToken) ?? Date.now() + login.expiresIn * 1000,
          refreshToken: login.refreshToken,
        });
        navigate(pendingProductActionPath() ?? intendedPath(location.state, '/'), { replace: true });
      } else if (mode === 'register') {
        const nextWidgetConfig = registrationChannel === 'SMS'
          ? await authService.registrationWidgetConfig()
          : null;
        const payload = {
          name: form.name,
          email: form.email.trim() || undefined,
          phone: formattedPhone || undefined,
          password: form.password,
          referralCode: referralCode.trim() || undefined,
          verificationChannel: registrationChannel,
        };
        const registration = challengeId
          ? await authService.changeRegistrationContact({ ...payload, challengeId })
          : await authService.register(payload);
        setChallengeId(registration.challengeId);
        setWidgetConfig(nextWidgetConfig);
        setVerificationChannel(registrationChannel);
        setStep('otp');
      } else {
        const recovery = await authService.forgotPassword(form.identifier.trim());
        setRecoverySent(recovery.method === 'EMAIL');
        if (recovery.method === 'PHONE') {
          const nextWidgetConfig = await authService.passwordResetWidgetConfig();
          setChallengeId(recovery.challengeId ?? '');
          setWidgetConfig(nextWidgetConfig);
          setStep('otp');
        } else {
          setStep('success');
        }
      }
    } catch (reason) {
      setErrors({ form: reason instanceof Error ? reason.message : 'Unable to complete the request.' });
    } finally {
      setLoading(false);
    }
  };

  const finishRegistration = () => navigate('/login', { replace: true });

  if (step === 'otp') {
    const alternateChannel: RegistrationOtpChannel = verificationChannel === 'EMAIL' ? 'SMS' : 'EMAIL';
    const hasAlternateIdentifier = alternateChannel === 'EMAIL'
      ? emailPattern.test(form.email.trim())
      : Boolean(formattedPhone);
    const canChangeChannel = mode === 'register' && registrationChannels.length > 1 && hasAlternateIdentifier;
    return <AuthLayout><OtpVerification identifier={maskedIdentifier} onBack={() => setStep('form')}
      backLabel={mode === 'register' ? 'Change contact details' : 'Back'}
      backRequiresCooldown={mode === 'register'}
      alternateChannelLabel={canChangeChannel ? alternateChannel === 'EMAIL' ? 'Email OTP' : 'Mobile OTP' : undefined}
      onChangeChannel={canChangeChannel ? async () => {
        const nextWidgetConfig = alternateChannel === 'SMS'
          ? await authService.registrationWidgetConfig()
          : null;
        const payload = {
          challengeId,
          password: form.password,
          email: form.email.trim() || undefined,
          phone: formattedPhone || undefined,
          verificationChannel: alternateChannel,
        };
        await authService.changeRegistrationContact(payload);
        setWidgetConfig(nextWidgetConfig);
        setVerificationChannel(alternateChannel);
        setRegistrationChannel(alternateChannel);
      } : undefined}
      onVerified={async (otp) => {
        if (mode === 'forgot') {
          const result = await authService.verifyResetOtp(form.identifier.trim(), otp);
          setResetToken(result.resetToken);
          setStep('reset');
        }
        else {
          await authService.verifyOtp(challengeId, otp);
          await finishRegistration();
        }
      }} onResend={async () => {
        if (mode === 'forgot') {
          const response = await authService.forgotPassword(form.identifier.trim());
          if (response.method !== 'PHONE') {
            throw new Error('Unable to resend the reset code. Please try again.');
          }
          return;
        }
        const response = await authService.resendOtp(challengeId);
        if (!response.accepted || !response.challengeId) {
          throw new Error('We could not resend the code. Please try again.');
        }
        setChallengeId(response.challengeId);
      }}
      msg91Widget={widgetConfig && ((mode === 'register' && verificationChannel === 'SMS')
        || (mode === 'forgot' && !form.identifier.includes('@'))) ? {
        challengeId,
        config: widgetConfig,
        phoneNumber: mode === 'register'
          ? formattedPhone
          : formatPhoneInput(form.identifier, 'IN')?.phone ?? form.identifier,
        onVerified: async (accessToken) => {
          if (mode === 'forgot') {
            const result = await authService.verifyResetWidgetAccessToken(challengeId, accessToken);
            setResetToken(result.resetToken);
            setStep('reset');
          } else {
            await authService.verifyWidgetAccessToken(challengeId, accessToken);
            await finishRegistration();
          }
        },
        onSent: async (requestId, sentChallengeId) => {
          const response = mode === 'forgot'
            ? await authService.passwordResetWidgetSent(sentChallengeId, requestId)
            : await authService.registrationWidgetSent(sentChallengeId, requestId);
          if (!response.accepted) throw new Error('We could not start mobile verification. Please try again.');
        },
        onResendPermit: async () => {
          const response = mode === 'forgot'
            ? await authService.resendPasswordResetWidgetOtp(challengeId)
            : await authService.resendWidgetOtp(challengeId);
          if (!response.accepted || !response.challengeId) {
            throw new Error('Please wait before requesting another verification code.');
          }
          setChallengeId(response.challengeId);
          return response.challengeId;
        },
      } : undefined} /></AuthLayout>;
  }

  if (step === 'reset') {
    return <AuthLayout><div className="auth-content auth-animate">
      <span className="auth-step">STEP 03 / SECURE</span><h1>Choose a new password</h1>
      <p className="auth-description">Create a new password for your Dream Spex account.</p>
      <form onSubmit={async (event) => {
        event.preventDefault();
        const next: Errors = {};
        if (form.password.length < 8) next.password = 'Use at least 8 characters.';
        if (form.confirmPassword !== form.password) next.confirmPassword = 'Passwords do not match.';
        setErrors(next);
        if (Object.keys(next).length) return;
        setLoading(true);
        try {
          await authService.resetPasswordWithToken(form.identifier.trim(), resetToken, form.password);
          setRecoverySent(false);
          setStep('success');
        }
        catch (reason) { setErrors({ form: reason instanceof Error ? reason.message : 'Unable to reset your password.' }); }
        finally { setLoading(false); }
      }}>
        <PasswordField id="password" label="New password" value={form.password} onChange={setValue('password')}
          error={errors.password} autoComplete="new-password" />
        <PasswordField id="confirmPassword" label="Confirm new password" value={form.confirmPassword}
          onChange={setValue('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        <button className="auth-primary" type="submit" disabled={loading}>
          {loading ? <><span className="auth-spinner" /> Updating...</> : 'Update password'}
        </button>
        {errors.form ? <p className="auth-error" role="alert">{errors.form}</p> : null}
      </form>
    </div></AuthLayout>;
  }

  if (step === 'success') {
    return <AuthLayout><div className="auth-content auth-success auth-animate">
      <span className="success-mark">✓</span><span className="auth-step">DREAM SPEX / COMPLETE</span>
      <h1>{mode === 'login' ? 'Welcome back.' : mode === 'forgot'
        ? recoverySent ? 'Check your email' : 'Password updated successfully'
        : 'Account created successfully'}</h1>
      <p className="auth-description">{mode === 'login' ? 'Your private eyewear edit is ready.' : mode === 'forgot'
        ? recoverySent ? 'If an account exists, password reset instructions have been sent. Check your inbox.'
          : 'Your password has been reset.'
        : 'Welcome to Dream Spex.'}</p>
      {mode === 'forgot' && recoverySent ? <button className="auth-text-link" type="button" disabled={loading}
        onClick={async () => {
          setLoading(true);
          setErrors({});
          try { await authService.forgotPassword(form.identifier.trim()); }
          catch (reason) { setErrors({ form: reason instanceof Error ? reason.message : 'Unable to resend reset instructions.' }); }
          finally { setLoading(false); }
        }}>{loading ? 'Sending...' : 'Resend'}</button> : null}
      {errors.form ? <p className="auth-error" role="alert">{errors.form}</p> : null}
      <button className="auth-primary" onClick={() => navigate('/login', {
        replace: true,
        state: pendingProductActionPath()
          ? { from: { pathname: pendingProductActionPath() } }
          : location.state,
      })}>
        {mode === 'login' ? 'Continue shopping' : mode === 'forgot' ? 'Back to login' : 'Continue to login'} <ArrowRight size={17} />
      </button>
    </div></AuthLayout>;
  }

  const title = mode === 'login' ? 'Welcome back.' : mode === 'register' ? 'Create your account.' : 'Reset your password.';
  const description = mode === 'login' ? 'Your private eyewear edit is ready.'
    : mode === 'register' ? 'Join Dream Spex and make every view your own.'
      : 'Enter your details and we\'ll help you get back in.';

  return <AuthLayout><div className="auth-content auth-animate">
    <span className="auth-step">{mode === 'register' ? 'STEP 01 / JOIN' : mode === 'forgot' ? 'DREAM SPEX / ACCOUNT RECOVERY' : 'DREAM SPEX / PRIVATE ACCESS'}</span>
    <h1>{title}</h1><p className="auth-description">{description}</p>
    {errors.form ? <p className="auth-error" role="alert">{errors.form}</p> : null}
    <form onSubmit={submit} noValidate className={mode === 'register' ? 'auth-registration-form' : undefined}>
      {mode === 'register' ? <>
        {otpOptionsLoading ? <p className="mb-4 text-sm text-[var(--text-secondary)]" role="status">Loading available verification methods...</p> : null}
        <div className="auth-registration-contact">
          <Field id="name" label="Full name" value={form.name} onChange={setValue('name')}
            error={errors.name} autoComplete="name" placeholder="Enter your full name" />
          <Field id="email" label={registrationChannel === 'EMAIL' ? 'Email address (required)' : 'Email address (optional)'} value={form.email} onChange={setValue('email')}
            error={errors.email} type="email" autoComplete="email" placeholder="Enter your email address" />
          <div className="auth-field-wrap auth-phone-field">
            <label htmlFor="phone">{registrationChannel === 'SMS' ? 'Mobile number (required)' : 'Mobile number (optional)'}</label>
            <div className="mt-2 flex gap-2">
              <select aria-label="Country calling code" value={phoneCountryCode} onChange={(event) => setPhoneCountryCode(event.target.value)}
                className="max-w-[9rem] min-w-[6.5rem] rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-2 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#7CBF00]">
                {phoneCountries.map((country) => <option key={country.code} value={country.code}>
                  {country.flag} +{country.callingCode} ({country.code})
                </option>)}
              </select>
              <input id="phone" type="tel" inputMode="tel" autoComplete="tel-national" value={form.phone}
                onChange={(event) => setValue('phone')(event.target.value)} placeholder="Enter your phone number"
                aria-invalid={Boolean(errors.phone)} aria-describedby={errors.phone ? 'phone-error' : undefined}
                className="min-w-0 flex-1 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[#7CBF00]" />
            </div>
            {errors.phone ? <span id="phone-error" className="auth-error">{errors.phone}</span> : null}
          </div>
        </div>
        {registrationChannels.length > 1 ? <fieldset className="mt-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--bg-primary)] p-4">
          <legend className="px-1 text-sm font-medium text-[var(--text-primary)]">Choose a verification method</legend>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {registrationChannels.map((channel) => <label key={channel} className="flex cursor-pointer items-start gap-3 rounded-xl border border-[var(--border-subtle)] p-3 text-sm text-[var(--text-secondary)]">
              <input type="radio" name="verificationChannel" value={channel} checked={registrationChannel === channel}
                onChange={() => setRegistrationChannel(channel)} />
              <span><span className="block font-medium text-[var(--text-primary)]">{channel === 'EMAIL' ? 'Email OTP' : 'Mobile OTP'}</span>
                <span className="mt-1 block text-xs">{channel === 'EMAIL' ? form.email || 'Verify by email' : formattedPhone || 'Verify by mobile'}</span></span>
            </label>)}
          </div>
        </fieldset> : registrationChannels.length === 1 ? <p className="mt-3 text-xs text-[var(--text-secondary)]">
          Verification method: {registrationChannels[0] === 'EMAIL' ? 'Email OTP' : 'Mobile OTP'}
        </p> : null}
        {otpOptions && registrationChannels.length === 0 ? <p className="mt-3 text-sm text-red-600" role="alert">
          {otpOptions.mobileOtpEnabled && !otpOptions.smsConfigured
            ? 'Mobile verification is not configured. Please contact the administrator.'
            : 'Registration is currently unavailable. Please contact the administrator.'}
        </p> : null}
        {otpOptions?.mobileOtpEnabled && !otpOptions.smsConfigured && registrationChannels.length > 0
          ? <p className="mt-3 text-sm text-amber-300" role="alert">Mobile OTP is enabled but the SMS gateway is not configured. Contact the administrator.</p>
          : null}
        <Field id="referralCode" label="Referral code (optional)" value={referralCode}
          onChange={setReferralCode} error={errors.referralCode} placeholder="Enter your friend's code" />
        <div className="auth-registration-passwords">
          <PasswordField id="password" label="Password" value={form.password} onChange={setValue('password')}
            error={errors.password} autoComplete="new-password" />
          <PasswordField id="confirmPassword" label="Confirm password" value={form.confirmPassword}
            onChange={setValue('confirmPassword')} error={errors.confirmPassword} autoComplete="new-password" />
        </div>
      </> : <Field id="identifier" label="Email or Phone Number" value={form.identifier}
        onChange={setValue('identifier')} error={errors.identifier} autoComplete="username"
        placeholder="Enter email or 10-digit mobile number" icon={<Mail size={16} />} />}
      {mode === 'login' ? <>
        <PasswordField id="password" label="Password" value={form.password} onChange={setValue('password')}
          error={errors.password} autoComplete="current-password" />
        <div className="auth-login-options"><label className="auth-remember"><input type="checkbox" /> <span>Remember me</span></label>
          <Link className="auth-text-link" to="/forgot-password">Forgot password?</Link></div>
      </> : null}
      <button className="auth-primary" type="submit" disabled={loading || (mode === 'register' && (otpOptionsLoading || registrationChannels.length === 0))}>
        {loading ? <><span className="auth-spinner" /> {mode === 'login' ? 'Signing in...'         : mode === 'forgot' ? 'Sending reset instructions...' : 'Creating account...'}</>
          : mode === 'login' ? <>Sign in <ArrowRight size={17} /></>
            : mode === 'forgot' ? 'Send Reset Code' : 'Create account'}
      </button>
    </form>
    {mode === 'login' ? <>
      <div className="auth-divider"><span>or continue with</span></div>
      <div className="auth-socials"><button type="button" aria-label="Continue with Google" className="auth-social google">G</button>
        <button type="button" aria-label="Continue with Facebook" className="auth-social">f</button>
        <button type="button" aria-label="Continue with Apple" className="auth-social"><Apple size={18} /></button></div>
    </> : null}
    <p className="auth-switch">{mode === 'register' ? 'Already have an account?' : 'Don&apos;t have an account?'}
      {' '}<Link to={mode === 'register' ? '/login' : '/register'} state={location.state}>{mode === 'register' ? 'Sign in' : 'Create account'}</Link>
    </p>
  </div></AuthLayout>;
}
