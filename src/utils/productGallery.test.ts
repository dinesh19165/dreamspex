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

  it('does not infer colour mappings from alt text and only uses unassigned images for single-colour products', () => {
    const images = [
      { ...image('black-front', 0), altText: 'Glossy black frame' },
      { ...image('red-front', 1), altText: 'Black and red dual colour frame' },
    ];

    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'black', color: 'Black' })).toEqual([]);
    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'red', color: 'Red' })).toEqual([]);
    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'yellow', color: 'Yellow' })).toEqual([]);
    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'single', color: 'Black' }, true).map((item) => item.id))
      .toEqual(['black-front', 'red-front']);
  });

  it('does not show images mapped to a different variant when the selected variant has no mapping', () => {
    const images = [
      { ...image('blue-front', 0), variantId: 'blue-variant' },
      { ...image('yellow-front', 1), variantId: 'yellow-variant' },
    ];

    expect(getVariantGalleryImages(images, 'fallback.jpg', { id: 'red-variant', color: 'Red' })).toEqual([]);
  });

  it('fails closed for each D-Lite colour when the API images have no variant mapping', () => {
    const apiImages = [
      { ...image('api-image-0', 0), imageUrl: '/api/v1/cms/images/243ea9ad-6497-4ee8-83cc-7d772f189957.webp' },
      { ...image('api-image-1', 1), imageUrl: '/api/v1/cms/images/02aec7fc-187c-4d08-8b9c-2a5351d62290.webp' },
      { ...image('api-image-2', 2), imageUrl: '/api/v1/cms/images/2e36f89b-fd6d-4eb8-8f0e-65f01a0a0f2a.webp' },
    ];
    const apiVariants = [
      { id: '3ef6bfdc-a377-42c2-b14f-9fd9f32cb59c', color: 'Blue' },
      { id: 'b6052b84-197a-4bfe-897b-037b72c62b5f', color: 'Yellow' },
      { id: 'be48c719-be3b-4d45-91a2-be714e38945f', color: 'Black' },
      { id: 'cb666e0f-1104-4576-bada-92012761ce55', color: 'Red' },
    ];

    for (const variant of apiVariants) {
      expect(getVariantGalleryImages(apiImages, 'fallback.jpg', variant)).toEqual([]);
    }
  });
});
