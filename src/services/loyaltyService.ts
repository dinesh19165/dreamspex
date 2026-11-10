import { apiFetch } from './apiClient';
import { apiBaseUrl } from '../config/api';

export type LoyaltySettings = {
  enabled: boolean;
  pointsPerHundred: number;
  minimumOrderAmount: number;
  minimumRedemptionPoints: number;
  redemptionPoints: number;
  redemptionAmount: number;
  maximumRedemptionPercent: number;
  pointsExpiryDays: number;
  productPurchasePointsEnabled: boolean;
};

export type ReferralSettings = {
  enabled: boolean;
  rewardType: 'WALLET_CREDIT' | 'LOYALTY_POINTS';
  referrerRewardAmount: number;
  newCustomerRewardAmount: number;
  minimumPurchaseAmount: number;
  rewardExpiryDays: number;
  maximumRewardsPerCustomer: number;
};

export type ProgramSettings = { loyalty: LoyaltySettings; referral: ReferralSettings };

export type LoyaltyTransaction = {
  id: string;
  userId: string;
  customerName: string | null;
  type: string;
  points: number;
  amount: number;
  description: string;
  orderId: string | null;
  expiresAt: string | null;
  createdAt: string;
};

export type LoyaltyDashboard = {
  settings: LoyaltySettings;
  availablePoints: number;
  totalEarned: number;
  totalRedeemed: number;
  expiringPoints: number;
  nextExpiry: string | null;
  transactions: LoyaltyTransaction[];
};

export type RedemptionPreview = {
  availablePoints: number;
  requestedPoints: number;
  discount: number;
  maximumRedeemablePoints: number;
};

export type LoyaltyRedemptionValidation = {
  points: number;
  discount: number;
  error: string | null;
};

export function parseLoyaltyPointsInput(value: string): number | null {
  if (value === '') return 0;
  if (!/^\d+$/.test(value)) return null;
  const points = Number(value);
  return Number.isSafeInteger(points) ? points : null;
}

export function validateLoyaltyRedemption(
  input: string,
  settings: LoyaltySettings | null,
  availablePoints: number,
  maximumRedeemablePoints: number,
  eligibleAmount: number,
): LoyaltyRedemptionValidation {
  const points = parseLoyaltyPointsInput(input);
  if (points === null) return { points: 0, discount: 0, error: 'Enter a whole number of points.' };
  if (points === 0) return { points: 0, discount: 0, error: null };
  if (!settings) return { points, discount: 0, error: 'Loyalty settings are not available yet.' };
  if (!settings.enabled) return { points, discount: 0, error: 'Loyalty point redemption is not currently available.' };
  if (settings.minimumRedemptionPoints < 1 || settings.redemptionPoints < 1 || settings.redemptionAmount <= 0) {
    return { points, discount: 0, error: 'Loyalty redemption settings are invalid. Please try again later.' };
  }
  if (points < settings.minimumRedemptionPoints) {
    return { points, discount: 0, error: `Redeem at least ${settings.minimumRedemptionPoints} points.` };
  }
  if (points > availablePoints) {
    return { points, discount: 0, error: `You have only ${availablePoints} points available.` };
  }
  if (points > maximumRedeemablePoints) {
    return { points, discount: 0, error: `You can redeem at most ${maximumRedeemablePoints} points on this order.` };
  }
  const discount = Math.floor((points * settings.redemptionAmount / settings.redemptionPoints + 1e-10) * 100) / 100;
  const maximumDiscount = Math.floor((eligibleAmount * settings.maximumRedemptionPercent / 100 + 1e-10) * 100) / 100;
  if (discount > maximumDiscount) {
    return { points, discount: 0, error: 'The requested points exceed the maximum discount for this order.' };
  }
  return { points, discount, error: null };
}

