import type { AdminProductRequest } from '../services/adminProductService';
import type { AdminProductFieldError } from '../services/adminProductService';
import { isValidGstRate } from './gst';

type ProductImageDraftValidation = {
  hasFile: boolean;
  imageUrl: string;
  altText: string | null;
};

type ProductValidationInput = {
  form: AdminProductRequest;
  isCreate: boolean;
  images: ProductImageDraftValidation[];
  hsnCode: string;
  useGlobalRate: boolean;
  gstRate: string;
};

export function validateAdminProductDraft({
  form,
  isCreate,
  images,
  hsnCode,
  useGlobalRate,
  gstRate,
}: ProductValidationInput): Record<string, string> {
  const errors: Record<string, string> = {};
  const requiredTextFields = [
    ['name', form.name, 'Product name is required.', 180],
    ['sku', form.sku, 'SKU is required.', 80],
    ['slug', form.slug, 'Slug is required.', 220],
    ['brand', form.brand, 'Brand is required.', 120],
    ['description', form.description, 'Description is required.', undefined],
  ] as const;

  requiredTextFields.forEach(([field, value, requiredMessage, maxLength]) => {
    if (!value.trim()) errors[field] = requiredMessage;
    else if (maxLength && value.length > maxLength) errors[field] = `Must be ${maxLength} characters or fewer.`;
  });

  const optionalTextFields = [
    ['material', form.material, 80],
    ['gender', form.gender, 40],
    ['frameShape', form.frameShape, 80],
    ['frameType', form.frameType, 80],
    ['badge', form.badge, 80],
  ] as const;
  optionalTextFields.forEach(([field, value, maxLength]) => {
    if (value && value.length > maxLength) errors[field] = `Must be ${maxLength} characters or fewer.`;
  });

  if (!Number.isFinite(form.basePrice)) errors.basePrice = 'Regular price is required.';
  else if (form.basePrice < 0) errors.basePrice = 'Regular price cannot be negative.';
  if (form.compareAtPrice != null && (!Number.isFinite(form.compareAtPrice) || form.compareAtPrice < 0)) {
    errors.compareAtPrice = 'Sale / compare-at price must be a non-negative number.';
  }
  if (form.categoryIds.some((categoryId) => !categoryId.trim())) {
    errors.categories = 'Select a category or remove the empty category row.';
  }

  form.variants.forEach((variant, index) => {
    const prefix = `variant.${index}`;
    if (!variant.sku.trim()) errors[`${prefix}.sku`] = 'Variant SKU is required.';
    else if (variant.sku.length > 80) errors[`${prefix}.sku`] = 'Variant SKU must be 80 characters or fewer.';
    if (variant.color && variant.color.length > 80) errors[`${prefix}.color`] = 'Color combination must be 80 characters or fewer.';
    if (variant.size && variant.size.length > 32) errors[`${prefix}.size`] = 'Size must be 32 characters or fewer.';
    if (variant.lensType && variant.lensType.length > 80) errors[`${prefix}.lensType`] = 'Lens type must be 80 characters or fewer.';
    if (!Number.isFinite(variant.additionalPrice) || variant.additionalPrice < 0) {
      errors[`${prefix}.additionalPrice`] = 'Adjustment must be a non-negative number.';
    }
    if (!Number.isInteger(variant.quantity) || variant.quantity < 0) {
      errors[`${prefix}.quantity`] = 'Quantity must be a whole number greater than or equal to 0.';
    }
    if (!Number.isInteger(variant.reservedQuantity) || variant.reservedQuantity < 0 || variant.reservedQuantity > variant.quantity) {
      errors[`${prefix}.reservedQuantity`] = 'Reserved quantity must be a whole number between 0 and quantity.';
    }
  });

  if (isCreate && images.length === 0) errors.images = 'At least one product image is required.';
  else if (images.some((image) => !image.hasFile && !image.imageUrl.trim())) {
    errors.images = 'Every product image must have a valid upload.';
  }
  images.forEach((image, index) => {
    if (image.altText && image.altText.length > 255) {
      errors[`image.${index}.altText`] = 'Alt text must be 255 characters or fewer.';
    }
  });

  if (hsnCode.trim() && !/^(?:\d{4}|\d{6}|\d{8})$/.test(hsnCode.trim())) {
    errors.hsnCode = 'HSN code must contain 4, 6, or 8 digits.';
  }
  const parsedGstRate = gstRate.trim() ? Number(gstRate) : Number.NaN;
  if (!useGlobalRate && !isValidGstRate(parsedGstRate)) {
    errors.gstRate = 'Enter a product GST rate between 0 and 100, or select the global rate.';
  }

  return errors;
}

export function mapAdminProductFieldErrors(fieldErrors: readonly AdminProductFieldError[]) {
  const mapped: Record<string, string> = {};
  const unmapped: string[] = [];

  fieldErrors.forEach(({ field, message }) => {
    const normalized = field.trim().replace(/^(?:product|request)\./, '').replace(/\[(\d+)\]/g, '.$1');
    let key: string | null = null;
    if (['name', 'sku', 'slug', 'brand', 'description', 'basePrice', 'compareAtPrice', 'hsnCode', 'gstRate', 'gstEnabled', 'useGlobalRate', 'returnable', 'status'].includes(normalized)) {
      key = normalized;
    } else if (normalized === 'categoryIds' || normalized.startsWith('categoryIds.')) {
      key = 'categories';
    } else if (normalized === 'images' || /^images\.\d+\.(?:imageUrl|storageKey|sortOrder|primaryImage)$/.test(normalized)) {
      key = 'images';
    } else {
      const variantMatch = normalized.match(/^variants\.(\d+)\.(sku|color|size|lensType|additionalPrice|quantity|reservedQuantity|status)$/);
      if (variantMatch) key = `variant.${variantMatch[1]}.${variantMatch[2]}`;
      const imageAltTextMatch = normalized.match(/^images\.(\d+)\.altText$/);
      if (imageAltTextMatch) key = `image.${imageAltTextMatch[1]}.altText`;
      const imageVariantMatch = normalized.match(/^images\.(\d+)\.variantId$/);
      if (imageVariantMatch) key = `image.${imageVariantMatch[1]}.variantId`;
      if (normalized === 'tryOnImageUrl') key = 'tryOnImage';
    }

    if (!key) unmapped.push(message);
    else mapped[key] = mapped[key] ? `${mapped[key]} ${message}` : message;
  });

  return { fieldErrors: mapped, unmappedErrors: unmapped };
}
