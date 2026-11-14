import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type Franchise = {
  id: string;
  franchiseCode: string;
  name: string;
  ownerName: string | null;
  ownerEmail: string | null;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  gstNumber: string | null;
  businessType: string | null;
  openingHours: string | null;
  availableServices: string[];
  status: string;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
  products: number;
  orders: number;
  sales: number;
  createdAt: string;
};

export type FranchiseRequest = Omit<Franchise,
  'id' | 'products' | 'orders' | 'sales' | 'createdAt' | 'ownerEmail' | 'availableServices'> & {
    email: string;
    availableServices: string;
  };
export type FranchiseCreateResponse = {
  franchise: Franchise;
  loginEmail: string;
  passwordSetupPath: string;
};
export type FranchiseUser = {
  userId: string;
  name: string;
  email: string;
  phone: string;
  status: string;
  role: 'Franchise Admin' | 'Franchise Manager' | 'Franchise Staff' | null;
  createdAt: string;
};
export type FranchiseInventory = {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  sku: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  lowStockThreshold: number;
  availabilityStatus: string;
  stockState: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
};
export type FranchiseAssignment = {
  productId: string;
  productName: string;
  brand: string;
  availabilityStatus: string;
  inventory: FranchiseInventory[];
};
export type FranchiseDashboard = {
  assignedProducts: number;
  availableUnits: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalOrders: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  readyForPickupOrders?: number;
  pickedUpOrders?: number;
  refundRequests: number;
  sales: number;
  refunds: number;
  completedRefunds: number;
};
export type FranchiseOrder = {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  status: string;
  paymentStatus: string;
  fulfillmentType?: 'DELIVERY' | 'PICKUP' | 'STORE_PICKUP' | string;
  fulfillmentStore?: {
    id: string;
    name: string;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  shippingAddress?: {
    recipientName: string | null;
    phone: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    countryCode: string | null;
  } | null;
  amount: number;
  products: string[];
  createdAt: string;
};
export type FranchiseReport = {
  franchiseId: string;
  franchiseName: string;
  from: string;
  to: string;
  orderCount: number;
  paidOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  deliveredOrders: number;
  refundRequests: number;
  completedRefunds: number;
  revenue: number;
  refunds: number;
};
export type FranchiseReturn = {
  id: string;
  requestNumber: string;
  orderNumber: string;
  customerName: string;
  status: string;
  reasonCode: string;
  refundAmount: number;
  createdAt: string;
};

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as {
      message?: string;
      fieldErrors?: Array<{ field?: string; message?: string }>;
    };
    const fieldErrors = problem.fieldErrors
      ?.map((fieldError) => [fieldError.field, fieldError.message].filter(Boolean).join(': '))
      .filter(Boolean);
    const message = [problem.message, ...(fieldErrors ?? [])].filter(Boolean).join(' ');
    throw new Error(message || `Request failed (${response.status})`);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const franchiseService = {
  login: (email: string, password: string) => apiFetch(`${apiBaseUrl}/api/v1/auth/franchise/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: email, password }),
  }),
  adminList: (token: string) => request<Franchise[]>(token, '/api/v1/admin/franchises'),
  adminGet: (token: string, id: string) =>
    request<Franchise>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}`),
  create: (token: string, data: FranchiseRequest) =>
    request<FranchiseCreateResponse>(token, '/api/v1/admin/franchises', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  update: (token: string, id: string, data: FranchiseRequest) =>
    request<Franchise>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  users: (token: string, id: string) =>
    request<FranchiseUser[]>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/users`),
  adminProducts: (token: string, id: string) =>
    request<FranchiseAssignment[]>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/products`),
  ordersForAdmin: (token: string, id: string) =>
    request<FranchiseOrder[]>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/orders`),
  returnsForAdmin: (token: string, id: string) =>
    request<FranchiseReturn[]>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/returns`),
  assignProduct: (token: string, id: string, productId: string, initialStock: number, lowStockThreshold: number) =>
    request<FranchiseAssignment[]>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/products`, {
      method: 'POST',
      body: JSON.stringify({ productId, initialStock, lowStockThreshold, availabilityStatus: 'ACTIVE' }),
    }),
  adjustInventory: (token: string, id: string, inventoryId: string, quantity: number, lowStockThreshold: number) =>
    request<FranchiseInventory>(token, `/api/v1/admin/franchises/${encodeURIComponent(id)}/inventory/${encodeURIComponent(inventoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, lowStockThreshold, note: 'Super Admin stock adjustment' }),
    }),
  adjustOwnInventory: (token: string, inventoryId: string, quantity: number, lowStockThreshold: number) =>
    request<FranchiseInventory>(token, `/api/v1/franchise/inventory/${encodeURIComponent(inventoryId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ quantity, lowStockThreshold, note: 'Franchise stock adjustment' }),
    }),
  me: (token: string) => request<Franchise>(token, '/api/v1/franchise/me'),
  dashboard: (token: string) => request<FranchiseDashboard>(token, '/api/v1/franchise/dashboard'),
  products: (token: string) => request<FranchiseAssignment[]>(token, '/api/v1/franchise/products'),
  inventory: (token: string) => request<FranchiseInventory[]>(token, '/api/v1/franchise/inventory'),
  orders: (token: string) => request<FranchiseOrder[]>(token, '/api/v1/franchise/orders'),
  returns: (token: string) => request<FranchiseReturn[]>(token, '/api/v1/franchise/returns'),
  order: (token: string, id: string) => request<FranchiseOrder>(token, `/api/v1/franchise/orders/${encodeURIComponent(id)}`),
  updateOrderStatus: (token: string, id: string, status: string) =>
    request<FranchiseOrder>(token, `/api/v1/franchise/orders/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
  report: (token: string, from: string, to: string) =>
    request<FranchiseReport>(token, `/api/v1/franchise/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
  adminReports: (token: string, from: string, to: string) =>
    request<FranchiseReport[]>(token, `/api/v1/admin/franchises/reports?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`),
};
