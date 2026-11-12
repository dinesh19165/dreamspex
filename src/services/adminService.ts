import { apiFetch as fetch } from './apiClient';

import type { GstOrderSnapshot, OrderHistoryResponse, OrderItemResponse, OrderResponse } from './orderService';
import type { LensOption } from './prescriptionService';
import { apiBaseUrl, resolveCmsMediaUrl } from '../config/api';
import type { Offer, OfferRequest } from './offerService';
import type { AdminCategory, AdminCategoryRequest } from './adminProductService';

export type AdminOrder = {
  id: string;
  orderNumber: string;
  paymentMethod?: string | null;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  gstRate?: number | null;
  taxableAmount?: number | null;
  gstAmount?: number | null;
  cgstAmount?: number | null;
  sgstAmount?: number | null;
  igstAmount?: number | null;
  appliedRate?: number | null;
  priceTreatment?: 'INCLUSIVE' | 'EXCLUSIVE' | null;
  gstSnapshot?: GstOrderSnapshot | null;
  couponCode: string | null;
  createdAt: string;
  customer: { id: string; displayName: string | null; email: string | null; phone: string | null } | null;
  fulfillmentType?: string | null;
  fulfillmentStoreId?: string | null;
  fulfillmentStore?: {
    id: string;
    name: string;
    phone: string | null;
    address: string;
    city: string;
    state: string;
    postalCode: string;
  } | null;
  shippingAddress: {
    recipientName: string | null;
    phone: string | null;
    line1: string | null;
    line2: string | null;
    city: string | null;
    state: string | null;
    postalCode: string | null;
    countryCode: string | null;
  } | null;
  items: AdminOrderItem[];
  history: OrderHistoryResponse[];
};

export type AdminGstSettings = {
  id: string;
  defaultRate: number;
  priceTreatment: 'INCLUSIVE' | 'EXCLUSIVE';
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
  updatedById: string | null;
  updatedByName: string | null;
};

export type AdminGstSettingsRequest = Pick<AdminGstSettings, 'defaultRate' | 'priceTreatment' | 'enabled'>;
export type AdminGstHistoryEntry = AdminGstSettings & { active: boolean };

export type AdminOrderItem = OrderItemResponse & {
  lensAdditionalPrice: number;
  selectedLensCodes: string[];
  prescription: AdminPrescriptionDetails | null;
  lensPreparation: LensPreparationDetails | null;
};

type AdminOrderReportRow = { order: AdminOrder; paymentMethod: string | null };

export type AdminPrescriptionDetails = {
  id: string;
  patientName: string | null;
  prescriptionDate: string | null;
  expiryDate: string | null;
  rightSph: number | null;
  rightCyl: number | null;
  rightAxis: number | null;
  rightAdd: number | null;
  leftSph: number | null;
  leftCyl: number | null;
  leftAxis: number | null;
  leftAdd: number | null;
  pd: number | null;
  rightPd: number | null;
  leftPd: number | null;
  source: 'UPLOAD' | 'MANUAL';
  files: Array<{ id: string; originalName: string; contentType: string; sizeBytes: number }>;
  selectedLenses: Array<{ code: string; name: string; category: string | null; preparationDays: number | null }>;
  preparationDays: number | null;
};

export type LensPreparationDetails = {
  status: 'PENDING' | 'IN_PREPARATION' | 'READY_FOR_DISPATCH';
  notes: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
};

function normalizeCmsBanner(banner: CmsBanner): CmsBanner {
  return {
    ...banner,
    desktopImageUrl: resolveCmsMediaUrl(banner.desktopImageUrl) ?? '',
    mobileImageUrl: resolveCmsMediaUrl(banner.mobileImageUrl),
    desktopVideoUrl: resolveCmsMediaUrl(banner.desktopVideoUrl) ?? '',
    desktopVideoStorageKey: banner.desktopVideoStorageKey ?? '',
  };
}

export type AdminDashboard = {
  customers: number;
  activeCustomers: number;
  products: number;
  orders: number;
  pendingOrders: number;
  lowStockVariants: number;
  revenue: number;
};

