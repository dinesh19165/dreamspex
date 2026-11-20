import { useEffect, useId, useRef, useState } from 'react';
import { ArrowLeft, RefreshCw } from 'lucide-react';
import {
  initializeMsg91OtpWidget,
  isMsg91CaptchaVerified,
  retryMsg91Otp,
  sendMsg91Otp,
  verifyMsg91Otp,
  Msg91OtpAlreadyVerifiedError,
  type Msg91OtpWidgetConfig,
} from '../../services/msg91OtpWidget';

type Props = {
  identifier: string;
  onBack: () => void;
  onVerified: (otp: string) => Promise<void>;
  onResend: () => Promise<void>;
  msg91Widget?: {
    challengeId: string;
    config: Msg91OtpWidgetConfig;
    phoneNumber: string;
    onVerified: (accessToken: string) => Promise<void>;
    onSent: (requestId: string, challengeId: string) => Promise<void>;
    onResendPermit: () => Promise<string>;
  };
  backLabel?: string;
  backRequiresCooldown?: boolean;
  alternateChannelLabel?: string;
  onChangeChannel?: () => Promise<void>;
};

export default function OtpVerification({
  identifier,
  onBack,
  onVerified,
  onResend,
  msg91Widget,
  backLabel = 'Back',
  backRequiresCooldown = false,
  alternateChannelLabel,
  onChangeChannel,
}: Props) {
  const [digits, setDigits] = useState(['', '', '', '', '', '']);
  const [seconds, setSeconds] = useState(30);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [channelLoading, setChannelLoading] = useState(false);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);
  const widgetRef = useRef(msg91Widget);
  widgetRef.current = msg91Widget;
  const widgetAccessTokenRef = useRef('');
  const widgetAccessTokenResolverRef = useRef<((accessToken: string) => void) | null>(null);
  const isVerifyingRef = useRef(false);
  const widgetId = msg91Widget?.config.widgetId;
  const widgetTokenAuth = msg91Widget?.config.tokenAuth;
  const widgetPhoneNumber = msg91Widget?.phoneNumber;
  const widgetVerifyRequested = useRef(false);
  const captchaContainerId = `msg91-captcha-${useId().replace(/:/g, '')}`;
  const [widgetLoading, setWidgetLoading] = useState(Boolean(msg91Widget));
  const [widgetSent, setWidgetSent] = useState(false);
  const [captchaVerified, setCaptchaVerified] = useState(false);

  useEffect(() => {
    let active = true;
    let timer: number | undefined;
    let disposeWidget: (() => void) | undefined;
    if (!widgetRef.current) {
      setWidgetLoading(false);
      setWidgetSent(false);
      setCaptchaVerified(false);
      return undefined;
    }

    setWidgetLoading(true);
    setWidgetSent(false);
    setCaptchaVerified(false);
    setError('');
    initializeMsg91OtpWidget({
      widgetId: widgetId ?? '',
      tokenAuth: widgetTokenAuth ?? '',
    }, captchaContainerId, {
      onSuccess: (accessToken) => {
        if (widgetVerifyRequested.current) {
          widgetAccessTokenRef.current = accessToken;
          widgetAccessTokenResolverRef.current?.(accessToken);
        }
      },
      onFailure: (message) => {
        setError(message);
        setLoading(false);
        setResendLoading(false);
      },
    }).then((dispose) => {
      if (!active) {
        dispose();
        return;
      }
      disposeWidget = dispose;
      setWidgetLoading(false);
      setCaptchaVerified(isMsg91CaptchaVerified());
      timer = window.setInterval(() => setCaptchaVerified(isMsg91CaptchaVerified()), 300);
    }).catch((reason: unknown) => {
      if (!active) return;
      setWidgetLoading(false);
      setError(reason instanceof Error ? reason.message : 'Mobile verification is unavailable.');
    });

    return () => {
      active = false;
      disposeWidget?.();
      if (timer !== undefined) window.clearInterval(timer);
    };
  }, [captchaContainerId, widgetId, widgetTokenAuth, widgetPhoneNumber]);

  useEffect(() => {
    if (seconds <= 0) return undefined;
    const timer = window.setTimeout(() => setSeconds((value) => value - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [seconds]);

  const updateDigit = (index: number, value: string) => {
    const next = [...digits];
    next[index] = value.slice(-1).replace(/\D/g, '');
    if (next[index] !== digits[index]) widgetAccessTokenRef.current = '';
    setDigits(next);
    if (next[index] && index < 5) inputs.current[index + 1]?.focus();
  };

  const handlePaste = (event: React.ClipboardEvent) => {
    event.preventDefault();
    const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6).split('');
    widgetAccessTokenRef.current = '';
    setDigits(digits.map((_, index) => pasted[index] ?? ''));
    if (pasted.length) inputs.current[Math.min(pasted.length, 6) - 1]?.focus();
  };

  const verify = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isVerifyingRef.current) return;
    if (digits.join('').length !== 6) {
      setError('Enter the six-digit code to continue.');
      return;
    }
    isVerifyingRef.current = true;
    setLoading(true);
    setError('');
    try {
      if (msg91Widget) {
        let accessToken = widgetAccessTokenRef.current;
        if (!accessToken) {
          widgetVerifyRequested.current = true;
          const callbackToken = new Promise<string>((resolve) => {
            widgetAccessTokenResolverRef.current = resolve;
          });
          try {
            accessToken = await Promise.race([verifyMsg91Otp(digits.join('')), callbackToken]);
          } catch (reason) {
            if (reason instanceof Msg91OtpAlreadyVerifiedError && reason.accessToken) {
              accessToken = reason.accessToken;
            } else if (widgetAccessTokenRef.current) {
              accessToken = widgetAccessTokenRef.current;
            } else {
              throw reason;
            }
          } finally {
            widgetVerifyRequested.current = false;
            widgetAccessTokenResolverRef.current = null;
          }
        }
        widgetAccessTokenRef.current = accessToken;
        await widgetRef.current?.onVerified(accessToken);
      } else {
        await onVerified(digits.join(''));
      }
    } catch (reason) {
      widgetVerifyRequested.current = false;
      setError(reason instanceof Msg91OtpAlreadyVerifiedError
        ? 'MSG91 already verified this code but did not return a verification token. Please request a new code.'
        : reason instanceof Error ? reason.message : 'That code could not be verified. Please try again.');
    } finally {
      setLoading(false);
      isVerifyingRef.current = false;
    }
  };

  const resend = async () => {
    setResendLoading(true);
    setError('');
    try {
      if (msg91Widget) {
        const nextChallengeId = await msg91Widget.onResendPermit();
        setDigits(['', '', '', '', '', '']);
        widgetAccessTokenRef.current = '';
        widgetAccessTokenResolverRef.current = null;
        setSeconds(30);
        const requestId = await retryMsg91Otp();
        if (requestId) await msg91Widget.onSent(requestId, nextChallengeId);
      } else {
        await onResend();
        setDigits(['', '', '', '', '', '']);
        widgetAccessTokenRef.current = '';
        setSeconds(30);
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not resend the code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const sendWidgetOtp = async () => {
    if (!msg91Widget || widgetLoading || !captchaVerified) return;
    setResendLoading(true);
    setError('');
    try {
      const requestId = await sendMsg91Otp(msg91Widget.phoneNumber);
      await msg91Widget.onSent(requestId, msg91Widget.challengeId);
      setWidgetSent(true);
      setSeconds(30);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not send the code. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const changeChannel = async () => {
    if (!onChangeChannel) return;
    setChannelLoading(true);
    setError('');
    try {
      await onChangeChannel();
      setDigits(['', '', '', '', '', '']);
      widgetAccessTokenRef.current = '';
      widgetAccessTokenResolverRef.current = null;
      setSeconds(30);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'We could not change the verification method.');
    } finally {
      setChannelLoading(false);
    }
  };

  return <div className="auth-content auth-animate">
    <button type="button" className="auth-back" onClick={onBack}
      disabled={loading || resendLoading || channelLoading || (backRequiresCooldown && seconds > 0)}>
      <ArrowLeft size={16} /> {backRequiresCooldown && seconds > 0 ? `Change contact details in 00:${String(seconds).padStart(2, '0')}` : backLabel}
    </button>
    <span className="auth-step">STEP 02 / VERIFY</span>
    <h1>Verify your account.</h1>
    <p className="auth-description">
      {msg91Widget && !widgetSent
        ? <>Complete the security check to send a verification code to<br /><strong>{identifier}</strong></>
        : <>We&apos;ve sent a 6-digit verification code to<br /><strong>{identifier}</strong></>}
    </p>
    {msg91Widget ? <div id={captchaContainerId} className="msg91-captcha-container" aria-label="Security check" /> : null}
    {msg91Widget && !widgetSent ? <button className="auth-primary" type="button" disabled={widgetLoading
      || !captchaVerified || resendLoading || channelLoading} onClick={() => void sendWidgetOtp()}>
      {widgetLoading ? <><span className="auth-spinner" /> Preparing security check...</>
        : resendLoading ? <><span className="auth-spinner" /> Sending...</> : 'Send verification code'}
    </button> : null}
    {(!msg91Widget || widgetSent) ? <form onSubmit={verify}>
      <div className="otp-grid" onPaste={handlePaste}>
        {digits.map((digit, index) => <input key={index} ref={(element) => { inputs.current[index] = element; }}
          aria-label={`Verification digit ${index + 1}`} inputMode="numeric" maxLength={1} value={digit}
          disabled={loading}
          onChange={(event) => updateDigit(index, event.target.value)}
          onKeyDown={(event) => { if (event.key === 'Backspace' && !digits[index] && index > 0) inputs.current[index - 1]?.focus(); }} />)}
      </div>
      {error ? <p className="auth-error auth-otp-error" role="alert">{error}</p> : null}
      <button className="auth-primary" type="submit" disabled={loading || resendLoading || channelLoading}>
        {loading ? <><span className="auth-spinner" /> Verifying...</> : 'Verify account'}
      </button>
    </form> : null}
    {msg91Widget && !widgetSent && error ? <p className="auth-error auth-otp-error" role="alert">{error}</p> : null}
    {onChangeChannel && alternateChannelLabel ? <button className="auth-resend" type="button"
      disabled={seconds > 0 || loading || resendLoading || channelLoading} onClick={() => void changeChannel()}>
      {channelLoading ? 'Changing method...' : seconds > 0 ? `Use ${alternateChannelLabel} in 00:${String(seconds).padStart(2, '0')}` : `Use ${alternateChannelLabel} instead`}
    </button> : null}
    {(!msg91Widget || widgetSent) ? <button className="auth-resend" type="button"
      disabled={seconds > 0 || loading || resendLoading || channelLoading}
      onClick={() => void resend()}>
      {resendLoading ? <><span className="auth-spinner auth-spinner-small" /> Sending...</>
        : seconds > 0 ? `Resend OTP in 00:${String(seconds).padStart(2, '0')}`
          : <><RefreshCw size={15} /> Resend OTP</>}
    </button> : null}
  </div>;
}