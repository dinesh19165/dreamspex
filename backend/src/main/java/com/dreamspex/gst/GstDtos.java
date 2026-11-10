package com.dreamspex.gst;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public final class GstDtos {
    private GstDtos() {}

    public record GstSettingsRequest(
            @NotNull @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2)
            BigDecimal defaultRate,
            @NotNull @Pattern(regexp = "INCLUSIVE|EXCLUSIVE") String priceTreatment,
            @NotNull Boolean enabled) {}

    public record GstSettingsResponse(
            String id,
            BigDecimal defaultRate,
            GstPriceTreatment priceTreatment,
            boolean enabled,
            Instant createdAt,
            Instant updatedAt,
            String updatedById,
            String updatedByName) {}

    public record GstCalculationResponse(
            BigDecimal taxableAmount,
            BigDecimal gstAmount,
            BigDecimal cgstAmount,
            BigDecimal sgstAmount,
            BigDecimal igstAmount,
            BigDecimal finalAmount,
            BigDecimal appliedRate,
            GstPriceTreatment priceTreatment) {}

    public record ProductGstRequest(
            @Size(max = 16) String hsnCode,
            @NotNull Boolean useGlobalRate,
            @DecimalMin("0.00") @DecimalMax("100.00") @Digits(integer = 3, fraction = 2)
            BigDecimal gstRate,
            @NotNull Boolean gstEnabled) {}

    public record ProductGstResponse(
            String productId,
            String hsnCode,
            BigDecimal gstRate,
            boolean usesGlobalRate,
            boolean gstEnabled) {}

    public record GstHistoryResponse(
            String id,
            BigDecimal defaultRate,
            GstPriceTreatment priceTreatment,
            boolean enabled,
            boolean active,
            Instant createdAt,
            Instant updatedAt,
            String updatedById,
            String updatedByName) {}
}