export type AdminReportTrendPoint = { date: string; value: number; count: number };
export type AdminReport = {
  startDate: string;
  endDate: string;
  revenue: {
    paidRevenue: number;
    refundDeductions: number;
    netRevenue: number;
    discounts: number;
    gstCollected: number;
    today: number;
    last7Days: number;
    last30Days: number;
    thisMonth: number;
    thisYear: number;
    trend: AdminReportTrendPoint[];
  };
  orders: {
    total: number;
    paid: number;
    pending: number;
    cancelled: number;
    delivered: number;
    averageOrderValue: number;
    trend: AdminReportTrendPoint[];
  };
  customers: {
    totalRegistered: number;
    newCustomers: number;
    repeatCustomers: number;
    trend: AdminReportTrendPoint[];
  };
  products: {
    bestSelling: Array<{ productId: string; name: string; quantity: number; revenue: number }>;
    categorySales: Array<{ categoryId: string; name: string; quantity: number; revenue: number }>;
    lowStock: Array<{ productId: string; name: string; sku: string; lowStockVariants: number; availableUnits: number }>;
  };
  returns: {
    total: number;
    approved: number;
    rejected: number;
    pending: number;
    processedRefunds: number;
    refundedAmount: number;
    pendingRefundAmount: number;
  };
  memberships: {
    active: number;
    expired: number;
    revenue: number;
    planCounts: Array<{ planName: string; count: number }>;
  };
};

export type AdminCustomer = {
  id: string;
  displayName: string;
  email: string | null;
  phone: string | null;
  createdAt: string;
  status: string;
  orderCount: number;
};

export type AdminCustomerPage = {
  items: AdminCustomer[];
  page: number;
  pageSize: number;
  total: number;
};

export type AdminLensOptionRequest = Omit<LensOption, 'id' | 'recommended' | 'recommendationReason'>;

export type AdminStore = {
  id: string;
  name: string;
  phone: string | null;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  latitude: number | null;
  longitude: number | null;
  deliveryRadiusKm: number | null;
  status: string;
};

export type AdminStoreRequest = Omit<AdminStore, 'id'>;

export type AdminSettings = {
  storeName: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  primaryColor: string;
  secondaryColor: string;
  currency: string;
  shippingFee: number;
  freeShippingThreshold: number;
  sessionTimeoutMinutes: number;
  notifications: {
    emailNotifications: boolean;
    orderConfirmationAlerts: boolean;
    paymentAlerts: boolean;
    newCustomerAlerts: boolean;
    lowStockAlerts: boolean;
  };

  security: { adminName: string; adminEmail: string | null; passwordPolicy: string };
  integrations: { razorpayConfigured: boolean; smtpConfigured: boolean; smsConfigured: boolean; whatsappConfigured: boolean };
  email: { smtpHost: string | null; smtpPort: number | null; smtpUsername: string | null; passwordConfigured: boolean; fromEmail: string | null; senderDisplayName: string | null; tlsEnabled: boolean; sslEnabled: boolean; enabled: boolean };
};

export type AdminSettingsRequest = Omit<AdminSettings, 'security' | 'integrations' | 'email'> & {
  email: Omit<AdminSettings['email'], 'passwordConfigured'> & { smtpPassword?: string };
};
export type CmsBanner = { id: string; title: string; subtitle: string | null; description: string | null; desktopImageUrl: string; mobileImageUrl: string | null; desktopStorageKey: string | null; mobileStorageKey: string | null; desktopMediaType: 'IMAGE' | 'VIDEO'; desktopVideoUrl: string; desktopVideoStorageKey: string; buttonText: string | null; linkUrl: string | null; secondaryButtonText: string | null; secondaryLinkUrl: string | null; positioning: string | null; sortOrder: number; status: string; startsAt: string | null; endsAt: string | null };
export type CmsSection = { id: string; slug: string; sectionType: string; title: string | null; subtitle: string | null; contentJson: string | null; displayOrder: number; status: string; enabled: boolean; products: Array<{ id: string }>; categories: Array<{ id: string }>; productIds?: string[]; categoryIds?: string[] };
export type CmsCardSection = 'CATEGORY_BANNER' | 'FRAME_SHAPE' | 'TRENDING_PRODUCT' | 'PROMOTIONAL' | 'SHOP_BY_WEARER' | 'EXPLORE_BY_BRAND';
export type CmsCardDestinationType = 'PAGE' | 'CATEGORY' | 'PRODUCT' | 'BRAND' | 'GENDER' | 'SHAPE';
export type CmsHomepageCard = {
  id: string;
  sectionKey: CmsCardSection;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  imageStorageKey: string | null;
  buttonText: string | null;
  destinationType: CmsCardDestinationType;
  destinationValue: string;
  displayOrder: number;
  status: string;
  enabled: boolean;
  product: { id: string; name: string; slug: string; brand: string; price: number; compareAtPrice: number | null; imageUrl: string | null; badge: string | null; description: string; category: string } | null;
  category: { id: string; name: string; slug: string; imageUrl: string | null } | null;
};
export type CmsHomepageCardRequest = Omit<CmsHomepageCard, 'id' | 'product' | 'category'>;
export type CmsHomepage = { banners: CmsBanner[]; sections: CmsSection[]; cards: CmsHomepageCard[] };

