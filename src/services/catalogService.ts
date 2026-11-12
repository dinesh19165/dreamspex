import { apiFetch as fetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

import type { Product } from '../types';
import type { RatingSummary } from './reviewService';

export type CatalogCategory = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  sortOrder: number;
  categoryType?: 'CATALOG' | 'OFFER';
};

export type CatalogVariant = {
  id: string;
  sku: string;
  color: string | null;
  size: string | null;
  lensType: string | null;
  additionalPrice: number;
  quantity: number;
  availableQuantity: number;
  status: string;
};

export type CatalogImage = {
  id: string;
  imageUrl: string;
  storageKey: string | null;
  altText: string | null;
  sortOrder: number;
  primaryImage: boolean;
};

export type CatalogProduct = {
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
  hsnCode: string | null;
  gstRate: number | null;
  gstEnabled: boolean;
  categories: CatalogCategory[];
  variants: CatalogVariant[];
  imageUrl?: string | null;
  images?: CatalogImage[] | null;
  ratingSummary: RatingSummary;
};

export type CatalogPage = {
  items: CatalogProduct[];
  page: number;
  pageSize: number;
  total: number;
};

export type CatalogFilterOptions = {
  brands: string[];
  materials: string[];
  genders: string[];
  frameShapes: string[];
  frameTypes: string[];
  colors: string[];
  badges: string[];
};

async function request<T>(path: string, signal?: AbortSignal) {
  const response = await fetch(`${apiBaseUrl}${path}`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Catalog request failed (${response.status})`);
  return response.json() as Promise<T>;
}

export const catalogService = {
  search: (params: URLSearchParams, signal?: AbortSignal) =>
    request<CatalogPage>(`/api/v1/products?${params.toString()}`, signal),
  filterOptions: (signal?: AbortSignal) =>
    request<CatalogFilterOptions>('/api/v1/products/filters', signal),
  get: (id: string, franchiseId?: string) =>
    request<CatalogProduct>(`/api/v1/products/${encodeURIComponent(id)}${franchiseId ? `?franchiseId=${encodeURIComponent(franchiseId)}` : ''}`),
  categories: (type: 'CATALOG' | 'OFFER' = 'CATALOG', signal?: AbortSignal) =>
    request<CatalogCategory[]>(`/api/v1/categories?type=${encodeURIComponent(type)}`, signal),
};

export function toProduct(product: CatalogProduct): Product {
  const images = product.images ?? [];
  const primaryImage = [...images].sort((a, b) => Number(b.primaryImage) - Number(a.primaryImage) || a.sortOrder - b.sortOrder)[0];
  const activeVariants = product.variants.filter((variant) => variant.status.toUpperCase() === 'ACTIVE');
  const available = activeVariants.reduce((total, variant) => total + variant.availableQuantity, 0);
  const firstVariant = activeVariants.find((variant) => variant.availableQuantity > 0);
  return {
    id: stableNumericId(product.id),
    backendId: product.id,
    variantId: firstVariant?.id,
    hsnCode: product.hsnCode,
    gstRate: product.gstRate,
    gstEnabled: product.gstEnabled,
    name: product.name,
    category: product.categories[0]?.name ?? 'Eyewear',
    gender: product.gender ?? undefined,
    frameShape: product.frameShape ?? undefined,
    frameType: product.frameType ?? undefined,
    price: Number(product.basePrice),
    oldPrice: product.compareAtPrice == null ? undefined : Number(product.compareAtPrice),
    image: primaryImage?.imageUrl ?? product.imageUrl ?? '',
    tryOnImageUrl: product.tryOnImageUrl ?? undefined,
    badge: product.badge ?? undefined,
    rating: product.ratingSummary?.averageRating ?? 0,
    reviews: product.ratingSummary?.totalReviews ?? 0,
    stock: available > 0 ? 'In Stock' : 'Out of Stock',
    description: product.description,
    colors: activeVariants.map((variant) => variant.color).filter((value): value is string => Boolean(value)),
    sizes: activeVariants.map((variant) => variant.size).filter((value): value is string => Boolean(value)),
    material: product.material ?? '',
    brand: product.brand,
  };
}

function stableNumericId(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) hash = (hash * 31 + value.charCodeAt(index)) | 0;
  return Math.abs(hash) || 1;
}
