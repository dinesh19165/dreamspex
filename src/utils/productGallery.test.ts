import { describe, expect, it } from 'vitest';
import type { CatalogImage } from '../services/catalogService';
import { getPrimaryGalleryImageIndex, getProductGalleryImages, getSwipeGalleryIndex } from './productGallery';

const image = (id: string, sortOrder: number, primaryImage = false): CatalogImage => ({
  id,
  imageUrl: `https://images.example/${id}.jpg`,
  storageKey: null,
  altText: null,
  sortOrder,
  primaryImage,
});

describe('product image gallery', () => {
  it('sorts all images by sort order and starts on the primary image', () => {
    const images = getProductGalleryImages([
      image('second', 2),
      image('primary', 1, true),
      image('first', 0),
    ], 'legacy.jpg');

    expect(images.map((item) => item.id)).toEqual(['first', 'primary', 'second']);
    expect(images[getPrimaryGalleryImageIndex(images)]?.id).toBe('primary');
  });

  it('uses the existing product image when an older product has no image array', () => {
    expect(getProductGalleryImages(undefined, 'legacy-primary.jpg')).toMatchObject([
      { id: 'primary-fallback', imageUrl: 'legacy-primary.jpg', primaryImage: true },
    ]);
  });

  it('keeps an empty gallery empty and ignores short swipes', () => {
    expect(getProductGalleryImages([], '')).toEqual([]);
    expect(getSwipeGalleryIndex(0, 2, -20)).toBe(0);
  });

  it('moves forwards and backwards with wrapping for mobile swipes', () => {
    expect(getSwipeGalleryIndex(0, 2, -80)).toBe(1);
    expect(getSwipeGalleryIndex(1, 2, -80)).toBe(0);
    expect(getSwipeGalleryIndex(0, 2, 80)).toBe(1);
  });
});
