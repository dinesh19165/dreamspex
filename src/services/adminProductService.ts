import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type AdminCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
  categoryType?: 'CATALOG' | 'OFFER';
};

export type AdminCategoryRequest = Omit<AdminCategory, 'id'>;

export type AdminProductVariant = {
  id?: string;
  sku: string;
  color: string | null;
  size: string | null;
  lensType: string | null;
  additionalPrice: number;
  quantity: number;
  availableQuantity?: number;
  reservedQuantity?: number;
  status: string;
};

export type AdminProductImage = {
  id?: string;
  imageUrl: string;
  storageKey: string | null;
  altText: string | null;
  sortOrder: number;
  primaryImage: boolean;
};

export type AdminProduct = {
  id: string;
  sku: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  material: string | null;
  gender: string | null;
  frameShape: string | null;
  frameType: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  badge: string | null;
  tryOnImageUrl: string | null;
  status: string;
  categories: AdminCategory[];
  variants: AdminProductVariant[];
  images: AdminProductImage[];
};

export type AdminProductRequest = {
  sku: string;
  name: string;
  slug: string;
  brand: string;
  description: string;
  material: string | null;
  gender: string | null;
  frameShape: string | null;
  frameType: string | null;
  basePrice: number;
  compareAtPrice: number | null;
  badge: string | null;
  tryOnImageUrl: string | null;
  status: string;
  categoryIds: string[];
  variants: Array<{
    id?: string;
    sku: string;
    color: string | null;
    size: string | null;
    lensType: string | null;
    additionalPrice: number;
    quantity: number;
    reservedQuantity: number;
    status: string;
  }>;
  images: Array<{
    imageUrl: string;
    storageKey: string | null;
    altText: string | null;
    sortOrder: number;
    primaryImage: boolean;
  }>;
};

export type AdminProductReturnability = {
  productId: string;
  name: string;
  sku: string;
  status: string;
  returnable: boolean;
};

type ProblemResponse = { message?: string; fieldErrors?: Array<{ field: string; message: string }> };

function token() {
  try {
    const raw = window.localStorage.getItem('dream-spex-auth-session');
    return raw ? (JSON.parse(raw) as { accessToken?: string }).accessToken : undefined;
  } catch {
    return undefined;
  }
}

async function request<T>(path: string, init: RequestInit = {}) {
  const accessToken = token();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemResponse;
    const fieldMessage = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    throw new Error(fieldMessage || problem.message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const adminProductService = {
  list: () => request<AdminProduct[]>('/api/v1/admin/products'),
  categories: () => request<AdminCategory[]>('/api/v1/categories'),
  createCategory: (category: AdminCategoryRequest) =>
    request<AdminCategory>('/api/v1/admin/categories', { method: 'POST', body: JSON.stringify(category) }),
  updateCategory: (id: string, category: AdminCategoryRequest) =>
    request<AdminCategory>(`/api/v1/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(category) }),
  deleteCategory: (id: string) =>
    request<void>(`/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  create: (product: AdminProductRequest) =>
    request<AdminProduct>('/api/v1/admin/products', { method: 'POST', body: JSON.stringify(product) }),
  update: (id: string, product: AdminProductRequest) =>
    request<AdminProduct>(`/api/v1/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(product) }),
  delete: (id: string) =>
    request<void>(`/api/v1/admin/products/${id}`, { method: 'DELETE' }),
  setStatus: (id: string, status: string) =>
    request<AdminProduct>(`/api/v1/admin/products/${id}/status?value=${encodeURIComponent(status)}`, { method: 'PATCH' }),
  returnability: () => request<AdminProductReturnability[]>('/api/v1/admin/returns/products'),
  setReturnable: (id: string, returnable: boolean) =>
    request<AdminProductReturnability>(`/api/v1/admin/returns/products/${encodeURIComponent(id)}`, {
      method: 'PUT',
      body: JSON.stringify({ returnable }),
    }),
};

export async function adminLogin(identifier: string, password: string) {
  const response = await fetch(`${apiBaseUrl}/api/v1/auth/admin/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier, password }),
  });
  if (!response.ok) {
    const problem = (await response.json().catch(() => ({}))) as ProblemResponse;
    throw new Error(problem.message || 'Invalid admin credentials.');
  }
  return response.json() as Promise<{
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
    user: { id: string; displayName: string; email: string | null; phone: string | null; roles: string[] };
  }>;
}
