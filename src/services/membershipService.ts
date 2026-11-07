import { apiFetch as fetch } from './apiClient';

import { apiBaseUrl } from '../config/api';

export type MembershipPlan = {
  id: string;
  name: string;
  description: string;
  price: number;
  durationDays: number;
  perks: string[];
  status: string;
  discountPercentage: number | null;
  recommended: boolean;
};

export type MembershipPaymentIntent = {
  id: string;
  provider: string;
  providerOrderId: string;
  status: string;
  amount: number;
  currency: string;
  signatureVerified: boolean;
  keyId: string;
};

export type ActiveMembership = {
  id: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING';
  startsAt: string;
  expiresAt: string;
};

export type MembershipOverview = {
  id: string;
  planId: string;
  planName: string;
  status: 'ACTIVE' | 'EXPIRED' | 'PENDING' | string;
  discountPercentage: number | null;
  benefits: string[];
  purchasedAt: string;
  startsAt: string | null;
  expiresAt: string | null;
};

export type MembershipDashboard = {
  current: MembershipOverview | null;
  history: MembershipOverview[];
  paymentHistory: Array<{
    id: string;
    planName: string;
    provider: string;
    amount: number;
    currency: string;
    status: string;
    createdAt: string;
  }>;
};

export type MembershipPlanRequest = {
  name: string;
  description: string;
  price: number;
  durationDays: number;
  perks: string[];
  status: string;
  discountPercentage: number;
  recommended: boolean;
};

export type AdminMembership = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  planId: string;
  planName: string;
  status: string;
  purchasedAt: string;
  startsAt: string;
  expiresAt: string;
};

export type AdminMembershipPayment = {
  id: string;
  customerId: string;
  customerName: string | null;
  customerEmail: string | null;
  planName: string;
  provider: string;
  amount: number;
  currency: string;
  status: string;
  createdAt: string;
};

async function customerRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/membership-plans${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(problem.message ?? `Membership request failed (${response.status}).`);
  }
  return response.json() as Promise<T>;
}

async function adminRequest<T>(accessToken: string, path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}/api/v1/admin/membership-plans${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new Error(problem.message ?? `Membership administration request failed (${response.status}).`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export async function fetchMembershipPlans(signal?: AbortSignal): Promise<MembershipPlan[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/membership-plans`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Membership plans request failed (${response.status}).`);
  return response.json() as Promise<MembershipPlan[]>;
}

export const membershipService = {
  current: (accessToken: string) => customerRequest<ActiveMembership>(accessToken, '/me/current'),
  dashboard: (accessToken: string) => customerRequest<MembershipDashboard>(accessToken, '/me'),
  createPaymentIntent: (accessToken: string, planId: string) =>
    customerRequest<MembershipPaymentIntent>(accessToken, `/${encodeURIComponent(planId)}/payment-intent`, { method: 'POST' }),
  verifyPayment: (accessToken: string, planId: string, payload: {
    providerOrderId: string;
    providerPaymentId: string;
    signature: string;
  }) => customerRequest<ActiveMembership>(accessToken, `/${encodeURIComponent(planId)}/verify`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updatePaymentStatus: (accessToken: string, planId: string, payload: {
    providerOrderId: string;
    status: 'FAILED' | 'CANCELLED';
  }) => customerRequest<MembershipPaymentIntent>(accessToken, `/${encodeURIComponent(planId)}/payment-status`, {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  adminPlans: (accessToken: string) => adminRequest<MembershipPlan[]>(accessToken, ''),
  savePlan: (accessToken: string, request: MembershipPlanRequest, id?: string) =>
    adminRequest<MembershipPlan>(accessToken, id ? `/${encodeURIComponent(id)}` : '', {
      method: id ? 'PATCH' : 'POST',
      body: JSON.stringify(request),
    }),
  adminMemberships: (accessToken: string) => adminRequest<AdminMembership[]>(accessToken, '/memberships'),
  adminPayments: (accessToken: string) => adminRequest<AdminMembershipPayment[]>(accessToken, '/payments'),
};
