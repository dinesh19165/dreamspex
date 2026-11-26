import { describe, expect, it } from 'vitest';
import { getCatalogProductImage, type CatalogImage } from './catalogService';

const image = (id: string, imageUrl: string, primaryImage: boolean, sortOrder: number): CatalogImage => ({
  id,
  imageUrl,
  storageKey: null,
  altText: null,
  sortOrder,
  primaryImage,
});

describe('getCatalogProductImage', () => {
  it('skips a try-on image and selects the next catalog image', () => {
    const selfieUrl = 'https://media.example/customer-selfie.png';
    const productImageUrl = 'https://media.example/sunglasses-product.png';

    expect(getCatalogProductImage({
      imageUrl: selfieUrl,
      tryOnImageUrl: selfieUrl,
      images: [
        image('try-on', selfieUrl, true, 0),
        image('catalog', productImageUrl, false, 1),
      ],
    })).toBe(productImageUrl);
  });

  it('does not use a try-on image as a fallback product image', () => {
    const selfieUrl = 'https://media.example/customer-selfie.png';

    expect(getCatalogProductImage({
      imageUrl: selfieUrl,
      tryOnImageUrl: selfieUrl,
      images: [image('try-on', selfieUrl, true, 0)],
    })).toBe('');
  });

  it('uses the legacy catalog image when no gallery image is present', () => {
    const productImageUrl = 'https://media.example/eyeglasses-product.png';

    expect(getCatalogProductImage({
      imageUrl: productImageUrl,
      tryOnImageUrl: 'https://media.example/try-on-overlay.png',
      images: [],
    })).toBe(productImageUrl);
  });
});
