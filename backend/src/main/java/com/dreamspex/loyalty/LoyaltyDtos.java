package com.dreamspex.loyalty;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class LoyaltyDtos {
    private LoyaltyDtos() {}

    public record LoyaltySettingsResponse(boolean enabled, int pointsPerHundred, BigDecimal minimumOrderAmount,
                                          int minimumRedemptionPoints, int redemptionPoints,
                                          BigDecimal redemptionAmount, BigDecimal maximumRedemptionPercent,
                                          int pointsExpiryDays, boolean productPurchasePointsEnabled) {}
    public record LoyaltySettingsRequest(@NotNull Boolean enabled, @Min(0) int pointsPerHundred,
                                         @NotNull @DecimalMin("0.00") BigDecimal minimumOrderAmount,
                                         @Min(0) int minimumRedemptionPoints, @Min(1) int redemptionPoints,
                                         @NotNull @DecimalMin("0.01") BigDecimal redemptionAmount,
                                         @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal maximumRedemptionPercent,
                                         @Min(1) int pointsExpiryDays, @NotNull Boolean productPurchasePointsEnabled) {}
    public record ReferralSettingsResponse(boolean enabled, String rewardType, int referrerRewardAmount,
                                           int newCustomerRewardAmount, BigDecimal minimumPurchaseAmount,
                                           int rewardExpiryDays, int maximumRewardsPerCustomer) {}
    public record ReferralSettingsRequest(@NotNull Boolean enabled,
                                          @NotBlank @Pattern(regexp = "WALLET_CREDIT|LOYALTY_POINTS") String rewardType,
                                          @Min(0) int referrerRewardAmount, @Min(0) int newCustomerRewardAmount,
                                          @NotNull @DecimalMin("0.00") BigDecimal minimumPurchaseAmount,
                                          @Min(1) int rewardExpiryDays, @Min(1) int maximumRewardsPerCustomer) {}
    public record ProgramSettingsResponse(LoyaltySettingsResponse loyalty, ReferralSettingsResponse referral) {}
    public record LoyaltyTransactionResponse(String id, String userId, String customerName, String type, long points, BigDecimal amount,
                                             String description, String orderId, Instant expiresAt, Instant createdAt) {}
    public record LoyaltyDashboardResponse(LoyaltySettingsResponse settings, long availablePoints,
                                           long totalEarned, long totalRedeemed, long expiringPoints,
                                           Instant nextExpiry, List<LoyaltyTransactionResponse> transactions) {}
    public record RedemptionPreview(long availablePoints, int requestedPoints, BigDecimal discount,
                                    int maximumRedeemablePoints) {}
    public record ReferralClaimRequest(@NotBlank @Size(max = 32) String referralCode) {}
    public record ReferralHistoryResponse(String id, String status, String referralCode, String referredName,
                                         String rewardType, Integer rewardAmount, Instant createdAt,
                                         Instant qualifiedAt) {}
    public record ReferralDashboardResponse(boolean enabled, String rewardType, String code, String shareLink,
                                            long successfulReferrals, long pendingReferrals,
                                            BigDecimal totalWalletRewards, long totalPointRewards,
                                            List<ReferralHistoryResponse> referrals) {}
    public record WalletTransactionResponse(String type, BigDecimal amount, String description,
                                            Instant expiresAt, Instant createdAt) {}
    public record WalletResponse(BigDecimal balance, BigDecimal totalCredited, BigDecimal totalDebited,
                                 List<WalletTransactionResponse> transactions) {}
    public record LoyaltyReportResponse(long totalPointsIssued, long totalPointsRedeemed,
                                        long outstandingPoints, BigDecimal outstandingLiability,
                                        long totalReferrals, long successfulReferrals, long pendingReferrals,
                                        BigDecimal totalWalletReferralRewardsIssued, long totalPointReferralRewardsIssued,
                                        List<LoyaltyTransactionResponse> transactions,
                                        List<AdminReferralResponse> referrals, int page, int pageSize, long totalItems) {}
    public record AdminReferralResponse(String id, String referrerId, String referrerName,
                                        String referredUserId, String referredName, String status,
                                        String rewardType, Integer referrerRewardAmount,
                                        Integer newCustomerRewardAmount, Instant createdAt, Instant qualifiedAt) {}
    public record ManualAdjustmentRequest(@Min(1) @jakarta.validation.constraints.Max(1000000) long points,
                                          @NotBlank @Size(max = 255) String reason) {}
    public record LoyaltyReportFilter(String search, String status, String fromDate, String toDate,
                                      @Min(0) int page, @Min(1) @jakarta.validation.constraints.Max(100) int pageSize) {}
}
