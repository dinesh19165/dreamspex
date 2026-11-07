package com.dreamspex.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_variants")
public class ProductVariant {
    @Id private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id", nullable = false)
    private Product product;
    @Column(nullable = false, unique = true) private String sku;
    private String color; private String size;
    @Column(name = "lens_type") private String lensType;
    @Column(name = "additional_price", nullable = false, precision = 12, scale = 2) private BigDecimal additionalPrice = BigDecimal.ZERO;
    @Column(nullable = false) private int quantity;
    @Column(name = "reserved_quantity", nullable = false) private int reservedQuantity;
    @Column(nullable = false) private String status = "ACTIVE";
    @Version @Column(nullable = false) private long version;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    public String getId() { return id; } public Product getProduct() { return product; } public void setProduct(Product v) { product = v; }
    public String getSku() { return sku; } public void setSku(String v) { sku = v; } public String getColor() { return color; } public void setColor(String v) { color = v; }
    public String getSize() { return size; } public void setSize(String v) { size = v; } public String getLensType() { return lensType; } public void setLensType(String v) { lensType = v; }
    public BigDecimal getAdditionalPrice() { return additionalPrice; } public void setAdditionalPrice(BigDecimal v) { additionalPrice = v; }
    public int getQuantity() { return quantity; } public void setQuantity(int v) { quantity = v; } public int getReservedQuantity() { return reservedQuantity; } public void setReservedQuantity(int v) { reservedQuantity = v; }
    public String getStatus() { return status; } public void setStatus(String v) { status = v; }
    public int getAvailableQuantity() { return Math.max(0, quantity - reservedQuantity); }
}
