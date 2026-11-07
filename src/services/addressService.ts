import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type CustomerAddress = {
  id: string;
  label: string | null;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string | null;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  defaultAddress: boolean;
  latitude: number | null;
  longitude: number | null;
};

export type CustomerAddressRequest = {
  label: string;
  recipientName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  defaultAddress: boolean;
  latitude: number | null;
  longitude: number | null;
};

export class AddressApiError extends Error {
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

async function request<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1/me/addresses${path}`, {
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
    throw new AddressApiError(fieldMessage || problem.message || `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const addressService = {
  list: (accessToken: string) => request<CustomerAddress[]>(accessToken, ''),
  create: (accessToken: string, address: CustomerAddressRequest) =>
    request<CustomerAddress>(accessToken, '', { method: 'POST', body: JSON.stringify(address) }),
  update: (accessToken: string, id: string, address: CustomerAddressRequest) =>
    request<CustomerAddress>(accessToken, `/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(address) }),
  remove: (accessToken: string, id: string) =>
    request<void>(accessToken, `/${encodeURIComponent(id)}`, { method: 'DELETE' }),
};
