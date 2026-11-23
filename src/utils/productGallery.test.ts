import { describe, expect, it } from 'vitest';
import type { CatalogImage } from '../services/catalogService';
import { getPrimaryGalleryImageIndex, getProductGalleryImages, getSwipeGalleryIndex } from './productGallery';

const image = (id: string, sortOrder: number, primaryImage = false, variantId: string | null = null): CatalogImage => ({
  id,
  imageUrl: `https://images.example/${id}.jpg`,
  storageKey: null,
  altText: null,
  sortOrder,
  primaryImage,
  variantId,
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

  it('shows only images assigned to the selected variant', () => {
    const images = getProductGalleryImages([
      image('red-later', 3, false, 'red'),
      image('blue', 2, true, 'blue'),
      image('red-primary', 1, true, 'red'),
      image('shared', 0),
    ], 'legacy.jpg', 'red');

    expect(images.map((item) => item.id)).toEqual(['red-primary', 'red-later']);
  });

  it('falls back to shared images without exposing another variant gallery', () => {
    const images = [
      image('red', 0, true, 'red'),
      image('shared', 1),
    ];

    expect(getProductGalleryImages(images, 'legacy.jpg', 'blue').map((item) => item.id)).toEqual(['shared']);
    expect(getProductGalleryImages([images[0]], 'legacy.jpg', 'blue')).toEqual([]);
  });

  it('keeps the legacy product gallery when no images are variant-linked', () => {
    expect(getProductGalleryImages([image('first', 0), image('second', 1)], '', 'red')
      .map((item) => item.id)).toEqual(['first', 'second']);
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
