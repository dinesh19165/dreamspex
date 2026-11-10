package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "loyalty_settings")
public class LoyaltySettings {
    @Id
    private Integer id = 1;
    @Column(nullable = false)
    private boolean enabled = true;
    @Column(name = "points_per_hundred", nullable = false)
    private int pointsPerHundred = 5;
    @Column(name = "minimum_order_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumOrderAmount = BigDecimal.ZERO;
    @Column(name = "minimum_redemption_points", nullable = false)
    private int minimumRedemptionPoints = 100;
    @Column(name = "redemption_points", nullable = false)
    private int redemptionPoints = 100;
    @Column(name = "redemption_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal redemptionAmount = new BigDecimal("10.00");
    @Column(name = "maximum_redemption_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal maximumRedemptionPercent = new BigDecimal("20.00");
    @Column(name = "points_expiry_days", nullable = false)
    private int pointsExpiryDays = 365;
    @Column(name = "product_purchase_points_enabled", nullable = false)
    private boolean productPurchasePointsEnabled = true;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Integer getId() { return id; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public int getPointsPerHundred() { return pointsPerHundred; }
    public void setPointsPerHundred(int value) { pointsPerHundred = value; }
    public BigDecimal getMinimumOrderAmount() { return minimumOrderAmount; }
    public void setMinimumOrderAmount(BigDecimal value) { minimumOrderAmount = value; }
    public int getMinimumRedemptionPoints() { return minimumRedemptionPoints; }
    public void setMinimumRedemptionPoints(int value) { minimumRedemptionPoints = value; }
    public int getRedemptionPoints() { return redemptionPoints; }
    public void setRedemptionPoints(int value) { redemptionPoints = value; }
    public BigDecimal getRedemptionAmount() { return redemptionAmount; }
    public void setRedemptionAmount(BigDecimal value) { redemptionAmount = value; }
    public BigDecimal getMaximumRedemptionPercent() { return maximumRedemptionPercent; }
    public void setMaximumRedemptionPercent(BigDecimal value) { maximumRedemptionPercent = value; }
    public int getPointsExpiryDays() { return pointsExpiryDays; }
    public void setPointsExpiryDays(int value) { pointsExpiryDays = value; }
    public boolean isProductPurchasePointsEnabled() { return productPurchasePointsEnabled; }
    public void setProductPurchasePointsEnabled(boolean value) { productPurchasePointsEnabled = value; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
