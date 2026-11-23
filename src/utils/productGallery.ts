import type { CatalogImage } from '../services/catalogService';

export function getProductGalleryImages(
  images: CatalogImage[] | null | undefined,
  fallbackImage: string,
  variantId?: string,
): CatalogImage[] {
  const availableImages = (images ?? []).filter((image) => Boolean(image.imageUrl));
  const sortByOrder = (gallery: CatalogImage[]) =>
    [...gallery].sort((first, second) => first.sortOrder - second.sortOrder);

  if (variantId) {
    const variantImages = availableImages.filter((image) => image.variantId === variantId);
    if (variantImages.length) return sortByOrder(variantImages);

    const sharedImages = availableImages.filter((image) => !image.variantId);
    if (sharedImages.length) return sortByOrder(sharedImages);
    if (availableImages.some((image) => image.variantId)) return [];
  }

  if (availableImages.length) {
    return sortByOrder(availableImages);
  }
  if (!fallbackImage) return [];
  return [{
    id: 'primary-fallback',
    imageUrl: fallbackImage,
    storageKey: null,
    altText: null,
    sortOrder: 0,
    primaryImage: true,
    variantId: null,
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
