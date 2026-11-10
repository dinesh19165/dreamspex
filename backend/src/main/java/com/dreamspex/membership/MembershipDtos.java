package com.dreamspex.membership;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class MembershipDtos {
    private MembershipDtos() {}

    public record PaymentVerificationRequest(
            @NotBlank String providerOrderId,
            @NotBlank String providerPaymentId,
            @NotBlank String signature) {}

    public record PaymentStatusRequest(
            @NotBlank String providerOrderId,
            @NotBlank @Pattern(regexp = "FAILED|CANCELLED") String status) {}

    public record PaymentIntentResponse(
            String id,
            String provider,
            String providerOrderId,
            String status,
            BigDecimal amount,
            String currency,
            boolean signatureVerified,
            String keyId) {}

    public record MembershipOverview(
            String id,
            String planId,
            String planName,
            String status,
            BigDecimal discountPercentage,
            List<String> benefits,
            Instant purchasedAt,
            Instant startsAt,
            Instant expiresAt) {}

    public record MembershipPaymentHistory(
            String id,
            String planName,
            String provider,
            BigDecimal amount,
            String currency,
            String status,
            Instant createdAt) {}

    public record MembershipDashboardResponse(
            MembershipOverview current,
            List<MembershipOverview> history,
            List<MembershipPaymentHistory> paymentHistory) {}

    public record AdminMembershipResponse(
            String id,
            String customerId,
            String customerName,
            String customerEmail,
            String customerPhone,
            String planId,
            String planName,
            BigDecimal planPrice,
            BigDecimal discountPercentage,
            String status,
            Instant purchasedAt,
            Instant startsAt,
            Instant expiresAt,
            String paymentStatus,
            String paymentReference) {}

    public record AdminMembershipPaymentResponse(
            String id,
            String customerId,
            String customerName,
            String customerEmail,
            String planName,
            String provider,
            BigDecimal amount,
            String currency,
            String status,
            Instant createdAt) {}
}