export class AdminApiError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'AdminApiError';
    this.status = status;
  }
}

async function request<T>(accessToken: string, path: string, init: RequestInit = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
      ...init.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new AdminApiError(problem.message ?? `Request failed (${response.status})`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

async function requestPrivateFile(accessToken: string, path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new AdminApiError(problem.message ?? `Request failed (${response.status})`, response.status);
  }
  return response.blob();
}

export const adminService = {
  dashboard: (accessToken: string) => request<AdminDashboard>(accessToken, '/api/v1/admin/dashboard'),
  reports: (accessToken: string, startDate: string, endDate: string) =>
    request<AdminReport>(accessToken, `/api/v1/admin/reports?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`),
  customers: (accessToken: string, query: string, page: number, size: number) =>
    request<AdminCustomerPage>(accessToken, `/api/v1/admin/customers?page=${page}&size=${size}${query.trim() ? `&q=${encodeURIComponent(query.trim())}` : ''}`),
  stores: (accessToken: string) => request<AdminStore[]>(accessToken, '/api/v1/admin/stores/all'),
  createStore: (accessToken: string, store: AdminStoreRequest) =>
    request<AdminStore>(accessToken, '/api/v1/admin/stores', { method: 'POST', body: JSON.stringify(store) }),
  updateStore: (accessToken: string, id: string, store: AdminStoreRequest) =>
    request<AdminStore>(accessToken, `/api/v1/admin/stores/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(store) }),
  settings: (accessToken: string) => request<AdminSettings>(accessToken, '/api/v1/admin/settings'),
  gstSettings: (accessToken: string) => request<AdminGstSettings>(accessToken, '/api/v1/admin/gst/settings'),
  updateGstSettings: (accessToken: string, settings: AdminGstSettingsRequest) =>
    request<AdminGstSettings>(accessToken, '/api/v1/admin/gst/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  gstHistory: (accessToken: string) => request<AdminGstHistoryEntry[]>(accessToken, '/api/v1/admin/gst/history'),
  saveSettings: (accessToken: string, settings: AdminSettingsRequest) =>
    request<AdminSettings>(accessToken, '/api/v1/admin/settings', { method: 'PUT', body: JSON.stringify(settings) }),
  changeAdminPassword: (accessToken: string, currentPassword: string, newPassword: string) =>
    request<void>(accessToken, '/api/v1/admin/settings/password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
  testIntegration: (accessToken: string, integration: string) =>
    request<{ integration: string; configured: boolean; message: string }>(accessToken, `/api/v1/admin/settings/test/${integration}`, { method: 'POST' }),
  testSmtpConnection: (accessToken: string) =>
    request<{ integration: string; configured: boolean; message: string }>(accessToken, '/api/v1/admin/settings/smtp/test-connection', { method: 'POST' }),
  sendTestEmail: (accessToken: string, recipient: string) =>
    request<void>(accessToken, '/api/v1/admin/settings/smtp/test-email', { method: 'POST', body: JSON.stringify({ recipient }) }),
  orders: (accessToken: string) => request<AdminOrder[]>(accessToken, '/api/v1/admin/orders'),
  orderReports: async (accessToken: string) => {
    const rows = await request<AdminOrderReportRow[]>(accessToken, '/api/v1/admin/orders/report');
    return rows.map(({ order, paymentMethod }) => ({ ...order, paymentMethod }));
  },
  order: (accessToken: string, orderId: string) => request<AdminOrder>(accessToken, `/api/v1/admin/orders/${encodeURIComponent(orderId)}`),
  updateLensPreparation: (accessToken: string, orderId: string, itemId: string, status: LensPreparationDetails['status'], notes: string) =>
    request<LensPreparationDetails>(accessToken, `/api/v1/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/lens-preparation`, {
      method: 'PATCH',
      body: JSON.stringify({ status, notes: notes.trim() || null }),
    }),
  prescriptionDocument: (accessToken: string, orderId: string, itemId: string, fileId: string, download: boolean) =>
    requestPrivateFile(accessToken, `/api/v1/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/prescription-files/${encodeURIComponent(fileId)}${download ? '?download=true' : ''}`),
  prescriptionSummary: (accessToken: string, orderId: string, itemId: string) =>
    requestPrivateFile(accessToken, `/api/v1/admin/orders/${encodeURIComponent(orderId)}/items/${encodeURIComponent(itemId)}/prescription-summary.pdf`),
  updateOrderStatus: (accessToken: string, orderId: string, status: string, note?: string) =>
    request<OrderResponse>(accessToken, `/api/v1/admin/orders/${encodeURIComponent(orderId)}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, note: note || null }),
    }),
  lensOptions: (accessToken: string) =>
    request<LensOption[]>(accessToken, '/api/v1/admin/prescriptions/lens-options'),
  createLensOption: (accessToken: string, option: AdminLensOptionRequest) =>
    request<LensOption>(accessToken, '/api/v1/admin/prescriptions/lens-options', {
      method: 'POST',
      body: JSON.stringify(option),
    }),
  updateLensOption: (accessToken: string, id: string, option: AdminLensOptionRequest) =>
    request<LensOption>(accessToken, `/api/v1/admin/prescriptions/lens-options/${encodeURIComponent(id)}`, {
      method: 'PATCH',
      body: JSON.stringify(option),
    }),
  deleteLensOption: (accessToken: string, id: string) =>
    request<void>(accessToken, `/api/v1/admin/prescriptions/lens-options/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  cmsHomepage: async (accessToken: string) => {
    const data = await request<CmsHomepage>(accessToken, '/api/v1/admin/cms/homepage');
    const homepage = {
      ...data,
      banners: data.banners.map(normalizeCmsBanner),
      cards: (data.cards ?? []).map((card) => ({
        ...card,
        imageUrl: resolveCmsMediaUrl(card.imageUrl),
        product: card.product ? { ...card.product, imageUrl: resolveCmsMediaUrl(card.product.imageUrl) } : null,
        category: card.category ? { ...card.category, imageUrl: resolveCmsMediaUrl(card.category.imageUrl) } : null,
      })),
    };
    if (import.meta.env.DEV) {
      console.info('[CMS homepage] GET /api/v1/admin/cms/homepage banners', data.banners.map((banner, index) => ({
        id: banner.id,
        title: banner.title,
        status: banner.status,
        desktopImageUrl: banner.desktopImageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        resolvedDesktopImageUrl: homepage.banners[index].desktopImageUrl,
        resolvedMobileImageUrl: homepage.banners[index].mobileImageUrl,
      })));
    }
    return homepage;
  },
  createCmsSection: (accessToken: string, section: Omit<CmsSection, 'id' | 'products' | 'categories'>) => request<CmsSection>(accessToken, '/api/v1/admin/cms/sections', { method: 'POST', body: JSON.stringify(section) }),
  updateCmsSection: (accessToken: string, id: string, section: Omit<CmsSection, 'id' | 'products' | 'categories'>) => request<CmsSection>(accessToken, `/api/v1/admin/cms/sections/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(section) }),
  deleteCmsSection: (accessToken: string, id: string) => request<void>(accessToken, `/api/v1/admin/cms/sections/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  createCmsCard: async (accessToken: string, card: CmsHomepageCardRequest) => {
    const saved = await request<CmsHomepageCard>(accessToken, '/api/v1/admin/cms/cards', { method: 'POST', body: JSON.stringify(card) });
    return { ...saved, imageUrl: resolveCmsMediaUrl(saved.imageUrl), product: saved.product ? { ...saved.product, imageUrl: resolveCmsMediaUrl(saved.product.imageUrl) } : null, category: saved.category ? { ...saved.category, imageUrl: resolveCmsMediaUrl(saved.category.imageUrl) } : null };
  },
  updateCmsCard: async (accessToken: string, id: string, card: CmsHomepageCardRequest) => {
    const saved = await request<CmsHomepageCard>(accessToken, `/api/v1/admin/cms/cards/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(card) });
    return { ...saved, imageUrl: resolveCmsMediaUrl(saved.imageUrl), product: saved.product ? { ...saved.product, imageUrl: resolveCmsMediaUrl(saved.product.imageUrl) } : null, category: saved.category ? { ...saved.category, imageUrl: resolveCmsMediaUrl(saved.category.imageUrl) } : null };
  },
  deleteCmsCard: (accessToken: string, id: string) => request<void>(accessToken, `/api/v1/admin/cms/cards/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  cmsCards: async (accessToken: string, sectionKey: CmsCardSection | '', page = 0, pageSize = 50) => {
    const result = await request<{ items: CmsHomepageCard[]; page: number; pageSize: number; total: number }>(accessToken, `/api/v1/admin/cms/cards?page=${page}&pageSize=${pageSize}${sectionKey ? `&sectionKey=${encodeURIComponent(sectionKey)}` : ''}`);
    return {
      ...result,
      items: result.items.map((card) => ({
        ...card,
        imageUrl: resolveCmsMediaUrl(card.imageUrl),
        product: card.product ? { ...card.product, imageUrl: resolveCmsMediaUrl(card.product.imageUrl) } : null,
        category: card.category ? { ...card.category, imageUrl: resolveCmsMediaUrl(card.category.imageUrl) } : null,
      })),
    };
  },
  createCmsBanner: async (accessToken: string, banner: Record<string, unknown>) => normalizeCmsBanner(await request<CmsBanner>(accessToken, '/api/v1/admin/cms/banners', { method: 'POST', body: JSON.stringify(banner) })),
  updateCmsBanner: async (accessToken: string, id: string, banner: Record<string, unknown>) => normalizeCmsBanner(await request<CmsBanner>(accessToken, `/api/v1/admin/cms/banners/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(banner) })),
  deleteCmsBanner: (accessToken: string, id: string) => request<void>(accessToken, `/api/v1/admin/cms/banners/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  offers: (accessToken: string, filters: { q?: string; category?: string; publicationStatus?: string; active?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value) params.set(key, value); });
    const query = params.toString();
    return request<Offer[]>(accessToken, `/api/v1/admin/offers${query ? `?${query}` : ''}`).then((offers) =>
      offers.map((offer) => ({ ...offer, imageUrl: resolveCmsMediaUrl(offer.imageUrl) })));
  },
  createOffer: (accessToken: string, offer: OfferRequest) =>
    request<Offer>(accessToken, '/api/v1/admin/offers', { method: 'POST', body: JSON.stringify(offer) })
      .then((offer) => ({ ...offer, imageUrl: resolveCmsMediaUrl(offer.imageUrl) })),
  updateOffer: (accessToken: string, id: string, offer: OfferRequest) =>
    request<Offer>(accessToken, `/api/v1/admin/offers/${encodeURIComponent(id)}`, { method: 'PUT', body: JSON.stringify(offer) })
      .then((offer) => ({ ...offer, imageUrl: resolveCmsMediaUrl(offer.imageUrl) })),
  deleteOffer: (accessToken: string, id: string) =>
    request<void>(accessToken, `/api/v1/admin/offers/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  categories: (accessToken: string, type: 'CATALOG' | 'OFFER' = 'CATALOG') =>
    request<AdminCategory[]>(accessToken, `/api/v1/admin/categories?type=${encodeURIComponent(type)}`).then((categories) =>
      categories.map((category) => ({ ...category, imageUrl: resolveCmsMediaUrl(category.imageUrl) }))),
  createCategory: (accessToken: string, category: AdminCategoryRequest) =>
    request<AdminCategory>(accessToken, '/api/v1/admin/categories', { method: 'POST', body: JSON.stringify(category) })
      .then((category) => ({ ...category, imageUrl: resolveCmsMediaUrl(category.imageUrl) })),
  updateCategory: (accessToken: string, id: string, category: AdminCategoryRequest) =>
    request<AdminCategory>(accessToken, `/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(category) })
      .then((category) => ({ ...category, imageUrl: resolveCmsMediaUrl(category.imageUrl) })),
  deleteCategory: (accessToken: string, id: string) =>
    request<void>(accessToken, `/api/v1/admin/categories/${encodeURIComponent(id)}`, { method: 'DELETE' }),
  uploadCmsImage: async (accessToken: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${apiBaseUrl}/api/v1/admin/cms/images`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body });
    if (!response.ok) throw new AdminApiError('Image upload failed.', response.status);
    const result = await response.json() as { url: string; storageKey: string };
    return { ...result, url: resolveCmsMediaUrl(result.url) ?? '' };
  },
  uploadCmsVideo: async (accessToken: string, file: File) => {
    const body = new FormData();
    body.append('file', file);
    const response = await fetch(`${apiBaseUrl}/api/v1/admin/cms/videos`, { method: 'POST', headers: { Authorization: `Bearer ${accessToken}` }, body });
    if (!response.ok) throw new AdminApiError('Video upload failed.', response.status);
    const result = await response.json() as { url: string; storageKey: string };
    return { ...result, url: resolveCmsMediaUrl(result.url) ?? '' };
  },
};
