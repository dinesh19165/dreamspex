import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type CustomerProfile = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  dateOfBirth: string | null;
  gender: string | null;
  marketingOptIn: boolean;
  roles: string[];
};

export type CustomerProfileUpdate = {
  displayName?: string;
  firstName?: string;
  lastName?: string;
  dateOfBirth?: string;
  gender?: string;
  marketingOptIn?: boolean;
};

export class ProfileApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

type ProblemResponse = {
  message?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
};

async function request<T>(accessToken: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/me`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemResponse;
    const fieldMessage = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    throw new ProfileApiError(fieldMessage || problem.message || `Request failed (${response.status})`, response.status);
  }
  return response.json() as Promise<T>;
}

export const profileService = {
  get: (accessToken: string) => request<CustomerProfile>(accessToken),
  update: (accessToken: string, profile: CustomerProfileUpdate) =>
    request<CustomerProfile>(accessToken, { method: 'PATCH', body: JSON.stringify(profile) }),
};
