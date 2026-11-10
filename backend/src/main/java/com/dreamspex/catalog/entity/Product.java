package com.dreamspex.catalog.entity;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;

@Entity
@Table(name = "products")
public class Product {
    @Id private String id = UUID.randomUUID().toString();
    @Column(nullable = false, unique = true) private String sku;
    @Column(nullable = false) private String name;
    @Column(nullable = false, unique = true) private String slug;
    @Column(nullable = false) private String brand;
    @Column(nullable = false, columnDefinition = "TEXT") private String description;
    private String material;
    private String gender;
    @Column(name = "frame_shape") private String frameShape;
    @Column(name = "frame_type") private String frameType;
    @Column(name = "base_price", nullable = false, precision = 12, scale = 2) private BigDecimal basePrice;
    @Column(name = "compare_at_price", precision = 12, scale = 2) private BigDecimal compareAtPrice;
    @Column(nullable = false) private String status = "DRAFT";
    private String badge;
    @Column(name = "try_on_image_url", length = 1000) private String tryOnImageUrl;
    @Column(name = "hsn_code", length = 16) private String hsnCode;
    @Column(name = "gst_rate", precision = 5, scale = 2) private BigDecimal gstRate;
    @Column(name = "gst_enabled", nullable = false) private boolean gstEnabled = true;
    @Column(name = "deleted_at") private Instant deletedAt;
    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(name = "product_categories", joinColumns = @JoinColumn(name = "product_id"),
            inverseJoinColumns = @JoinColumn(name = "category_id"))
    private Set<Category> categories = new HashSet<>();
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductVariant> variants = new ArrayList<>();
    @OneToMany(mappedBy = "product", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ProductImage> images = new ArrayList<>();
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getSku() { return sku; } public void setSku(String v) { sku = v; }
    public String getName() { return name; } public void setName(String v) { name = v; }
    public String getSlug() { return slug; } public void setSlug(String v) { slug = v; }
    public String getBrand() { return brand; } public void setBrand(String v) { brand = v; }
    public String getDescription() { return description; } public void setDescription(String v) { description = v; }
    public String getMaterial() { return material; } public void setMaterial(String v) { material = v; }
    public String getGender() { return gender; } public void setGender(String v) { gender = v; }
    public String getFrameShape() { return frameShape; } public void setFrameShape(String v) { frameShape = v; }
    public String getFrameType() { return frameType; } public void setFrameType(String v) { frameType = v; }
    public BigDecimal getBasePrice() { return basePrice; } public void setBasePrice(BigDecimal v) { basePrice = v; }
    public BigDecimal getCompareAtPrice() { return compareAtPrice; } public void setCompareAtPrice(BigDecimal v) { compareAtPrice = v; }
    public String getStatus() { return status; } public void setStatus(String v) { status = v; }
    public String getBadge() { return badge; } public void setBadge(String v) { badge = v; }
    public String getTryOnImageUrl() { return tryOnImageUrl; } public void setTryOnImageUrl(String v) { tryOnImageUrl = v; }
    public String getHsnCode() { return hsnCode; } public void setHsnCode(String v) { hsnCode = v; }
    public BigDecimal getGstRate() { return gstRate; } public void setGstRate(BigDecimal v) { gstRate = v; }
    public boolean isGstEnabled() { return gstEnabled; } public void setGstEnabled(boolean v) { gstEnabled = v; }
    public Instant getDeletedAt() { return deletedAt; } public void setDeletedAt(Instant v) { deletedAt = v; }
    public Set<Category> getCategories() { return categories; }
    public List<ProductVariant> getVariants() { return variants; }
    public List<ProductImage> getImages() { return images; }
}
