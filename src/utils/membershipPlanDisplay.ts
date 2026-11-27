import type { CSSProperties } from 'react';
import type { MembershipPlan } from '../services/membershipService';

export type MembershipPlanTheme = {
  color: string;
  accent: string;
  surface: string;
  border: string;
  hoverSurface: string;
  shadow: string;
  buttonText: string;
};

const membershipPlanThemes: Record<string, MembershipPlanTheme> = {
  silver: {
    color: '#A7B0BA',
    accent: '#59636E',
    surface: 'rgba(148, 163, 184, 0.12)',
    border: 'rgba(126, 140, 155, 0.42)',
    hoverSurface: 'rgba(148, 163, 184, 0.22)',
    shadow: 'rgba(91, 104, 118, 0.24)',
    buttonText: '#17231C',
  },
  gold: {
    color: '#D2A94E',
    accent: '#805E12',
    surface: 'rgba(210, 169, 78, 0.12)',
    border: 'rgba(184, 143, 49, 0.42)',
    hoverSurface: 'rgba(210, 169, 78, 0.22)',
    shadow: 'rgba(154, 116, 35, 0.24)',
    buttonText: '#17231C',
  },
  diamond: {
    color: '#63B7E8',
    accent: '#246A93',
    surface: 'rgba(99, 183, 232, 0.12)',
    border: 'rgba(79, 159, 207, 0.42)',
    hoverSurface: 'rgba(99, 183, 232, 0.22)',
    shadow: 'rgba(54, 134, 184, 0.24)',
    buttonText: '#123047',
  },
  neutral: {
    color: '#475569',
    accent: '#475569',
    surface: 'rgba(100, 116, 139, 0.08)',
    border: 'rgba(100, 116, 139, 0.3)',
    hoverSurface: 'rgba(100, 116, 139, 0.15)',
    shadow: 'rgba(71, 85, 105, 0.2)',
    buttonText: '#FFFFFF',
  },
};

type MembershipPlanThemeStyle = CSSProperties & {
  '--membership-color': string;
  '--membership-accent': string;
  '--membership-surface': string;
  '--membership-border': string;
  '--membership-hover-surface': string;
  '--membership-shadow': string;
  '--membership-button-text': string;
  '--membership-card-background': string;
};

export function membershipPlanTheme(name: string): MembershipPlanTheme {
  return membershipPlanThemes[name.trim().toLowerCase()] ?? membershipPlanThemes.neutral;
}

export function membershipPlanThemeStyle(name: string, cardBackground: string): MembershipPlanThemeStyle {
  const theme = membershipPlanTheme(name);
  return {
    '--membership-color': theme.color,
    '--membership-accent': theme.accent,
    '--membership-surface': theme.surface,
    '--membership-border': theme.border,
    '--membership-hover-surface': theme.hoverSurface,
    '--membership-shadow': theme.shadow,
    '--membership-button-text': theme.buttonText,
    '--membership-card-background': cardBackground,
  };
}

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
