import { apiFetch as fetch } from './apiClient';

import { apiBaseUrl, resolveCmsMediaUrl } from '../config/api';

export type Offer = {
  id: string;
  couponCode: string | null;
  title: string;
  subtitle: string | null;
  description: string;
  imageUrl: string | null;
  category: string;
  discountType: 'PERCENT' | 'FIXED';
  discountValue: number;
  minSubtotal: number | null;
  maxDiscount: number | null;
  startsAt: string;
  endsAt: string | null;
  usageLimit: number | null;
  perUserLimit: number | null;
  customerEligibility: 'ALL' | 'NEW_CUSTOMERS' | 'MEMBERSHIP_MEMBERS';
  displayOrder: number;
  active: boolean;
  publicationStatus: 'DRAFT' | 'PUBLISHED';
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  linkUrl: string;
};

export type OfferRequest = Omit<Offer, 'id' | 'linkUrl'>;

export async function fetchOffers(signal?: AbortSignal): Promise<Offer[]> {
  const response = await fetch(`${apiBaseUrl}/api/v1/offers`, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`Offers request failed (${response.status}).`);
  const offers = await response.json() as Offer[];
  return offers.map((offer) => ({ ...offer, imageUrl: resolveCmsMediaUrl(offer.imageUrl) }));
}
