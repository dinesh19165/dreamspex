package com.dreamspex.order;

import com.dreamspex.gst.GstPriceTreatment;

import java.math.BigDecimal;
import java.util.List;

public record GstOrderSnapshot(
        BigDecimal taxableAmount,
        BigDecimal gstAmount,
        BigDecimal cgstAmount,
        BigDecimal sgstAmount,
        BigDecimal igstAmount,
        BigDecimal finalAmount,
        BigDecimal appliedRate,
        GstPriceTreatment priceTreatment,
        List<GstLineSnapshot> items) {

    public record GstLineSnapshot(
            String productId,
            String productName,
            String hsnCode,
            BigDecimal appliedRate,
            BigDecimal taxableAmount,
            BigDecimal gstAmount,
            BigDecimal cgstAmount,
            BigDecimal sgstAmount,
            BigDecimal igstAmount,
            BigDecimal grossAmount) {}
}
