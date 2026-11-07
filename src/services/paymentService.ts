import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type PaymentOrder = {
  payment: {
    id: string;
    provider: string;
    providerOrderId: string;
    status: string;
    amount: number;
    currency: string;
    signatureVerified: boolean;
  };
  keyId: string;
};

async function request<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/payments${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...init.headers },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(problem.message ?? `Payment request failed (${response.status})`);
  }
  return response.json() as Promise<T>;
}

export const paymentService = {
  create: (accessToken: string, orderId: string) => request<PaymentOrder>(accessToken, `/orders/${encodeURIComponent(orderId)}/intent`, { method: 'POST' }),
  verify: (accessToken: string, orderId: string, payload: { providerOrderId: string; providerPaymentId: string; signature: string }) =>
    request<PaymentOrder['payment']>(accessToken, `/orders/${encodeURIComponent(orderId)}/verify`, { method: 'POST', body: JSON.stringify(payload) }),
  failed: (accessToken: string, orderId: string, payload: { providerOrderId: string; providerPaymentId?: string }) =>
    request<PaymentOrder['payment']>(accessToken, `/orders/${encodeURIComponent(orderId)}/failed`, { method: 'POST', body: JSON.stringify(payload) }),
};
