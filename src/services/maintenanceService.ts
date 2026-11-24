import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type MaintenanceType = 'FULL_SYSTEM' | 'PAYMENT' | 'AUTH' | 'CATALOG' | 'API';
export type MaintenanceScope = 'ALL' | 'WEB' | 'API';

export type PublicMaintenanceStatus = {
  maintenanceActive: boolean;
  maintenanceType: MaintenanceType;
  targetScope: MaintenanceScope;
  title: string;
  message: string;
  startAt: string | null;
  endAt: string | null;
};

export type AdminMaintenanceSettings = {
  id: number;
  isActive: boolean;
  maintenanceActive: boolean;
  maintenanceType: MaintenanceType;
  targetScope: MaintenanceScope;
  title: string;
  message: string;
  startAt: string | null;
  endAt: string | null;
  adminBypass: boolean;
  createdAt: string;
  updatedAt: string;
  createdById: string | null;
  updatedById: string | null;
};

export type MaintenanceUpdateRequest = {
  isActive: boolean;
  maintenanceType: MaintenanceType;
  targetScope: MaintenanceScope;
  title: string;
  message: string;
  startAt: string | null;
  endAt: string | null;
  adminBypass: boolean;
  remarks: string | null;
};

export type MaintenanceAuditLog = {
  id: number;
  maintenanceId: number | null;
  action: string;
  previousValues: string | null;
  newValues: string | null;
  performedById: string | null;
  performedByName: string | null;
  performedAt: string;
  remarks: string | null;
};

type ProblemResponse = { message?: string; code?: string; fieldErrors?: Array<{ field: string; message: string }> };

export class MaintenanceApiError extends Error {
  readonly status: number;
  readonly code: string | undefined;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'MaintenanceApiError';
    this.status = status;
    this.code = code;
  }
}

async function publicRequest<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new MaintenanceApiError(`Request failed (${response.status})`, response.status);
  return response.json() as Promise<T>;
}

async function adminRequest<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ProblemResponse;
    const fieldMessage = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    throw new MaintenanceApiError(fieldMessage || problem.message || `Request failed (${response.status})`,
      response.status, problem.code);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const maintenanceService = {
  publicStatus: () => publicRequest<PublicMaintenanceStatus>('/api/v1/maintenance/status'),
  getAdmin: (accessToken: string) => adminRequest<AdminMaintenanceSettings>(accessToken, '/api/v1/admin/maintenance'),
  updateAdmin: (accessToken: string, request: MaintenanceUpdateRequest) =>
    adminRequest<AdminMaintenanceSettings>(accessToken, '/api/v1/admin/maintenance', {
      method: 'PUT',
      body: JSON.stringify(request),
    }),
  activate: (accessToken: string, remarks: string) =>
    adminRequest<AdminMaintenanceSettings>(accessToken, '/api/v1/admin/maintenance/activate', {
      method: 'POST',
      body: JSON.stringify({ remarks: remarks.trim() || null }),
    }),
  deactivate: (accessToken: string, remarks: string) =>
    adminRequest<AdminMaintenanceSettings>(accessToken, '/api/v1/admin/maintenance/deactivate', {
      method: 'POST',
      body: JSON.stringify({ remarks: remarks.trim() || null }),
    }),
  auditLogs: (accessToken: string) =>
    adminRequest<MaintenanceAuditLog[]>(accessToken, '/api/v1/admin/maintenance/audit-logs'),
};
