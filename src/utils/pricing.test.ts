import { describe, expect, it } from 'vitest';
import { getDiscountPercentage } from './pricing';

describe('product discount display', () => {
  it('calculates the rounded discount from selling and list prices', () => {
    expect(getDiscountPercentage(2499, 3499)).toBe(29);
    expect(getDiscountPercentage(2499, 2999)).toBe(17);
  });

  it('omits a discount for missing or invalid list prices', () => {
    expect(getDiscountPercentage(2499)).toBeNull();
    expect(getDiscountPercentage(2499, 2499)).toBeNull();
    expect(getDiscountPercentage(2499, 2000)).toBeNull();
  });
});
