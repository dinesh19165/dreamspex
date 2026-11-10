import { describe, expect, it } from 'vitest';
import type { MembershipPlan } from '../services/membershipService';
import {
  isDisplayableMembershipCopy,
  membershipDiscountLabel,
  membershipPlanDescription,
  membershipValidityLabel,
} from './membershipPlanDisplay';

const plan: MembershipPlan = {
  id: 'configured-silver-id',
  name: 'Silver',
  description: 'cjagqayg',
  price: 799,
  durationDays: 31,
  perks: [],
  status: 'ACTIVE',
  discountPercentage: 2,
  recommended: false,
};

describe('membership plan preview display', () => {
  it('uses the configured name, discount, and validity without inventing values', () => {
    expect(plan.name).toBe('Silver');
    expect(membershipDiscountLabel(plan)).toBe('2% OFF');
    expect(membershipValidityLabel(plan)).toBe('Valid for 31 days');
  });

  it('does not imply a discount when the plan has none configured', () => {
    expect(membershipDiscountLabel({ ...plan, discountPercentage: null })).toBe('Discount not configured');
  });

  it.each(['cjagqayg', 'buy', 'f'])('filters placeholder copy: %s', (copy) => {
    expect(isDisplayableMembershipCopy(copy)).toBe(false);
  });

  it('provides a truthful description when configured copy is a placeholder', () => {
    expect(membershipPlanDescription(plan)).toBe(
      '2% off eligible product purchases while your membership is active.',
    );
  });

  it('preserves a usable configured description', () => {
    expect(membershipPlanDescription({ ...plan, description: 'Member savings on eligible eyewear.' }))
      .toBe('Member savings on eligible eyewear.');
  });
});
