package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.catalog.entity.ProductVariant;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "franchise_inventory",
        uniqueConstraints = @UniqueConstraint(name = "uk_franchise_inventory_variant", columnNames = {"store_id", "variant_id"}))
public class FranchiseInventory {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @Column(nullable = false)
    private int quantity;

    @Column(name = "reserved_quantity", nullable = false)
    private int reservedQuantity;

    @Column(name = "low_stock_threshold", nullable = false)
    private int lowStockThreshold;

    @Column(name = "availability_status", nullable = false)
    private String availabilityStatus = "ACTIVE";

    @Version
    @Column(nullable = false)
    private long version;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public Store getStore() { return store; }
    public void setStore(Store value) { store = value; }
    public ProductVariant getVariant() { return variant; }
    public void setVariant(ProductVariant value) { variant = value; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int value) { quantity = value; }
    public int getReservedQuantity() { return reservedQuantity; }
    public void setReservedQuantity(int value) { reservedQuantity = value; }
    public int getLowStockThreshold() { return lowStockThreshold; }
    public void setLowStockThreshold(int value) { lowStockThreshold = value; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String value) { availabilityStatus = value; }
    public int getAvailableQuantity() { return Math.max(0, quantity - reservedQuantity); }
}
