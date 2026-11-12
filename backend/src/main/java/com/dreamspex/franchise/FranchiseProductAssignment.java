package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.catalog.entity.Product;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "franchise_product_assignments",
        uniqueConstraints = @UniqueConstraint(name = "uk_franchise_assignment_product", columnNames = {"store_id", "product_id"}))
public class FranchiseProductAssignment {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "product_id", nullable = false)
    private Product product;

    @Column(name = "availability_status", nullable = false)
    private String availabilityStatus = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @PreUpdate
    void touch() { updatedAt = Instant.now(); }

    public String getId() { return id; }
    public Store getStore() { return store; }
    public void setStore(Store value) { store = value; }
    public Product getProduct() { return product; }
    public void setProduct(Product value) { product = value; }
    public String getAvailabilityStatus() { return availabilityStatus; }
    public void setAvailabilityStatus(String value) { availabilityStatus = value; }
}
