import { describe, expect, it } from 'vitest';
import type { CatalogImage } from '../services/catalogService';
import { getPrimaryGalleryImageIndex, getProductGalleryImages, getSwipeGalleryIndex, getVariantGalleryImages } from './productGallery';

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

  it('filters gallery images by a variant-specific image mapping', () => {
    const images = [
      { ...image('brown-front', 0), variantId: 'brown-variant', altText: 'Brown frame' },
      { ...image('blue-front', 1), variantId: 'blue-variant', altText: 'Blue frame' },
    ];

    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'brown-variant', color: 'Brown' }).map((item) => item.id))
      .toEqual(['brown-front']);
  });

  it('matches existing image alt text and retains the gallery when a colour is unmapped', () => {
    const images = [
      { ...image('black-front', 0), altText: 'Glossy black frame' },
      { ...image('red-front', 1), altText: 'Black and red dual colour frame' },
    ];

    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'black', color: 'Black' }).map((item) => item.id))
      .toEqual(['black-front']);
    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'red', color: 'Red' }).map((item) => item.id))
      .toEqual(['red-front']);
    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'yellow', color: 'Yellow' }).map((item) => item.id))
      .toEqual(['black-front', 'red-front']);
  });
});
