package com.dreamspex.delivery;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DeliveryBatchDtos {
    private DeliveryBatchDtos() {}

    public record CreateBatchRequest(
            @NotBlank @Size(max = 120) String routeName,
            @NotEmpty @Size(max = 100) List<@NotBlank String> orderIds,
            @NotNull Boolean reassignActiveOrders) {}

    public record CreateReturnBatchRequest(
            @NotBlank @Size(max = 120) String routeName,
            @NotEmpty @Size(max = 100) List<@NotBlank String> requestIds) {}

    public record StatusRequest(
            @NotBlank @Size(max = 24) String status,
            @Size(max = 500) String note,
            @Size(min = 6, max = 6) String otp) {}

    public record EligibleOrder(
            String id, String orderNumber, String status, String paymentStatus,
            String recipientName, String city, String state, String postalCode,
            Instant createdAt) {}

    public record BatchOrderSummary(
            String id, String orderId, String orderNumber, String status,
            String recipientName, String city, String state, String postalCode) {}

    public record BatchSummary(
            String id, String routeName, String status, int total, int pending, int delivered, int failed,
            Instant createdAt, Instant linkExpiresAt, boolean activeLinkAvailable, List<BatchOrderSummary> orders,
            String operationType, int completed) {}

    public record BatchDetails(
            BatchSummary batch, List<DriverOrder> orders, boolean activeLinkAvailable,
            boolean activeLinkRecoverable, Instant linkExpiresAt) {}

    public record OneTimeOtp(String orderId, String orderNumber, String recipientName, String phone,
                             String otp, String requestNumber) {}

    public record CreatedBatch(BatchSummary batch, String linkPath, Instant linkExpiresAt, List<OneTimeOtp> deliveryOtps) {}
    public record LinkRevocation(BatchSummary batch, Instant revokedAt) {}
    public record ActiveBatchLink(String linkPath, Instant expiresAt, boolean available) {}

    public record DeliveryHistory(String previousStatus, String status, String note, String source, Instant createdAt) {}

    public record DriverOrder(
            String id, String orderNumber, String status, String recipientName, String phone,
            String address, String city, String state, String postalCode, String countryCode,
            List<DriverOrderItem> items, List<DeliveryHistory> history, String requestNumber,
            BigDecimal latitude, BigDecimal longitude) {}

    public record DriverOrderItem(String productName, int quantity) {}

    public record DriverBatch(
            String routeName, String status, int total, int pending, int delivered, int failed,
            Instant linkExpiresAt, List<DriverOrder> orders, String operationType, int completed) {}

    public record DeliveryStatusResponse(String orderId, String status, String orderStatus, String batchStatus) {}

    public record StatusUpdateResult(
            DeliveryStatusResponse response, String rejectionCode, String rejectionMessage) {
        public boolean rejected() { return rejectionCode != null; }
    }
}
