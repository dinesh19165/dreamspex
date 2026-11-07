package com.dreamspex.returns;

import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class ReturnDtos {
    private ReturnDtos() {}

    public record PolicyResponse(boolean enabled, Integer returnWindowDays, Instant updatedAt) {}
    public record PolicyRequest(boolean enabled, @Min(1) @Max(365) Integer returnWindowDays) {}
    public record ProductEligibilityResponse(String productId, String name, String sku, String status,
                                             boolean returnable) {}
    public record ProductEligibilityRequest(boolean returnable) {}

    public record EligibleItem(String orderItemId, String productName, String sku, int orderedQuantity,
                               int availableQuantity, BigDecimal refundEstimate, boolean returnable) {}
    public record OrderEligibilityResponse(String orderId, String orderNumber, boolean eligible,
                                           String ineligibleReason, Instant deliveredAt,
                                           Instant returnDeadline, List<EligibleItem> items) {}

    public record RequestedItem(@NotBlank String orderItemId, @Min(1) int quantity) {}
    public record CreateRequest(@NotBlank @Pattern(regexp = "REFUND|REPLACEMENT") String resolution,
                                @NotBlank @Pattern(regexp = "DAMAGED|DEFECTIVE|WRONG_ITEM|NOT_AS_DESCRIBED|OTHER") String reasonCode,
                                @Size(max = 2000) String description,
                                @NotEmpty List<@Valid RequestedItem> items) {}
    public record StatusRequest(@NotBlank @Pattern(regexp = "APPROVED|REJECTED|PICKUP_SCHEDULED|PICKED_UP|RECEIVED|QUALITY_CHECK|REPLACEMENT_PROCESSING|REPLACED") String status,
                                @Size(max = 2000) String adminRemarks) {}

    public record ItemResponse(String orderItemId, String productName, String sku, int quantity,
                               BigDecimal refundAmount) {}
    public record EvidenceResponse(String id, String originalName, String contentType, long sizeBytes,
                                  Instant createdAt, String url) {}
    public record HistoryResponse(String status, Instant createdAt) {}
    public record AdminHistoryResponse(String status, String note, String changedBy, Instant createdAt) {}
    public record CustomerRefundResponse(BigDecimal amount, String currency, String status,
                                         String providerRefundId, Instant createdAt, Instant processedAt,
                                         Instant gatewayCreatedAt) {}
    public record AdminRefundResponse(String id, String provider, String providerRefundId, BigDecimal amount,
                                     String currency, String status, String errorMessage,
                                     Instant createdAt, Instant processedAt,
                                     Instant gatewayCreatedAt, boolean retryable) {}
    public record CustomerResponse(String id, String displayName, String email) {}
    public record AdminPaymentResponse(String provider, String providerPaymentId, BigDecimal amount,
                                      String currency, String status) {}
    public record ReturnResponse(String id, String requestNumber, String orderId, String orderNumber,
                                 String resolution, String reasonCode, String description, String status,
                                 BigDecimal refundAmount, Instant createdAt, List<ItemResponse> items,
                                 List<EvidenceResponse> evidence, List<HistoryResponse> history,
                                 List<CustomerRefundResponse> refunds) {}
    public record AdminReturnResponse(String id, String requestNumber, String orderId, String orderNumber,
                                      String resolution, String reasonCode, String description, String status,
                                      BigDecimal refundAmount, String adminRemarks, Instant createdAt,
                                      CustomerResponse customer, AdminPaymentResponse payment, List<ItemResponse> items,
                                      List<EvidenceResponse> evidence, List<AdminHistoryResponse> history,
                                      List<AdminRefundResponse> refunds) {}
    public record EvidenceUploadResponse(String id, String originalName, String contentType, long sizeBytes,
                                         Instant createdAt, String url) {}
}
