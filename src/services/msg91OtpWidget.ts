export type Msg91OtpWidgetConfig = {
  widgetId: string;
  tokenAuth: string;
};

type WidgetData = {
  captchaValidations?: boolean;
  widgetMeta?: {
    captcha_type?: number | string;
  };
};

type WidgetResponse = {
  code?: number | string;
  message?: unknown;
  'access-token'?: unknown;
  access_token?: unknown;
  token?: unknown;
  request_id?: unknown;
  requestId?: unknown;
  reqId?: unknown;
  data?: {
    code?: number | string;
    message?: unknown;
    'access-token'?: unknown;
    access_token?: unknown;
    token?: unknown;
    request_id?: unknown;
    requestId?: unknown;
    reqId?: unknown;
  };
};

type WidgetMethod = (...args: unknown[]) => unknown;
type WidgetInstance = {
  instanceId?: string;
};
type WidgetInitHandlers = {
  onSuccess: (accessToken: string) => void;
  onFailure: (message: string) => void;
};
type RecaptchaEnterprise = {
  ready: (callback: () => void) => void;
};

declare global {
  interface Window {
    initSendOTP?: (configuration: {
      widgetId: string;
      tokenAuth: string;
      exposeMethods: true;
      captchaRenderId: string;
      success: (data: unknown) => void;
      failure: (error: unknown) => void;
    }) => WidgetInstance | null;
    destroyOTPWidget?: (instanceId: string) => void;
    sendOtp?: WidgetMethod;
    retryOtp?: WidgetMethod;
    verifyOtp?: WidgetMethod;
    getWidgetData?: () => WidgetData | null;
    isCaptchaVerified?: () => boolean;
    grecaptcha?: {
      enterprise?: RecaptchaEnterprise;
    };
  }
}

const SCRIPT_URL = 'https://verify.msg91.com/otp-provider.js';
let scriptPromise: Promise<void> | null = null;
let captchaType: number | null = null;
let captchaRequired = false;

function loadScript() {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new Error('MSG91 phone verification is only available in a browser.'));
  }
  if (window.initSendOTP) return Promise.resolve();
  if (!scriptPromise) {
    scriptPromise = new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_URL}"]`);
      const script = existing ?? document.createElement('script');
      script.async = true;
      script.src = SCRIPT_URL;
      script.onload = () => window.initSendOTP
        ? resolve()
        : reject(new Error('MSG91 phone verification could not be initialized.'));
      script.onerror = () => reject(new Error('MSG91 phone verification could not be loaded.'));
      if (!existing) document.head.appendChild(script);
    }).catch((error: unknown) => {
      scriptPromise = null;
      throw error;
    });
  }
  return scriptPromise;
}

function waitForWidgetData(timeoutMs = 15000): Promise<WidgetData> {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs;
    const poll = () => {
      const data = window.getWidgetData?.();
      if (data) {
        resolve(data);
      } else if (Date.now() >= deadline) {
        reject(new Error('MSG91 phone verification did not finish initializing.'));
      } else {
        window.setTimeout(poll, 100);
      }
    };
    poll();
  });
}

function accessTokenFrom(response: unknown) {
  if (!response || typeof response !== 'object') return '';
  const data = response as WidgetResponse;
  const candidates = [
    data['access-token'],
    data.access_token,
    data.token,
    data.data?.['access-token'],
    data.data?.access_token,
    data.data?.token,
    data.message,
    data.data?.message,
  ];
  return candidates.find((candidate): candidate is string =>
    typeof candidate === 'string' && candidate.trim().length > 0) ?? '';
}

function accessTokenFieldFrom(response: unknown) {
  if (!response || typeof response !== 'object') return '';
  const data = response as WidgetResponse;
  const candidates = [
    data['access-token'],
    data.access_token,
    data.token,
    data.data?.['access-token'],
    data.data?.access_token,
    data.data?.token,
  ];
  return candidates.find((candidate): candidate is string =>
    typeof candidate === 'string' && candidate.trim().length > 0) ?? '';
}

function isOtpAlreadyVerified(error: unknown) {
  if (!error || typeof error !== 'object') return false;
  const data = error as WidgetResponse;
  const code = data.code ?? data.data?.code;
  const message = [data.message, data.data?.message]
    .find((value): value is string => typeof value === 'string');
  return String(code) === '703' && Boolean(message && /otp\s+already\s+verified/i.test(message));
}

function safeProviderError(error: unknown) {
  if (!error || typeof error !== 'object') {
    return {
      detail: typeof error === 'string'
        ? redactProviderText(error).slice(0, 300)
        : 'Unknown provider error',
    };
  }
  const data = error as Record<string, unknown>;
  const safe: Record<string, string | number | boolean> = {};
  for (const key of ['type', 'status', 'code', 'message', 'description']) {
    const value = data[key];
    if (typeof value === 'string') {
      safe[key] = redactProviderText(value).slice(0, 300);
    } else if (typeof value === 'number' || typeof value === 'boolean') {
      safe[key] = value;
    }
  }
  return Object.keys(safe).length ? safe : { detail: 'Provider returned an unrecognized error' };
}

function redactProviderText(value: string) {
  return value
    .replace(/\b(?:\+?\d[\d\s().-]{7,}\d)\b/g, '[redacted phone]')
    .replace(/\b(token|auth(?:key| token)?|otp|access[-_ ]?token)\s*[:=]\s*\S+/gi, '$1=[redacted]')
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, '[redacted token]');
}

function reportProviderError(error: unknown) {
  console.error('MSG91 OTP widget request failed', safeProviderError(error));
}

