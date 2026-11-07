import { apiFetch as fetch } from './apiClient';

import { apiBaseUrl, resolveCmsMediaUrl } from '../config/api';

export type HomepageProduct = { id: string; name: string; slug: string; brand: string; price: number; compareAtPrice: number | null; imageUrl: string | null; badge: string | null; description?: string; category?: string };
export type HomepageCategory = { id: string; name: string; slug: string; imageUrl: string | null; description?: string | null };
export type HomepageSection = { id: string; slug: string; sectionType: string; title: string | null; subtitle: string | null; contentJson: string | null; displayOrder: number; status: string; enabled: boolean; products: HomepageProduct[]; categories: HomepageCategory[] };
export type HomepageBanner = { id: string; title: string; subtitle: string | null; description: string | null; desktopImageUrl: string; mobileImageUrl: string | null; desktopStorageKey: string | null; mobileStorageKey: string | null; desktopMediaType: 'IMAGE' | 'VIDEO'; desktopVideoUrl: string | null; desktopVideoStorageKey: string | null; buttonText: string | null; linkUrl: string | null; secondaryButtonText: string | null; secondaryLinkUrl: string | null; positioning: string | null; sortOrder: number; status: string; startsAt: string | null; endsAt: string | null };
export type HomepageCardSection = 'CATEGORY_BANNER' | 'FRAME_SHAPE' | 'TRENDING_PRODUCT' | 'PROMOTIONAL' | 'SHOP_BY_WEARER' | 'EXPLORE_BY_BRAND';
export type HomepageCard = {
  id: string;
  sectionKey: HomepageCardSection;
  title: string;
  subtitle: string | null;
  description: string | null;
  imageUrl: string | null;
  imageStorageKey: string | null;
  buttonText: string | null;
  destinationType: 'PAGE' | 'CATEGORY' | 'PRODUCT' | 'BRAND' | 'GENDER' | 'SHAPE';
  destinationValue: string;
  displayOrder: number;
  status: string;
  enabled: boolean;
  product: HomepageProduct | null;
  category: HomepageCategory | null;
};
export type HomepageResponse = { banners: HomepageBanner[]; sections: HomepageSection[]; cards: HomepageCard[] };

export async function fetchHomepage(signal?: AbortSignal): Promise<HomepageResponse> {
  const endpoint = `${apiBaseUrl}/api/v1/homepage`;
  const response = await fetch(endpoint, { signal, cache: 'no-store' });
  if (!response.ok) throw new Error(`GET ${endpoint} failed (${response.status} ${response.statusText}).`);
  const data = await response.json() as HomepageResponse;
  const homepage = {
    ...data,
    banners: data.banners.map((banner) => ({
      ...banner,
      desktopImageUrl: resolveCmsMediaUrl(banner.desktopImageUrl) ?? '',
      mobileImageUrl: resolveCmsMediaUrl(banner.mobileImageUrl),
      desktopVideoUrl: resolveCmsMediaUrl(banner.desktopVideoUrl),
    })),
    cards: (data.cards ?? []).map((card) => ({
      ...card,
      imageUrl: resolveCmsMediaUrl(card.imageUrl),
      product: card.product ? { ...card.product, imageUrl: resolveCmsMediaUrl(card.product.imageUrl) } : null,
      category: card.category ? { ...card.category, imageUrl: resolveCmsMediaUrl(card.category.imageUrl) } : null,
    })),
  };
  if (import.meta.env.DEV) {
    console.info('[CMS homepage] GET /api/v1/homepage', {
      status: response.status,
      banners: data.banners.map((banner, index) => ({
        id: banner.id,
        title: banner.title,
        status: banner.status,
        desktopImageUrl: banner.desktopImageUrl,
        mobileImageUrl: banner.mobileImageUrl,
        resolvedDesktopImageUrl: homepage.banners[index].desktopImageUrl,
        resolvedMobileImageUrl: homepage.banners[index].mobileImageUrl,
      })),
    });
  }
  return homepage;
}