export type ReferralHistory = {
  id: string;
  status: 'PENDING' | 'SUCCESSFUL' | 'LIMIT_REACHED';
  referralCode: string;
  referredName: string;
  rewardType: string | null;
  rewardAmount: number | null;
  createdAt: string;
  qualifiedAt: string | null;
};

export type ReferralDashboard = {
  enabled: boolean;
  rewardType: 'WALLET_CREDIT' | 'LOYALTY_POINTS';
  code: string;
  shareLink: string;
  successfulReferrals: number;
  pendingReferrals: number;
  totalWalletRewards: number;
  totalPointRewards: number;
  referrals: ReferralHistory[];
};

export type LoyaltyReport = {
  totalPointsIssued: number;
  totalPointsRedeemed: number;
  outstandingPoints: number;
  outstandingLiability: number;
  totalReferrals: number;
  successfulReferrals: number;
  pendingReferrals: number;
  totalWalletReferralRewardsIssued: number;
  totalPointReferralRewardsIssued: number;
  transactions: LoyaltyTransaction[];
  referrals: Array<{
    id: string;
    referrerId: string;
    referrerName: string;
    referredUserId: string;
    referredName: string;
    status: string;
    rewardType: string | null;
    referrerRewardAmount: number | null;
    newCustomerRewardAmount: number | null;
    createdAt: string;
    qualifiedAt: string | null;
  }>;
  page: number;
  pageSize: number;
  totalItems: number;
};

export type Wallet = {
  balance: number;
  totalCredited: number;
  totalDebited: number;
  transactions: Array<{
    type: string;
    amount: number;
    description: string;
    expiresAt: string | null;
    createdAt: string;
  }>;
};

export class LoyaltyApiError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = 'LoyaltyApiError';
    this.status = status;
  }
}

async function request<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const response = await apiFetch(`${apiBaseUrl}/api/v1${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
  });
  if (!response.ok) {
    const problem = await response.json().catch(() => ({})) as { message?: string };
    throw new LoyaltyApiError(problem.message ?? `Rewards request failed (${response.status}).`, response.status);
  }
  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const loyaltyService = {
  dashboard: (token: string) => request<LoyaltyDashboard>(token, '/me/loyalty'),
  previewRedemption: (token: string, points: number, eligibleAmount: number) => {
    const query = new URLSearchParams({ points: String(points), eligibleAmount: String(eligibleAmount) });
    return request<RedemptionPreview>(token, `/me/loyalty/redemption-preview?${query.toString()}`);
  },
  referrals: (token: string) => request<ReferralDashboard>(token, '/me/referrals'),
  claimReferral: (token: string, referralCode: string) =>
    request<void>(token, '/me/referrals/claim', {
      method: 'POST',
      body: JSON.stringify({ referralCode }),
    }),
  wallet: (token: string) => request<Wallet>(token, '/me/wallet'),
  adminSettings: (token: string) => request<ProgramSettings>(token, '/admin/loyalty/settings'),
  updateAdminSettings: (token: string, settings: ProgramSettings) =>
    request<ProgramSettings>(token, '/admin/loyalty/settings', {
      method: 'PUT',
      body: JSON.stringify(settings),
    }),
  adminReport: (token: string, filters: { search?: string; status?: string; fromDate?: string; toDate?: string; page?: number; pageSize?: number }) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') query.set(key, String(value));
    });
    return request<LoyaltyReport>(token, `/admin/loyalty/report?${query.toString()}`);
  },
  customerHistory: (token: string, customerId: string) =>
    request<{ customerId: string; displayName: string; email: string | null; phone: string | null; transactions: LoyaltyTransaction[] }>(
      token, `/admin/loyalty/customers/${encodeURIComponent(customerId)}`),
  adjustPoints: (token: string, customerId: string, points: number, reason: string) =>
    request<void>(token, `/admin/loyalty/customers/${encodeURIComponent(customerId)}/adjustments`, {
      method: 'POST',
      body: JSON.stringify({ points, reason }),
    }),
};
