import type { MembershipPlan } from '../services/membershipService';

export function isDisplayableMembershipCopy(value: string): boolean {
  const copy = value.trim();
  return copy.length >= 4
    && !/^(?:buy|f|cjagqayg)$/i.test(copy)
    && !/^[bcdfghjklmnpqrstvwxyz]{6,}$/i.test(copy);
}

export function membershipDiscountLabel(plan: MembershipPlan): string {
  return plan.discountPercentage != null && plan.discountPercentage > 0
    ? `${plan.discountPercentage}% OFF`
    : 'Discount not configured';
}

export function membershipValidityLabel(plan: MembershipPlan): string {
  return `Valid for ${plan.durationDays} days`;
}

export function membershipPlanDescription(plan: MembershipPlan): string {
  if (isDisplayableMembershipCopy(plan.description)) return plan.description.trim();
  if (plan.discountPercentage != null && plan.discountPercentage > 0) {
    return `${plan.discountPercentage}% off eligible product purchases while your membership is active.`;
  }
  return `Explore the configured benefits during your ${plan.durationDays}-day membership.`;
}
