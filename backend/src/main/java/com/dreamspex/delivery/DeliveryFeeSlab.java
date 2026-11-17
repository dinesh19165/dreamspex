package com.dreamspex.delivery;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_fee_slabs")
public class DeliveryFeeSlab {
    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 255)
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "policy_id", nullable = false)
    private DeliveryFeePolicy policy;

    @Column(nullable = false, length = 120)
    private String label;

    @Column(name = "min_distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal minDistanceKm;

    @Column(name = "max_distance_km", precision = 8, scale = 2)
    private BigDecimal maxDistanceKm;

    @Column(name = "fee_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal feeAmount;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "sort_order", nullable = false)
    private Integer sortOrder = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public DeliveryFeePolicy getPolicy() { return policy; }
    public void setPolicy(DeliveryFeePolicy value) { policy = value; }
    public String getLabel() { return label; }
    public void setLabel(String value) { label = value; }
    public BigDecimal getMinDistanceKm() { return minDistanceKm; }
    public void setMinDistanceKm(BigDecimal value) { minDistanceKm = value; }
    public BigDecimal getMaxDistanceKm() { return maxDistanceKm; }
    public void setMaxDistanceKm(BigDecimal value) { maxDistanceKm = value; }
    public BigDecimal getFeeAmount() { return feeAmount; }
    public void setFeeAmount(BigDecimal value) { feeAmount = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public Integer getSortOrder() { return sortOrder; }
    public void setSortOrder(Integer value) { sortOrder = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
