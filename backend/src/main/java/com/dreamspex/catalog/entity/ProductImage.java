package com.dreamspex.catalog.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "product_images")
public class ProductImage {
    @Id private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY, optional = false) @JoinColumn(name = "product_id", nullable = false) private Product product;
    @ManyToOne(fetch = FetchType.LAZY) @JoinColumn(name = "variant_id") private ProductVariant variant;
    @Column(name = "image_url", nullable = false) private String imageUrl;
    @Column(name = "storage_key") private String storageKey;
    @Column(name = "alt_text") private String altText;
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @Column(name = "is_primary", nullable = false) private boolean primaryImage;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();
    public String getId() { return id; } public void setProduct(Product v) { product = v; } public Product getProduct() { return product; }
    public void setVariant(ProductVariant v) { variant = v; } public ProductVariant getVariant() { return variant; }
    public String getImageUrl() { return imageUrl; } public void setImageUrl(String v) { imageUrl = v; }
    public String getStorageKey() { return storageKey; } public void setStorageKey(String v) { storageKey = v; }
    public String getAltText() { return altText; } public void setAltText(String v) { altText = v; }
    public int getSortOrder() { return sortOrder; } public void setSortOrder(int v) { sortOrder = v; }
    public boolean isPrimaryImage() { return primaryImage; } public void setPrimaryImage(boolean v) { primaryImage = v; }
}
