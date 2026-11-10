package com.dreamspex.gst;

import com.dreamspex.common.ApiException;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;

class GstCalculationServiceTest {
    private final GstCalculationService service = new GstCalculationService();

    @Test
    void extractsInclusiveGstFromGrossWithoutChangingFinalAmount() {
        var result = service.calculate(new BigDecimal("118.00"), new BigDecimal("18.00"),
                GstPriceTreatment.INCLUSIVE, "Telangana", "Telangana");

        assertMoney("100.00", result.taxableAmount());
        assertMoney("18.00", result.gstAmount());
        assertMoney("9.00", result.cgstAmount());
        assertMoney("9.00", result.sgstAmount());
        assertMoney("0.00", result.igstAmount());
        assertMoney("118.00", result.finalAmount());
    }

    @Test
    void calculatesExclusiveGstWithoutRoundingThroughFloatingPoint() {
        var result = service.calculate(new BigDecimal("100.00"), new BigDecimal("18.00"),
                GstPriceTreatment.EXCLUSIVE, "Karnataka", "Tamil Nadu");

        assertMoney("100.00", result.taxableAmount());
        assertMoney("18.00", result.gstAmount());
        assertMoney("0.00", result.cgstAmount());
        assertMoney("0.00", result.sgstAmount());
        assertMoney("18.00", result.igstAmount());
        assertMoney("118.00", result.finalAmount());
    }

    @Test
    void roundsIntrastateHalvesSoCgstAndSgstSumToTheRoundedTax() {
        var result = service.calculate(new BigDecimal("0.15"), new BigDecimal("5.00"),
                GstPriceTreatment.EXCLUSIVE, "Delhi", " delhi ");

        assertMoney("0.01", result.cgstAmount());
        assertMoney("0.00", result.sgstAmount());
        assertMoney("0.01", result.gstAmount());
    }

    @Test
    void rejectsCalculationsWithoutJurisdictionRatherThanGuessingTaxType() {
        ApiException error = assertThrows(ApiException.class, () -> service.calculate(
                new BigDecimal("100.00"), new BigDecimal("18.00"), GstPriceTreatment.INCLUSIVE,
                "", "Delhi"));

        assertEquals("GST_JURISDICTION_REQUIRED", error.code());
    }

    @Test
    void productSpecificRateOverridesGlobalRateAndMissingRateFallsBackToGlobal() {
        GstConfiguration configuration = new GstConfiguration(new BigDecimal("18.00"),
                GstPriceTreatment.INCLUSIVE, true, null);

        assertEquals(new BigDecimal("5.00"), service.effectiveRate(
                new BigDecimal("5.00"), true, configuration));
        assertEquals(new BigDecimal("18.00"), service.effectiveRate(null, true, configuration));
        assertEquals(new BigDecimal("0.00"), service.effectiveRate(
                new BigDecimal("5.00"), false, configuration));
    }

    private void assertMoney(String expected, BigDecimal actual) {
        assertEquals(0, new BigDecimal(expected).compareTo(actual));
    }
}
