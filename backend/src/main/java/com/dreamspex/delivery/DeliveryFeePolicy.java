package com.dreamspex.delivery;

import com.dreamspex.admin.Store;
import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_fee_policies")
public class DeliveryFeePolicy {
    public enum Scope { GLOBAL, STORE }

    @Id
    @Column(name = "id", nullable = false, updatable = false, length = 255)
    private String id = UUID.randomUUID().toString();

    @Column(nullable = false, length = 120)
    private String name;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Scope scope = Scope.GLOBAL;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "store_id")
    private Store store;

    @Column(name = "free_delivery_threshold", nullable = false, precision = 12, scale = 2)
    private BigDecimal freeDeliveryThreshold = BigDecimal.ZERO;

    @Column(name = "max_delivery_distance_km", nullable = false, precision = 8, scale = 2)
    private BigDecimal maxDeliveryDistanceKm = new BigDecimal("50.00");

    @Column(name = "unavailable_areas", columnDefinition = "TEXT")
    private String unavailableAreas;

    @Column(nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public Scope getScope() { return scope; }
    public void setScope(Scope value) { scope = value; }
    public Store getStore() { return store; }
    public void setStore(Store value) { store = value; }
    public String getStoreId() { return store == null ? null : store.getId(); }
    public BigDecimal getFreeDeliveryThreshold() { return freeDeliveryThreshold; }
    public void setFreeDeliveryThreshold(BigDecimal value) { freeDeliveryThreshold = value; }
    public BigDecimal getMaxDeliveryDistanceKm() { return maxDeliveryDistanceKm; }
    public void setMaxDeliveryDistanceKm(BigDecimal value) { maxDeliveryDistanceKm = value; }
    public String getUnavailableAreas() { return unavailableAreas; }
    public void setUnavailableAreas(String value) { unavailableAreas = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
