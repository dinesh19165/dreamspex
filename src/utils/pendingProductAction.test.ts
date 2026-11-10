import { beforeEach, describe, expect, it } from 'vitest';
import {
  pendingProductActionPath,
  readPendingProductAction,
  savePendingProductAction,
  takePendingProductAction,
  type PendingProductAction,
} from './pendingProductAction';

function createStorage() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => { values.set(key, value); },
    removeItem: (key: string) => { values.delete(key); },
  };
}

describe('pending product action', () => {
  let storage: ReturnType<typeof createStorage>;

  beforeEach(() => {
    storage = createStorage();
  });

  it('preserves selected product, variant, action, quantity, and return path', () => {
    savePendingProductAction({
      productId: 'product-1',
      variantId: 'variant-2',
      action: 'BUY_NOW',
      quantity: 2,
      returnPath: '/product/product-1',
    }, storage);

    expect(readPendingProductAction(storage)).toMatchObject({
      productId: 'product-1',
      variantId: 'variant-2',
      action: 'BUY_NOW',
      quantity: 2,
      returnPath: '/product/product-1',
    });
    expect(pendingProductActionPath(storage)).toBe('/product/product-1');
  });

  it('consumes an action only for its intended product and returns null after consumption', () => {
    savePendingProductAction({
      productId: 'product-1',
      variantId: 'variant-2',
      action: 'ADD_TO_CART',
      quantity: 1,
      returnPath: '/products/product-1',
    }, storage);

    expect(takePendingProductAction('product-other', storage)).toBeNull();
    expect(takePendingProductAction('product-1', storage)).toMatchObject({
      action: 'ADD_TO_CART',
      variantId: 'variant-2',
    });
    expect(readPendingProductAction(storage)).toBeNull();
  });

  it('clears malformed or expired stored actions', () => {
    const expired: PendingProductAction = {
      productId: 'product-1',
      variantId: 'variant-2',
      action: 'BUY_NOW',
      quantity: 1,
      returnPath: '/product/product-1',
      createdAt: Date.now() - 31 * 60 * 1000,
    };
    storage.setItem('dream-spex-pending-product-action', JSON.stringify(expired));

    expect(readPendingProductAction(storage)).toBeNull();
    expect(storage.getItem('dream-spex-pending-product-action')).toBeNull();
  });
});
