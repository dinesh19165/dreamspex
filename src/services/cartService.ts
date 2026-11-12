import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type CartItemResponse = {
  id: string;
  variantId: string;
  productId: string;
  productName: string;
  imageUrl: string | null;
  sku: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  availableQuantity: number;
  prescriptionId: string | null;
  selectedLensCodes: string[];
  lensAdditionalPrice: number;
};

export type CartResponse = {
  id: string;
  items: CartItemResponse[];
  subtotal: number;
};

export class CartApiError extends Error {
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
  const response = await fetch(`${apiBaseUrl}/api/v1/cart${path}`, {
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
    throw new CartApiError(fieldMessage || problem.message || `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const cartService = {
  get: (accessToken: string, franchiseId?: string) =>
    request<CartResponse>(accessToken, franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : ''),
  add: (accessToken: string, variantId: string, quantity: number, prescriptionId?: string,
    selectedLensCodes?: string[], franchiseId?: string) =>
    request<CartResponse>(accessToken, '/items', {
      method: 'POST',
      body: JSON.stringify({ variantId, quantity, prescriptionId, selectedLensCodes, franchiseId }),
    }),
  update: (accessToken: string, itemId: string, quantity: number, franchiseId?: string) =>
    request<CartResponse>(accessToken, `/items/${encodeURIComponent(itemId)}?quantity=${quantity}${franchiseId ? `&franchiseId=${encodeURIComponent(franchiseId)}` : ''}`, { method: 'PATCH' }),
  remove: (accessToken: string, itemId: string) =>
    request<void>(accessToken, `/items/${encodeURIComponent(itemId)}`, { method: 'DELETE' }),
};
