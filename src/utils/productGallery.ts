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

function normalizeColour(value: string | null | undefined) {
  return (value ?? '')
    .toLowerCase()
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function getVariantGalleryImages(
  images: CatalogImage[] | null | undefined,
  fallbackImage: string,
  variant: { id: string; color: string | null } | null | undefined,
): CatalogImage[] {
  const allImages = getProductGalleryImages(images, fallbackImage);
  if (!variant || allImages.length < 2) return allImages;

  const selectedColour = normalizeColour(variant.color);
  if (!selectedColour) return allImages;

  const directlyMapped = allImages.filter((image) =>
    normalizeColour(image.variantId) === normalizeColour(variant.id)
    || normalizeColour(image.variantColor) === selectedColour);
  if (directlyMapped.length) {
    return [...directlyMapped].sort((first, second) => first.sortOrder - second.sortOrder);
  }

  const matchingImages = allImages.filter((image) => {
    const searchableText = normalizeColour([image.variantColor, image.altText, image.storageKey, image.imageUrl].filter(Boolean).join(' '));
    if (selectedColour.includes('/')) {
      return selectedColour.split('/').map(normalizeColour).some((part) => part && searchableText.includes(part));
    }
    if (!searchableText.includes(selectedColour)) return false;
    if (selectedColour === 'black') {
      return !searchableText.includes(' and red')
        && !searchableText.includes('/red')
        && !searchableText.includes(' dual');
    }
    return true;
  });

  return matchingImages.length ? [...matchingImages].sort((first, second) => first.sortOrder - second.sortOrder) : allImages;
}
