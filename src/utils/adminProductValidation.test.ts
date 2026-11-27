import { describe, expect, it } from 'vitest';
import type { AdminProductRequest } from '../services/adminProductService';
import { mapAdminProductFieldErrors, validateAdminProductDraft } from './adminProductValidation';

const validProduct: AdminProductRequest = {
  sku: 'FRAME-01',
  name: 'Frame',
  slug: 'frame',
  brand: 'Dream Spex',
  description: 'Optical frame',
  material: null,
  gender: null,
  frameShape: null,
  frameType: null,
  basePrice: 0,
  compareAtPrice: null,
  badge: null,
  tryOnImageUrl: null,
  status: 'DRAFT',
  categoryIds: [],
  variants: [{
    sku: 'FRAME-01-BLK',
    color: null,
    size: null,
    lensType: null,
    additionalPrice: 0,
    quantity: 0,
    reservedQuantity: 0,
    status: 'ACTIVE',
  }],
  images: [],
};

const validInput = {
  form: validProduct,
  isCreate: true,
  images: [{ hasFile: true, imageUrl: '', altText: null }],
  hsnCode: '',
  useGlobalRate: true,
  gstRate: '',
};

describe('admin product validation', () => {
  it('reports all missing required values before submission', () => {
    const errors = validateAdminProductDraft({
      ...validInput,
      form: {
        ...validProduct,
        name: '',
        sku: '',
        slug: '',
        brand: '',
        description: '',
        basePrice: Number.NaN,
        categoryIds: [''],
        variants: [{ ...validProduct.variants[0], sku: '' }],
      },
      images: [],
    });

    expect(errors).toMatchObject({
      name: 'Product name is required.',
      sku: 'SKU is required.',
      slug: 'Slug is required.',
      brand: 'Brand is required.',
      description: 'Description is required.',
      basePrice: 'Regular price is required.',
      categories: 'Select a category or remove the empty category row.',
      'variant.0.sku': 'Variant SKU is required.',
      images: 'At least one product image is required.',
    });
  });

  it('accepts a complete product draft with zero-valued prices and inventory', () => {
    expect(validateAdminProductDraft(validInput)).toEqual({});
  });

  it('maps backend validation paths to editable fields and preserves unknown messages', () => {
    expect(mapAdminProductFieldErrors([
      { field: 'name', message: 'A product with this name already exists.' },
      { field: 'variants[0].sku', message: 'Variant SKU is already in use.' },
      { field: 'images[0].altText', message: 'Alt text is too long.' },
      { field: 'gstRate', message: 'GST rate is outside the allowed range.' },
      { field: 'returnable', message: 'Return setting is invalid.' },
      { field: 'unexpectedField', message: 'The request could not be processed.' },
    ])).toEqual({
      fieldErrors: {
        name: 'A product with this name already exists.',
        'variant.0.sku': 'Variant SKU is already in use.',
        'image.0.altText': 'Alt text is too long.',
        gstRate: 'GST rate is outside the allowed range.',
        returnable: 'Return setting is invalid.',
      },
      unmappedErrors: ['The request could not be processed.'],
    });
  });
});
