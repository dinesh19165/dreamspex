package com.dreamspex.franchise;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import jakarta.validation.Valid;

public final class FranchiseDtos {
    private FranchiseDtos() {}

    public record FranchiseRequest(
            @NotBlank @Size(max = 40) String franchiseCode,
            @NotBlank @Size(max = 180) String name,
            @NotBlank @Size(max = 160) String ownerName,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 32) String phone,
            @NotBlank @Size(max = 1000) String address,
            @NotBlank @Size(max = 100) String city,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Size(max = 16) String postalCode,
            @Size(max = 32) String gstNumber,
            @Size(max = 120) String businessType,
            @Size(max = 255) String openingHours,
            @Size(max = 1000) String availableServices,
            @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE|SUSPENDED") String status,
            @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,
            @DecimalMin(value = "0.01", inclusive = true) @DecimalMax("10000.00") BigDecimal deliveryRadiusKm) {}

    public record FranchiseResponse(
            String id, String franchiseCode, String name, String ownerName, String ownerEmail,
            String phone, String address, String city, String state, String postalCode, String gstNumber,
            String businessType, String status, BigDecimal latitude, BigDecimal longitude,
            BigDecimal deliveryRadiusKm, long products, long orders, BigDecimal sales, Instant createdAt,
            String openingHours, List<String> availableServices) {}

    public record FranchiseCreateResponse(FranchiseResponse franchise, String loginEmail, String passwordSetupPath) {}
    public record StorefrontFranchiseResponse(String id, String name, String address, String city,
                                              String state, String postalCode, BigDecimal latitude,
                                              BigDecimal longitude, BigDecimal deliveryRadiusKm,
                                              String ownerName, String phone, String openingHours,
                                              List<String> availableServices) {}
    public record StorefrontAvailabilityRequest(
            @NotEmpty List<@Valid StorefrontCartItem> items,
            @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude) {}
    public record StorefrontCartItem(@NotBlank String variantId, @Min(1) int quantity) {}
    public record StorefrontItemAvailability(String variantId, int requested, int available, boolean availableForItem) {}
    public record StorefrontAvailabilityResponse(String id, String name, String address, String city,
                                                 String state, String postalCode, BigDecimal distanceKm,
                                                 boolean deliveryServiceable, boolean availableForOrder,
                                                 List<StorefrontItemAvailability> items) {}
    public record FranchiseUserResponse(String userId, String name, String email, String phone, String status, Instant createdAt) {}

    public record AssignmentRequest(
            @NotBlank String productId,
            @Min(0) int initialStock,
            @Min(0) int lowStockThreshold,
            @NotBlank @Pattern(regexp = "ACTIVE|INACTIVE") String availabilityStatus) {}

    public record InventoryResponse(
            String id, String productId, String productName, String variantId, String sku,
            int quantity, int reservedQuantity, int availableQuantity, int lowStockThreshold,
            String availabilityStatus, String stockState) {}

    public record AssignmentResponse(String productId, String productName, String brand,
                                     String availabilityStatus, List<InventoryResponse> inventory) {}

    public record InventoryAdjustmentRequest(
            @Min(0) int quantity, @Min(0) int lowStockThreshold,
            @NotBlank @Size(max = 500) String note) {}

    public record DashboardResponse(
            long assignedProducts, long availableUnits, long lowStockProducts, long outOfStockProducts,
            long totalOrders, long pendingOrders, long processingOrders, long deliveredOrders,
            long readyForPickupOrders, long pickedUpOrders, long refundRequests,
            BigDecimal sales, BigDecimal refunds, BigDecimal completedRefunds) {}

    public record ReturnResponse(String id, String requestNumber, String orderNumber, String customerName,
                                 String status, String reasonCode, BigDecimal refundAmount, Instant createdAt) {}

    public record OrderResponse(
            String id, String orderNumber, String customerName, String customerEmail, String customerPhone,
            String status, String paymentStatus, BigDecimal amount, List<String> products, Instant createdAt,
            String fulfillmentType, FulfillmentStoreResponse fulfillmentStore,
            com.dreamspex.order.OrderDtos.ShippingAddressResponse shippingAddress) {}

    public record FulfillmentStoreResponse(
            String id, String name, String phone, String address, String city, String state, String postalCode) {}

    public record ReportResponse(String franchiseId, String franchiseName, Instant from, Instant to,
                                 long orderCount, long paidOrders, long pendingOrders, long cancelledOrders,
                                 long deliveredOrders, long refundRequests, long completedRefunds,
                                 BigDecimal revenue, BigDecimal refunds) {}

    public record OrderStatusRequest(@NotBlank @Size(max = 32) String status, @Size(max = 500) String note) {}

    public record InventoryMovementResponse(String id, String franchiseId, String franchiseName, String sku,
                                            String productName, String movementType, int quantityChange,
                                            String referenceId, String note, String performedBy, Instant createdAt) {}
}
