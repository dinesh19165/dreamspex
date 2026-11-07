import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type LoginPayload = { identifier: string; password: string };
export type RegisterPayload = { name: string; email: string; phone: string; password: string };

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

export type ForgotPasswordResponse = { accepted: boolean; challengeId: string };
export type SimpleResponse = { accepted: boolean };
export type ResetPasswordResponse = { reset: boolean; accepted: boolean };

type ProblemResponse = {
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
};

export class AuthApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AuthApiError';
    this.status = status;
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
    throw new AuthApiError(fieldMessage || problem.message || `Request failed (${response.status})`, response.status);
  }

  return response.json() as Promise<T>;
}

export const authService = {
  login: (payload: LoginPayload) =>
    request<TokenResponse>('/api/v1/auth/login', { method: 'POST', body: JSON.stringify(payload) }),
  register: (payload: RegisterPayload) =>
    request<RegisterResponse>('/api/v1/auth/register', { method: 'POST', body: JSON.stringify(payload) }),
  verifyOtp: (challengeId: string, otp: string) =>
    request<SimpleResponse>('/api/v1/auth/verify-otp', { method: 'POST', body: JSON.stringify({ challengeId, otp }) }),
  resendOtp: (challengeId: string) =>
    request<SimpleResponse>('/api/v1/auth/resend-otp', { method: 'POST', body: JSON.stringify({ challengeId }) }),
  forgotPassword: (identifier: string) =>
    request<ForgotPasswordResponse>('/api/v1/auth/forgot-password', { method: 'POST', body: JSON.stringify({ identifier }) }),
  resetPassword: (challengeId: string, otp: string, newPassword: string) =>
    request<ResetPasswordResponse>('/api/v1/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ challengeId, otp, newPassword }),
    }),
  refresh: (refreshToken: string) =>
    request<TokenResponse>('/api/v1/auth/refresh', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
  logout: (refreshToken: string) =>
    request<SimpleResponse>('/api/v1/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};
