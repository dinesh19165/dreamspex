import { apiFetch as fetch } from './apiClient';

import { apiBaseUrl } from '../config/api';

export type ReturnPolicy = {
  enabled: boolean;
  returnWindowDays: number | null;
  updatedAt: string;
};

export type ReturnEligibleItem = {
  orderItemId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  availableQuantity: number;
  refundEstimate: number;
  returnable: boolean;
};

export type ReturnEligibility = {
  orderId: string;
  orderNumber: string;
  eligible: boolean;
  ineligibleReason: string | null;
  deliveredAt: string | null;
  returnDeadline: string | null;
  items: ReturnEligibleItem[];
};

export type OrderItemReturnAction = {
  canRequest: boolean;
  remainingQuantity: number;
  statusLabel: string | null;
};

export type ReturnItem = {
  orderItemId: string;
  productName: string;
  sku: string;
  quantity: number;
  refundAmount: number;
};

export type ReturnEvidence = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
  url: string;
};

export type ReturnHistory = { status: string; createdAt: string };
export type ReturnRefund = {
  amount: number;
  currency: string;
  status: string;
  providerRefundId: string | null;
  createdAt: string;
  processedAt: string | null;
  gatewayCreatedAt: string | null;
};

export type CustomerReturn = {
  id: string;
  requestNumber: string;
  orderId: string;
  orderNumber: string;
  resolution: 'REFUND' | 'REPLACEMENT';
  reasonCode: string;
  description: string | null;
  status: string;
  refundAmount: number;
  createdAt: string;
  items: ReturnItem[];
  evidence: ReturnEvidence[];
  history: ReturnHistory[];
  refunds: ReturnRefund[];
};

export type AdminRefund = ReturnRefund & {
  id: string;
  provider: string;
  providerRefundId: string | null;
  errorMessage: string | null;
  retryable: boolean;
};
export type AdminPayment = {
  provider: string;
  providerPaymentId: string;
  amount: number;
  currency: string;
  status: string;
};

export type AdminReturnHistory = ReturnHistory & { note: string | null; changedBy: string | null };

export type AdminReturn = Omit<CustomerReturn, 'refunds' | 'history'> & {
  adminRemarks: string | null;
  customer: { id: string; displayName: string | null; email: string | null };
  payment: AdminPayment | null;
  history: AdminReturnHistory[];
  refunds: AdminRefund[];
};

export type ReturnableProduct = {
  productId: string;
  name: string;
  sku: string;
  status: string;
  returnable: boolean;
};

export class ReturnApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ReturnApiError';
    this.status = status;
  }
}

export function getOrderItemReturnAction(
  eligibility: ReturnEligibility | null,
  orderReturns: CustomerReturn[],
  orderItemId: string,
  now = new Date(),
): OrderItemReturnAction {
  if (!eligibility) return { canRequest: false, remainingQuantity: 0, statusLabel: 'Eligibility unavailable' };

  const item = eligibility.items.find((candidate) => candidate.orderItemId === orderItemId);
  if (!item) return { canRequest: false, remainingQuantity: 0, statusLabel: 'Not eligible' };
  const windowExpired = Boolean(
    eligibility.ineligibleReason?.toLowerCase().includes('return window has expired')
    || (eligibility.returnDeadline && now.getTime() > new Date(eligibility.returnDeadline).getTime()),
  );

  const itemRequests = orderReturns
    .filter((entry) => entry.items.some((returnItem) => returnItem.orderItemId === orderItemId))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
  const latest = itemRequests[0];
  const latestRefundStatuses = latest?.refunds.map((refund) => refund.status.toUpperCase()) ?? [];

  if (latest?.status === 'REFUNDED' || latestRefundStatuses.includes('PROCESSED')) {
    return {
      canRequest: eligibility.eligible && !windowExpired && item.returnable && item.availableQuantity > 0,
      remainingQuantity: item.availableQuantity,
      statusLabel: `Refunded${item.availableQuantity > 0 ? ` · ${item.availableQuantity} remaining` : ''}`,
    };
  }

  if (latest?.status === 'REPLACED') {
    return {
      canRequest: eligibility.eligible && !windowExpired && item.returnable && item.availableQuantity > 0,
      remainingQuantity: item.availableQuantity,
      statusLabel: `Replacement Completed${item.availableQuantity > 0 ? ` · ${item.availableQuantity} remaining` : ''}`,
    };
  }

  if (latest?.status === 'REFUND_PROCESSING'
      || latestRefundStatuses.some((status) => ['PROCESSING', 'PENDING', 'CREATED', 'SUBMITTING'].includes(status))) {
    return { canRequest: false, remainingQuantity: item.availableQuantity, statusLabel: 'Refund Processing' };
  }

  if (latest && !['REJECTED', 'CANCELLED'].includes(latest.status)) {
    const status = latest.status.replaceAll('_', ' ').toLowerCase()
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
    return {
      canRequest: eligibility.eligible && !windowExpired && item.returnable && item.availableQuantity > 0,
      remainingQuantity: item.availableQuantity,
      statusLabel: `${status}${item.availableQuantity > 0 ? ` · ${item.availableQuantity} remaining` : ''}`,
    };
  }

  if (windowExpired) {
    return { canRequest: false, remainingQuantity: 0, statusLabel: 'Return Period Expired' };
  }

  if (!eligibility.eligible) {
    return { canRequest: false, remainingQuantity: 0, statusLabel: 'Not eligible' };
  }

  if (!item.returnable || item.availableQuantity <= 0) {
    return { canRequest: false, remainingQuantity: 0, statusLabel: null };
  }

  return { canRequest: true, remainingQuantity: item.availableQuantity, statusLabel: null };
}

