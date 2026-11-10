import { describe, expect, it } from 'vitest';
import { getCartItemKey, withoutCartItem } from './cart';

const item = (id: number, configuredId?: string) => ({
  id,
  configuredId,
  name: `Product ${id}`,
});

describe('cart item removal state', () => {
  it('removes one configured item and preserves the other cart items', () => {
    const first = item(1, 'variant-a');
    const second = item(2, 'variant-b');

    expect(withoutCartItem([first, second], getCartItemKey(first))).toEqual([second]);
  });

  it('returns an empty cart when the last item is removed', () => {
    const lastItem = item(1, 'variant-a');

    expect(withoutCartItem([lastItem], getCartItemKey(lastItem))).toEqual([]);
  });
});
