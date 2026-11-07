import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';
import { AdminApiError } from './adminService';

export type EligibleDeliveryOrder = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  recipientName: string;
  city: string;
  state: string;
  postalCode: string;
  createdAt: string;
};

export type DeliveryBatchOrderSummary = {
  id: string;
  orderId: string;
  orderNumber: string;
  status: string;
  recipientName: string;
  city: string;
  state: string;
  postalCode: string;
};

export type DeliveryBatchSummary = {
  id: string;
  routeName: string;
  status: string;
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  createdAt: string;
  linkExpiresAt: string | null;
  activeLinkAvailable: boolean;
  orders: DeliveryBatchOrderSummary[];
  operationType: 'NORMAL_DELIVERY' | 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY';
  completed: number;
};

export type DeliveryOtp = {
  orderId: string;
  orderNumber: string;
  recipientName: string;
  phone: string;
  otp: string;
  requestNumber: string | null;
};
export type CreatedDeliveryBatch = {
  batch: DeliveryBatchSummary;
  linkPath: string;
  linkExpiresAt: string;
  deliveryOtps: DeliveryOtp[];
};

export type DriverDeliveryHistory = {
  previousStatus: string | null;
  status: string;
  note: string | null;
  source: string;
  createdAt: string;
};

export type DriverDeliveryOrder = {
  id: string;
  requestNumber: string | null;
  orderNumber: string;
  status: string;
  recipientName: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  countryCode: string;
  latitude: number | null;
  longitude: number | null;
  items: Array<{ productName: string; quantity: number }>;
  history: DriverDeliveryHistory[];
};

export type DriverDeliveryBatch = {
  routeName: string;
  status: string;
  total: number;
  pending: number;
  delivered: number;
  failed: number;
  linkExpiresAt: string | null;
  orders: DriverDeliveryOrder[];
  operationType: 'NORMAL_DELIVERY' | 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY';
  completed: number;
};

export type EligibleReturnDeliveryRequest = {
  id: string;
  requestNumber: string;
  orderNumber: string;
  status: string;
  operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY';
  recipientName: string;
  phone: string;
  city: string;
  state: string;
  postalCode: string;
  createdAt: string;
};

export type AdminDeliveryBatchDetails = {
  batch: DeliveryBatchSummary;
  orders: DriverDeliveryOrder[];
  activeLinkAvailable: boolean;
  activeLinkRecoverable: boolean;
  linkExpiresAt: string | null;
};

export type ActiveDeliveryBatchLink = {
  linkPath: string | null;
  expiresAt: string | null;
  available: boolean;
};

export class DeliveryBatchApiError extends AdminApiError {
  readonly code: string;

  constructor(message: string, status: number, code: string) {
    super(message, status);
    this.name = 'DeliveryBatchApiError';
    this.code = code;
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string; code?: string };
    throw new DeliveryBatchApiError(
      problem.message ?? `Request failed (${response.status})`,
      response.status,
      problem.code ?? 'DELIVERY_REQUEST_FAILED',
    );
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function adminRequest<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  headers.set('Authorization', 'Bearer ' + accessToken);
  const response = await apiFetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers,
  });
  return parseResponse<T>(response);
}

async function publicRequest<T>(path: string, init: RequestInit = {}) {
  const response = await apiFetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init.headers },
  });
  return parseResponse<T>(response);
}

