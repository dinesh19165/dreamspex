import { describe, expect, it } from 'vitest';
import type { AdminProductRequest } from '../services/adminProductService';
import { mapAdminProductFieldErrors, validateAdminProductDraft } from './adminProductValidation';

const validProduct: AdminProductRequest = {
  sku: 'FRAME-01',
  name: 'Frame',
  slug: 'frame',
  brand: 'Dream Spex',
  description: 'Optical frame',
  material: 'Acetate',
  gender: 'Unisex',
  frameShape: 'Round',
  frameType: 'Full rim',
  basePrice: 0,
  compareAtPrice: 0,
  badge: null,
  tryOnImageUrl: null,
  status: 'DRAFT',
  categoryIds: ['category-01'],
  variants: [{
    sku: 'FRAME-01-BLK',
    color: 'BLACK',
    size: 'M',
    lensType: 'Single vision',
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
  images: [{ hasFile: true, imageUrl: '', altText: 'Black optical frame', primaryImage: true, variantId: null }],
  hsnCode: '9003',
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
        material: null,
        gender: null,
        frameShape: null,
        frameType: null,
        description: '',
        basePrice: Number.NaN,
        compareAtPrice: null,
        status: '',
        categoryIds: [],
        variants: [{
          ...validProduct.variants[0],
          sku: '',
          color: null,
          size: null,
          lensType: null,
          additionalPrice: Number.NaN,
          quantity: Number.NaN,
          reservedQuantity: Number.NaN,
          status: '',
        }],
      },
      images: [],
      hsnCode: '',
    });

    expect(errors).toMatchObject({
      name: 'Product name is required.',
      sku: 'SKU is required.',
      slug: 'Slug is required.',
      brand: 'Brand is required.',
      material: 'Material is required.',
      gender: 'Gender is required.',
      frameShape: 'Frame shape is required.',
      frameType: 'Frame type is required.',
      description: 'Description is required.',
      basePrice: 'DreamSpex price is required.',
      compareAtPrice: 'Regular price is required.',
      categories: 'Select at least one category.',
      status: 'Product status is required.',
      hsnCode: 'HSN code is required.',
      'variant.0.sku': 'Variant SKU is required.',
      'variant.0.color': 'Color combination is required.',
      'variant.0.size': 'Size is required.',
      'variant.0.lensType': 'Lens type is required.',
      'variant.0.additionalPrice': 'Adjustment must be a non-negative number.',
      'variant.0.quantity': 'Quantity must be a whole number greater than or equal to 0.',
      'variant.0.reservedQuantity': 'Reserved quantity must be a whole number between 0 and quantity.',
      'variant.0.status': 'Variant status is required.',
      images: 'At least one product image is required.',
    });
  });

  it('accepts all required values when the badge and try-on image are omitted', () => {
    expect(validateAdminProductDraft(validInput)).toEqual({});
  });

  it('keeps new create-only requirements out of the existing edit flow', () => {
    expect(validateAdminProductDraft({
      ...validInput,
      isCreate: false,
      form: {
        ...validProduct,
        material: null,
        gender: null,
        frameShape: null,
        frameType: null,
        compareAtPrice: null,
        status: '',
        categoryIds: [],
        variants: [{
          ...validProduct.variants[0],
          color: null,
          size: null,
          lensType: null,
          status: '',
        }],
      },
      images: [{ hasFile: false, imageUrl: '/existing-image.jpg', altText: null, primaryImage: false, variantId: null }],
      hsnCode: '',
    })).toEqual({});
  });

  it('requires descriptive alt text and a primary image for each image group', () => {
    const errors = validateAdminProductDraft({
      ...validInput,
      images: [{ hasFile: true, imageUrl: '', altText: null, primaryImage: false, variantId: null }],
    });

    expect(errors).toMatchObject({
      'image.0.altText': 'Alt text is required.',
      'image.0.primaryImage': 'Choose a primary image for this image group.',
    });
  });

  it('maps backend validation paths to editable fields and preserves unknown messages', () => {
    expect(mapAdminProductFieldErrors([
      { field: 'name', message: 'A product with this name already exists.' },
      { field: 'variants[0].sku', message: 'Variant SKU is already in use.' },
      { field: 'images[0].altText', message: 'Alt text is too long.' },
      { field: 'images[0].primaryImage', message: 'Select a primary image.' },
      { field: 'gstRate', message: 'GST rate is outside the allowed range.' },
      { field: 'returnable', message: 'Return setting is invalid.' },
      { field: 'unexpectedField', message: 'The request could not be processed.' },
    ])).toEqual({
      fieldErrors: {
        name: 'A product with this name already exists.',
        'variant.0.sku': 'Variant SKU is already in use.',
        'image.0.altText': 'Alt text is too long.',
        'image.0.primaryImage': 'Select a primary image.',
        gstRate: 'GST rate is outside the allowed range.',
        returnable: 'Return setting is invalid.',
      },
      unmappedErrors: ['The request could not be processed.'],
    });
  });
});
