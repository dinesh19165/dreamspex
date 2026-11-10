import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type GstOrderSnapshot = {
  taxableAmount: number;
  gstAmount: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  finalAmount: number;
  appliedRate: number | null;
  priceTreatment: 'INCLUSIVE' | 'EXCLUSIVE';
  items: Array<{
    productId: string;
    productName: string;
    hsnCode: string | null;
    appliedRate: number;
    taxableAmount: number;
    gstAmount: number;
    cgstAmount: number;
    sgstAmount: number;
    igstAmount: number;
    grossAmount: number;
  }>;
};

export type OrderResponse = {
  id: string;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  couponDiscount: number;
  membershipDiscount: number;
  shipping: number;
  total: number;
  gstRate?: number | null;
  taxableAmount?: number | null;
  gstAmount?: number | null;
  appliedRate?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  priceTreatment?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  gstSnapshot?: GstOrderSnapshot | null;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  couponCode: string | null;
  createdAt: string;
  items: OrderItemResponse[];
  history: OrderHistoryResponse[];
};

export type CheckoutQuoteResponse = {
  subtotal: number;
  discount: number;
  couponDiscount: number;
  membershipDiscount: number;
  shipping: number;
  total: number;
  gstRate?: number | null;
  taxableAmount?: number | null;
  gstAmount?: number | null;
  appliedRate?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  priceTreatment?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  gstSnapshot?: GstOrderSnapshot | null;
  loyaltyPointsAvailable?: number;
  loyaltyPointsRedeemed?: number;
  loyaltyDiscount?: number;
  loyaltyPointsMaxRedeemable?: number;
  couponCode: string | null;
  deliveryAvailability: {
    available: boolean;
    status: 'AVAILABLE' | 'LOCATION_REQUIRED' | 'STORE_CONFIGURATION_REQUIRED' | 'OUTSIDE_DELIVERY_AREA';
    distanceKm: number | null;
    radiusKm: number | null;
    storeName: string | null;
    message: string;
  };

};

export type OrderItemResponse = {
  id: string;
  productName: string;
  sku: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
  lensPreparation: LensPreparationProgress | null;
};

export type LensPreparationProgress = {
  status: 'PENDING' | 'IN_PREPARATION' | 'READY_FOR_DISPATCH';
  updatedAt: string | null;
};

export type OrderHistoryResponse = {
  status: string;
  note: string | null;
  createdAt: string;
};

export class OrderApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'ORDER_REQUEST_FAILED') {
    super(message);
    this.name = 'OrderApiError';
    this.status = status;
    this.code = code;
  }
}

type ProblemResponse = {
  message?: string;
  code?: string;
  fieldErrors?: Array<{ field: string; message: string }>;
};

async function request<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}`, ...init.headers },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ProblemResponse;
    const fieldErrors = problem.fieldErrors?.map((error) => `${error.field}: ${error.message}`).join(', ');
    const message = [problem.message, fieldErrors].filter(Boolean).join(' ');
    throw new OrderApiError(message || `Request failed (${response.status})`, response.status,
      problem.code ?? 'ORDER_REQUEST_FAILED');
  }
  return response.json() as Promise<T>;
}

export const orderService = {
  quote: (accessToken: string, addressId: string, couponCode: string | null, loyaltyPoints = 0) =>
    request<CheckoutQuoteResponse>(accessToken, '/checkout/quote', {
      method: 'POST',
      body: JSON.stringify({ addressId, couponCode, ...(loyaltyPoints > 0 ? { loyaltyPoints } : {}) }),
    }),
  list: (accessToken: string) => request<OrderResponse[]>(accessToken, '/orders'),
  get: (accessToken: string, orderId: string) =>
    request<OrderResponse>(accessToken, `/orders/${encodeURIComponent(orderId)}`),
  create: (accessToken: string, addressId: string, couponCode: string | null, idempotencyKey: string, loyaltyPoints = 0) =>
    request<OrderResponse>(accessToken, '/orders', {
      method: 'POST',
      headers: { 'Idempotency-Key': idempotencyKey },
      body: JSON.stringify({ addressId, couponCode, ...(loyaltyPoints > 0 ? { loyaltyPoints } : {}) }),
    }),
};