export const deliveryBatchService = {
  eligibleReturnRequests: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY',
                           city: string, state: string, postalCode: string) => {
    const params = new URLSearchParams();
    if (city.trim()) params.set('city', city.trim());
    if (state.trim()) params.set('state', state.trim());
    if (postalCode.trim()) params.set('postalCode', postalCode.trim());
    return adminRequest<EligibleReturnDeliveryRequest[]>(
      accessToken,
      `/api/v1/admin/returns/delivery-batches/${operationType}/eligible-requests?${params.toString()}`,
    );
  },
  returnBatches: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY') =>
    adminRequest<DeliveryBatchSummary[]>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}`,
    ),
  returnBatchDetails: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY', batchId: string) =>
    adminRequest<AdminDeliveryBatchDetails>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}/${encodeURIComponent(batchId)}`,
    ),
  returnBatchActiveLink: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY', batchId: string) =>
    adminRequest<ActiveDeliveryBatchLink>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}/${encodeURIComponent(batchId)}/active-link`,
    ),
  createReturnBatch: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY',
                      routeName: string, requestIds: string[]) =>
    adminRequest<CreatedDeliveryBatch>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}`,
      { method: 'POST', body: JSON.stringify({ routeName, requestIds }) },
    ),
  regenerateReturnBatchLink: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY',
                              batchId: string) =>
    adminRequest<CreatedDeliveryBatch>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}/${encodeURIComponent(batchId)}/link`,
      { method: 'POST' },
    ),
  revokeReturnBatchLink: (accessToken: string, operationType: 'RETURN_PICKUP' | 'REPLACEMENT_DELIVERY',
                          batchId: string) =>
    adminRequest<{ batch: DeliveryBatchSummary; revokedAt: string }>(
      accessToken, `/api/v1/admin/returns/delivery-batches/${operationType}/${encodeURIComponent(batchId)}/link/revoke`,
      { method: 'POST' },
    ),
  eligibleOrders: (accessToken: string, postalCode: string, city: string, includeAssigned: boolean) => {
    const params = new URLSearchParams();
    if (postalCode.trim()) params.set('postalCode', postalCode.trim());
    if (city.trim()) params.set('city', city.trim());
    if (includeAssigned) params.set('includeAssigned', 'true');
    return adminRequest<EligibleDeliveryOrder[]>(
      accessToken,
      `/api/v1/admin/delivery/batches/eligible-orders?${params.toString()}`,
    );
  },
  list: (accessToken: string) => adminRequest<DeliveryBatchSummary[]>(
    accessToken, '/api/v1/admin/delivery/batches',
  ),
  details: (accessToken: string, batchId: string) => adminRequest<AdminDeliveryBatchDetails>(
    accessToken, `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}`,
  ),
  activeLink: (accessToken: string, batchId: string) => adminRequest<ActiveDeliveryBatchLink>(
    accessToken, `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}/active-link`,
  ),
  create: (accessToken: string, routeName: string, orderIds: string[], reassignActiveOrders = false) =>
    adminRequest<CreatedDeliveryBatch>(accessToken, '/api/v1/admin/delivery/batches', {
      method: 'POST',
      body: JSON.stringify({ routeName, orderIds, reassignActiveOrders }),
    }),
  regenerateLink: (accessToken: string, batchId: string) =>
    adminRequest<CreatedDeliveryBatch>(
      accessToken, `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}/link`, { method: 'POST' },
    ),
  regenerateOrderOtp: (accessToken: string, batchId: string, orderId: string) =>
    adminRequest<DeliveryOtp>(
      accessToken,
      `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}/orders/${encodeURIComponent(orderId)}/otp`,
      { method: 'POST' },
    ),
  revokeLink: (accessToken: string, batchId: string) =>
    adminRequest<{ batch: DeliveryBatchSummary; revokedAt: string }>(
      accessToken, `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}/link/revoke`, { method: 'POST' },
    ),
  revoke: (accessToken: string, batchId: string) =>
    adminRequest<DeliveryBatchSummary>(
      accessToken, `/api/v1/admin/delivery/batches/${encodeURIComponent(batchId)}/revoke`, { method: 'POST' },
    ),
  getDriverBatch: (token: string) =>
    publicRequest<DriverDeliveryBatch>(`/api/v1/delivery/batches/${encodeURIComponent(token)}`),
  updateOrderStatus: (token: string, orderId: string, status: string, otp?: string, note?: string) =>
    publicRequest<{ orderId: string; status: string; orderStatus: string; batchStatus: string }>(
      `/api/v1/delivery/batches/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderId)}/status`,
      { method: 'POST', body: JSON.stringify({ status, otp: otp ?? null, note: note ?? null }) },
    ),
};
