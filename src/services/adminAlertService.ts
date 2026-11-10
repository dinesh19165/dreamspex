import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type AdminAlert = {
  id: string;
  type: 'ORDER' | 'REFUND' | 'REPLACEMENT';
  title: string;
  sourceId: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  eventAt: string;
  acknowledgedAt: string | null;
  resolvedAt: string | null;
};

export function getNewAdminAlerts(nextAlerts: AdminAlert[], seenIds: Set<string> | null) {
  if (seenIds === null) return nextAlerts.filter((alert) => !alert.acknowledgedAt && !alert.resolvedAt);
  return nextAlerts.filter((alert) => !seenIds.has(alert.id));
}

export class AdminAlertApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminAlertApiError';
    this.status = status;
  }
}

async function request<T>(token: string, path: string, method = 'GET'): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl}/api/v1/admin/alerts${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new AdminAlertApiError(problem.message ?? `Admin alerts request failed (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const adminAlertService = {
  list: (token: string) => request<AdminAlert[]>(token, ''),
  acknowledge: (token: string, id: string) => request<AdminAlert>(token, `/${encodeURIComponent(id)}/acknowledge`, 'POST'),
  acknowledgeAll: (token: string) => request<void>(token, '/acknowledge-all', 'POST'),
};
