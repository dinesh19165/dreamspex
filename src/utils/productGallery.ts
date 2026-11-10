import type { CatalogImage } from '../services/catalogService';

export function getProductGalleryImages(images: CatalogImage[] | null | undefined, fallbackImage: string): CatalogImage[] {
  const availableImages = (images ?? []).filter((image) => Boolean(image.imageUrl));
  if (availableImages.length) {
    return [...availableImages].sort((first, second) => first.sortOrder - second.sortOrder);
  }
  if (!fallbackImage) return [];
  return [{
    id: 'primary-fallback',
    imageUrl: fallbackImage,
    storageKey: null,
    altText: null,
    sortOrder: 0,
    primaryImage: true,
  }];
}

export function getPrimaryGalleryImageIndex(images: CatalogImage[]) {
  const primaryIndex = images.findIndex((image) => image.primaryImage);
  return primaryIndex >= 0 ? primaryIndex : 0;
}

export function getSwipeGalleryIndex(currentIndex: number, imageCount: number, deltaX: number) {
  if (imageCount < 2 || Math.abs(deltaX) < 50) return currentIndex;
  return (currentIndex + (deltaX < 0 ? 1 : imageCount - 1)) % imageCount;
}