function providerErrorMessage(error: unknown) {
  if (error && typeof error === 'object') {
    const data = error as Record<string, unknown>;
    const message = [data.message, data.description]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
    if (message) {
      if (/otp\s+already\s+verified/i.test(message)) {
        return 'This code was already verified. Retrying account verification...';
      }
      if (/captcha|recaptcha/i.test(message)) {
        return 'Complete the security check and try again.';
      }
      if (/invalid|incorrect|expired/i.test(message) && /otp|code|verification/i.test(message)) {
        return 'That verification code is invalid or expired. Please try again.';
      }
      if (/limit|too many|resend/i.test(message)) {
        return 'Too many verification attempts. Please wait before trying again.';
      }
    }
  }
  return 'MSG91 could not complete phone verification. Please try again.';
}

export class Msg91OtpAlreadyVerifiedError extends Error {
  readonly accessToken: string;

  constructor(accessToken: string) {
    super('MSG91 reports that this OTP was already verified.');
    this.name = 'Msg91OtpAlreadyVerifiedError';
    this.accessToken = accessToken;
  }
}

export async function initializeMsg91OtpWidget(
  config: Msg91OtpWidgetConfig,
  captchaRenderId: string,
  handlers: WidgetInitHandlers = { onSuccess: () => undefined, onFailure: () => undefined },
) {
  await loadScript();
  if (!window.initSendOTP) {
    throw new Error('MSG91 phone verification could not be initialized.');
  }
  const instance = window.initSendOTP({
    widgetId: config.widgetId,
    tokenAuth: config.tokenAuth,
    exposeMethods: true,
    captchaRenderId,
    success: (data: unknown) => {
      const accessToken = accessTokenFrom(data);
      if (accessToken) handlers.onSuccess(accessToken);
    },
    failure: (error: unknown) => {
      reportProviderError(error);
      handlers.onFailure(providerErrorMessage(error));
    },
  });
  try {
    const data = await waitForWidgetData();
    captchaRequired = Boolean(data.captchaValidations);
    captchaType = Number(data.widgetMeta?.captcha_type) || null;
    if (captchaRequired && captchaType !== 1 && captchaType !== 2 && captchaType !== 3) {
      throw new Error('MSG91 CAPTCHA configuration is not supported by this browser integration.');
    }
    if (captchaRequired && (captchaType === 1 || captchaType === 3)) {
      const deadline = Date.now() + 15000;
      while (!document.getElementById(captchaRenderId)?.childElementCount) {
        if (Date.now() >= deadline) {
          throw new Error('MSG91 CAPTCHA could not be displayed.');
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
    } else if (captchaRequired && captchaType === 2) {
      const deadline = Date.now() + 15000;
      while (!window.grecaptcha?.enterprise) {
        if (Date.now() >= deadline) {
          throw new Error('MSG91 CAPTCHA could not be initialized.');
        }
        await new Promise((resolve) => window.setTimeout(resolve, 100));
      }
      await new Promise<void>((resolve) => window.grecaptcha?.enterprise?.ready(resolve));
    }
  } catch (error) {
    if (instance?.instanceId) window.destroyOTPWidget?.(instance.instanceId);
    throw error;
  }
  return () => {
    if (instance?.instanceId) window.destroyOTPWidget?.(instance.instanceId);
  };
}

export function isMsg91CaptchaVerified() {
  if (!captchaRequired || captchaType === 2) return true;
  return window.isCaptchaVerified?.() === true;
}

function callWidgetMethod<T>(
  methodName: 'sendOtp' | 'retryOtp' | 'verifyOtp',
  args: unknown[],
): Promise<T> {
  const method = window[methodName];
  if (!method) return Promise.reject(new Error('MSG91 phone verification is not ready.'));

  return new Promise((resolve, reject) => {
    let settled = false;
    const success = (data: T) => {
      settled = true;
      resolve(data);
    };
    const failure = (error?: unknown) => {
      settled = true;
      if (error !== undefined) reportProviderError(error);
      if (methodName === 'verifyOtp' && isOtpAlreadyVerified(error)) {
        reject(new Msg91OtpAlreadyVerifiedError(accessTokenFieldFrom(error)));
        return;
      }
      reject(new Error(providerErrorMessage(error)));
    };
    try {
      Promise.resolve(method(...args, success, failure)).then(() => {
        if (!settled) reject(new Error('Complete the CAPTCHA before continuing.'));
      }, failure);
    } catch {
      failure();
    }
  });
}

export async function sendMsg91Otp(identifier: string) {
  if (!isMsg91CaptchaVerified()) {
    throw new Error('Complete the CAPTCHA before requesting an OTP.');
  }
  const response = await callWidgetMethod<WidgetResponse>('sendOtp', [identifier.replace(/^\+/, '')]);
  const requestId = [response.message, response.request_id, response.requestId, response.reqId,
    response.data?.request_id, response.data?.requestId, response.data?.reqId]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
  if (!requestId) throw new Error('MSG91 did not return a verification request ID.');
  return requestId;
}

export async function retryMsg91Otp() {
  const response = await callWidgetMethod<WidgetResponse>('retryOtp', ['11']);
  return [response.request_id, response.requestId, response.reqId,
    response.data?.request_id, response.data?.requestId, response.data?.reqId]
    .find((value): value is string => typeof value === 'string' && value.trim().length > 0);
}

export async function verifyMsg91Otp(otp: string) {
  const response = await callWidgetMethod<WidgetResponse>('verifyOtp', [otp]);
  const accessToken = accessTokenFrom(response);
  if (!accessToken) {
    throw new Error('MSG91 did not return a verification token.');
  }
  return accessToken;
}
