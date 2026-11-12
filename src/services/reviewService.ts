import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type RatingSummary = {
  averageRating: number;
  totalReviews: number;
  distribution: Record<string, number>;
};

export type PublicReview = {
  id: string;
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
  customerName: string;
  submittedAt: string;
};

export type ProductReviewFeed = {
  summary: RatingSummary;
  reviews: PublicReview[];
};

export type ReviewEligibility = {
  productId: string;
  productName: string;
  productImageUrl: string | null;
  orderId: string;
  orderNumber: string;
  eligible: boolean;
  reviewId: string | null;
  moderationStatus: string | null;
  rating: number | null;
  title: string | null;
  content: string | null;
  imageUrls: string[];
  submittedAt: string | null;
};

export type AdminReview = {
  id: string;
  productId: string;
  productName: string;
  productImageUrl: string | null;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string | null;
  rating: number;
  title: string;
  content: string;
  imageUrls: string[];
  moderationStatus: 'PENDING' | 'APPROVED' | 'HIDDEN' | 'REJECTED';
  submittedAt: string;
  updatedAt: string;
  moderatedAt: string | null;
  moderatorName: string | null;
};

export type AdminReviewResponse = {
  reviews: AdminReview[];
  statistics: {
    totalReviews: number;
    validReviewCount: number;
    pendingReviews: number;
    approvedReviews: number;
    hiddenReviews: number;
    rejectedReviews: number;
    distribution: Record<string, number>;
  };
};

type ProblemResponse = { message?: string; code?: string };

export class ReviewApiError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(message: string, status: number, code = 'REVIEW_REQUEST_FAILED') {
    super(message);
    this.name = 'ReviewApiError';
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, accessToken?: string, init: RequestInit = {}) {
  const response = await apiFetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as ProblemResponse;
    throw new ReviewApiError(problem.message ?? `Review request failed (${response.status})`,
      response.status, problem.code);
  }
  return response.json() as Promise<T>;
}

export const reviewService = {
  product: (productId: string) =>
    request<ProductReviewFeed>(`/products/${encodeURIComponent(productId)}/reviews`),
  orderEligibility: (accessToken: string, orderId: string) =>
    request<ReviewEligibility[]>(`/me/orders/${encodeURIComponent(orderId)}/reviews`, accessToken),
  create: (accessToken: string, orderId: string, productId: string,
           payload: { rating: number; title: string; content: string; imageUrls: string[] }) =>
    request<ReviewEligibility>(
      `/me/orders/${encodeURIComponent(orderId)}/products/${encodeURIComponent(productId)}/reviews`,
      accessToken, { method: 'POST', body: JSON.stringify(payload) }),
  update: (accessToken: string, reviewId: string,
           payload: { rating: number; title: string; content: string; imageUrls: string[] }) =>
    request<ReviewEligibility>(`/me/product-reviews/${encodeURIComponent(reviewId)}`, accessToken,
      { method: 'PUT', body: JSON.stringify(payload) }),
  adminList: (accessToken: string) =>
    request<AdminReviewResponse>('/admin/product-reviews', accessToken),
  moderate: (accessToken: string, reviewId: string,
             status: 'APPROVED' | 'HIDDEN' | 'REJECTED') =>
    request<AdminReview>(`/admin/product-reviews/${encodeURIComponent(reviewId)}/moderation`,
      accessToken, { method: 'PATCH', body: JSON.stringify({ status }) }),
};