async function request<T>(token: string, path: string, init: RequestInit = {}): Promise<T> {
  const isFormData = init.body instanceof FormData;
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new ReturnApiError(problem.message ?? `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function requestFile(token: string, path: string): Promise<Blob> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new ReturnApiError(problem.message ?? `Request failed (${response.status})`, response.status);
  }
  return response.blob();
}

export const returnService = {
  policy: (token: string) => request<ReturnPolicy>(token, '/returns/policy'),
  eligibility: (token: string, orderId: string) =>
    request<ReturnEligibility>(token, `/returns/orders/${encodeURIComponent(orderId)}/eligibility`, { cache: 'no-store' }),
  list: (token: string) => request<CustomerReturn[]>(token, '/returns'),
  create: (token: string, orderId: string, value: {
    resolution: 'REFUND' | 'REPLACEMENT';
    reasonCode: string;
    description: string;
    items: Array<{ orderItemId: string; quantity: number }>;
  }) => request<CustomerReturn>(token, `/returns/orders/${encodeURIComponent(orderId)}`, {
    method: 'POST',
    body: JSON.stringify(value),
  }),
  cancel: (token: string, id: string) =>
    request<CustomerReturn>(token, `/returns/${encodeURIComponent(id)}/cancel`, { method: 'POST' }),
  uploadEvidence: (token: string, id: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    return request<ReturnEvidence>(token, `/returns/${encodeURIComponent(id)}/evidence`, {
      method: 'POST',
      body,
    });
  },
  evidenceBlob: (token: string, url: string) => requestFile(token, url),
  adminPolicy: (token: string) => request<ReturnPolicy>(token, '/admin/returns/policy'),
  updatePolicy: (token: string, value: { enabled: boolean; returnWindowDays: number | null }) =>
    request<ReturnPolicy>(token, '/admin/returns/policy', { method: 'PUT', body: JSON.stringify(value) }),
  adminProducts: (token: string, query = '') =>
    request<ReturnableProduct[]>(token, `/admin/returns/products${query ? `?q=${encodeURIComponent(query)}` : ''}`),
  setProductReturnable: (token: string, productId: string, returnable: boolean) =>
    request<ReturnableProduct>(token, `/admin/returns/products/${encodeURIComponent(productId)}`, {
      method: 'PUT',
      body: JSON.stringify({ returnable }),
    }),
  adminList: (token: string, filters: { status?: string; from?: string; to?: string; orderId?: string }) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
    return request<AdminReturn[]>(token, `/admin/returns${query.size ? `?${query}` : ''}`);
  },
  adminGet: (token: string, id: string) =>
    request<AdminReturn>(token, `/admin/returns/${encodeURIComponent(id)}`),
  updateStatus: (token: string, id: string, status: string, adminRemarks: string) =>
    request<AdminReturn>(token, `/admin/returns/${encodeURIComponent(id)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status, adminRemarks }),
    }),
  processRefund: (token: string, id: string, refresh = false) =>
    request<AdminReturn>(token, `/admin/returns/${encodeURIComponent(id)}/refunds${refresh ? '/refresh' : ''}`, {
      method: 'POST',
    }),
};
