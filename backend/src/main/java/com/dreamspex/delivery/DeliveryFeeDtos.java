package com.dreamspex.delivery;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

public final class DeliveryFeeDtos {
    private DeliveryFeeDtos() {}

    public record PolicyRequest(
            @NotBlank @Size(max = 120) String name,
            @NotNull String scope,
            String storeId,
            @NotNull @DecimalMin("0.00") BigDecimal freeDeliveryThreshold,
            @NotNull @DecimalMin("0.01") @DecimalMax("10000.00") BigDecimal maxDeliveryDistanceKm,
            List<String> unavailableAreas,
            boolean active
    ) {}

    public record PolicyResponse(
            String id,
            String name,
            String scope,
            String storeId,
            String storeName,
            BigDecimal freeDeliveryThreshold,
            BigDecimal maxDeliveryDistanceKm,
            List<String> unavailableAreas,
            boolean active,
            Instant createdAt,
            Instant updatedAt
    ) {}

    public record SlabRequest(
            @NotBlank String policyId,
            @NotBlank @Size(max = 120) String label,
            @NotNull @DecimalMin("0.00") BigDecimal minDistanceKm,
            @DecimalMin("0.01") BigDecimal maxDistanceKm,
            @NotNull @DecimalMin("0.00") BigDecimal feeAmount,
            boolean active,
            Integer sortOrder
    ) {}

    public record SlabResponse(
            String id,
            String policyId,
            String label,
            BigDecimal minDistanceKm,
            BigDecimal maxDistanceKm,
            BigDecimal feeAmount,
            boolean active,
            Integer sortOrder,
            Instant createdAt,
            Instant updatedAt
    ) {}
}
