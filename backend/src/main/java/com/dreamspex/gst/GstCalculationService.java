package com.dreamspex.gst;

import com.dreamspex.common.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Objects;

@Service
public class GstCalculationService {
    private static final BigDecimal ONE_HUNDRED = new BigDecimal("100");
    private static final int CURRENCY_SCALE = 2;
    private static final int DIVISION_SCALE = 12;

    public Calculation calculate(BigDecimal amount, BigDecimal rate, GstPriceTreatment treatment,
                                 String sellerState, String deliveryState) {
        if (amount == null || amount.signum() < 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_GST_AMOUNT",
                    "GST calculation amount must be zero or greater.");
        }
        if (rate == null || rate.signum() < 0 || rate.compareTo(ONE_HUNDRED) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_GST_RATE",
                    "GST rate must be between 0 and 100.");
        }
        if (treatment == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_GST_TREATMENT",
                    "GST price treatment is required.");
        }

        BigDecimal baseAmount = amount.setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        BigDecimal normalizedRate = rate.setScale(2, RoundingMode.HALF_UP);
        BigDecimal gstFactor = normalizedRate.divide(ONE_HUNDRED, DIVISION_SCALE, RoundingMode.HALF_UP);
        BigDecimal taxableAmount;
        BigDecimal gstAmount;
        BigDecimal finalAmount;

        if (treatment == GstPriceTreatment.INCLUSIVE) {
            taxableAmount = baseAmount.divide(BigDecimal.ONE.add(gstFactor), DIVISION_SCALE, RoundingMode.HALF_UP)
                    .setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            gstAmount = baseAmount.subtract(taxableAmount).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            finalAmount = baseAmount;
        } else {
            taxableAmount = baseAmount;
            gstAmount = taxableAmount.multiply(gstFactor).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
            finalAmount = taxableAmount.add(gstAmount).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        }

        String normalizedSellerState = normalizeState(sellerState);
        String normalizedDeliveryState = normalizeState(deliveryState);
        BigDecimal cgstAmount = BigDecimal.ZERO.setScale(CURRENCY_SCALE);
        BigDecimal sgstAmount = BigDecimal.ZERO.setScale(CURRENCY_SCALE);
        BigDecimal igstAmount = BigDecimal.ZERO.setScale(CURRENCY_SCALE);
        if (normalizedSellerState.equals(normalizedDeliveryState)) {
            cgstAmount = gstAmount.divide(new BigDecimal("2"), CURRENCY_SCALE, RoundingMode.HALF_UP);
            sgstAmount = gstAmount.subtract(cgstAmount).setScale(CURRENCY_SCALE, RoundingMode.HALF_UP);
        } else {
            igstAmount = gstAmount;
        }

        return new Calculation(taxableAmount, gstAmount, cgstAmount, sgstAmount, igstAmount, finalAmount,
                normalizedRate, treatment);
    }

    public BigDecimal effectiveRate(BigDecimal productRate, boolean productGstEnabled,
                                    GstConfiguration configuration) {
        Objects.requireNonNull(configuration, "configuration");
        if (!productGstEnabled || !configuration.isEnabled()) return BigDecimal.ZERO.setScale(2);
        return productRate != null ? productRate : configuration.getDefaultRate();
    }

    private String normalizeState(String state) {
        if (state == null || state.isBlank()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "GST_JURISDICTION_REQUIRED",
                    "Seller and delivery states are required to split GST.");
        }
        return state.trim().replaceAll("\\s+", " ").toUpperCase(java.util.Locale.ROOT);
    }

    public record Calculation(BigDecimal taxableAmount, BigDecimal gstAmount, BigDecimal cgstAmount,
                              BigDecimal sgstAmount, BigDecimal igstAmount, BigDecimal finalAmount,
                              BigDecimal appliedRate, GstPriceTreatment priceTreatment) {}
}
