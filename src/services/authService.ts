import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';
import { franchiseService } from './franchiseService';

export type LoginPayload = { identifier: string; password: string };
export type RegistrationOtpChannel = 'EMAIL' | 'SMS';
export type RegisterPayload = {
  name: string;
  email?: string;
  phone?: string;
  password: string;
  referralCode?: string;
  verificationChannel: RegistrationOtpChannel;
};
export type RegistrationOtpOptions = {
  emailOtpEnabled: boolean;
  mobileOtpEnabled: boolean;
  smsConfigured: boolean;
};
export type RegistrationWidgetConfig = {
  widgetId: string;
  tokenAuth: string;
};

export type AuthUserResponse = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  roles: string[];
};

export type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserResponse;
};

export type RegisterResponse = {
  userId: string;
  verificationRequired: boolean;
  channels: string[];
  challengeId: string;
};
export type ChangeRegistrationContactPayload = {
  challengeId: string;
  password: string;
  email?: string;
  phone?: string;
  verificationChannel: RegistrationOtpChannel;
};

export type ForgotPasswordResponse = {
  accepted: boolean;
  method: 'EMAIL' | 'PHONE';
  nextStep: 'CHECK_EMAIL' | 'VERIFY_OTP';
  message: string;
  challengeId: string | null;
};
export type ResetOtpVerificationResponse = { verified: boolean; resetToken: string; expiresInSeconds: number };
export type SimpleResponse = { accepted: boolean };
export type OtpVerificationResponse = { success: boolean; code: string; message: string };
export type ResendOtpResponse = { accepted: boolean; challengeId: string | null };
export type ResetPasswordResponse = { reset: boolean; accepted: boolean };

type ProblemResponse = {
  message?: string;
  code?: string;
  details?: Record<string, unknown>;
  fieldErrors?: Array<{ field: string; message: string }>;
};

export class AuthApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;
  readonly details: Record<string, unknown> | undefined;

  constructor(message: string, status: number, code?: string, details?: Record<string, unknown>) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request<T>(path: string, init: RequestInit) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });

  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemResponse;
    const fieldMessage = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    throw new AuthApiError(fieldMessage || problem.message || `Request failed (${response.status})`,
      response.status, problem.code, problem.details);
  }

  return response.json() as Promise<T>;
}

export const authService = {
  login: (payload: LoginPayload) =>
    request<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  franchiseLogin: async (payload: LoginPayload) => {
    const response = await franchiseService.login(payload.identifier, payload.password);
    if (!response.ok) {
      const problem = await response.json().catch(() => ({})) as ProblemResponse;
      throw new AuthApiError(problem.message || `Request failed (${response.status})`,
        response.status, problem.code, problem.details);
    }
    return response.json() as Promise<TokenResponse>;
  },
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  registrationOtpOptions: () =>
    request<RegistrationOtpOptions>('/api/v1/auth/registration-options', { method: 'GET' }),
  registrationWidgetConfig: () =>
    request<RegistrationWidgetConfig>('/api/v1/auth/registration-widget-config', {
      method: 'GET',
      cache: 'no-store',
    }),
  passwordResetWidgetConfig: () =>
    request<RegistrationWidgetConfig>('/api/v1/auth/password-reset-widget-config', {
      method: 'GET',
      cache: 'no-store',
    }),
  changeRegistrationContact: (payload: ChangeRegistrationContactPayload) =>
    request<RegisterResponse>('/api/v1/auth/registration/contact', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (challengeId: string, otp: string) =>
    request<OtpVerificationResponse>('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ challengeId, otp }) }),
  verifyWidgetAccessToken: (challengeId: string, accessToken: string) =>
    request<OtpVerificationResponse>('/api/v1/auth/verify-widget-access-token', {
      method: 'POST',
      body: JSON.stringify({ challengeId, accessToken }),
    }),
  registrationWidgetSent: (challengeId: string, requestId: string) =>
    request<SimpleResponse>('/api/v1/auth/registration-widget-sent', {
      method: 'POST',
      body: JSON.stringify({ challengeId, requestId }),
    }),
  passwordResetWidgetSent: (challengeId: string, requestId: string) =>
    request<SimpleResponse>('/api/v1/auth/password-reset-widget-sent', {
      method: 'POST',
      body: JSON.stringify({ challengeId, requestId }),
    }),
  resendOtp: (challengeId: string) =>
    request<ResendOtpResponse>('/api/v1/auth/resend-otp', { method: 'POST', body: JSON.stringify({ challengeId }) }),
  resendWidgetOtp: (challengeId: string) =>
    request<ResendOtpResponse>('/api/v1/auth/resend-widget-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    }),
  resendPasswordResetWidgetOtp: (challengeId: string) =>
    request<ResendOtpResponse>('/api/v1/auth/resend-password-reset-widget-otp', {
      method: 'POST',
      body: JSON.stringify({ challengeId }),
    }),
  forgotPassword: (identifier: string) =>
    request<ForgotPasswordResponse>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
  verifyResetOtp: (identifier: string, otp: string) =>
    request<ResetOtpVerificationResponse>('/api/v1/auth/verify-reset-otp', {
      method: 'POST', body: JSON.stringify({ identifier, otp }),
    }),
  verifyResetWidgetAccessToken: (challengeId: string, accessToken: string) =>
    request<ResetOtpVerificationResponse>('/api/v1/auth/verify-reset-widget-access-token', {
      method: 'POST', body: JSON.stringify({ challengeId, accessToken }),
    }),
  resetPasswordWithToken: (identifier: string, resetToken: string, newPassword: string) =>
    request<ResetPasswordResponse>('/api/v1/auth/reset-password', {
      method: 'POST', body: JSON.stringify({ identifier, resetToken, newPassword }),
    }),
  resetPassword: (challengeId: string, otp: string, newPassword: string) =>
    request<ResetPasswordResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp, newPassword }),
    }),
  setupFranchisePassword: (token: string, newPassword: string) =>
    request<ResetPasswordResponse>('/api/v1/auth/franchise/setup', {
      method: 'POST',
      body: JSON.stringify({ token, newPassword }),
    }),
  refresh: (refreshToken: string) =>
    request<TokenResponse>('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) =>
    request<SimpleResponse>('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};
