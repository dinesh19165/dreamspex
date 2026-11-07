package com.dreamspex.catalog.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "categories")
public class Category {
    @Id private String id = UUID.randomUUID().toString();
    @Column(nullable = false) private String name;
    @Column(nullable = false, unique = true) private String slug;
    private String description;
    @Column(name = "image_url") private String imageUrl;
    @Column(nullable = false) private String status = "ACTIVE";
    @Column(name = "category_type", nullable = false) private String categoryType = "CATALOG";
    @Column(name = "sort_order", nullable = false) private int sortOrder;
    @Column(name = "deleted_at") private Instant deletedAt;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getName() { return name; }
    public void setName(String value) { name = value; }
    public String getSlug() { return slug; }
    public void setSlug(String value) { slug = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String value) { imageUrl = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public String getCategoryType() { return categoryType; }
    public void setCategoryType(String value) { categoryType = value; }
    public int getSortOrder() { return sortOrder; }
    public void setSortOrder(int value) { sortOrder = value; }
    public Instant getDeletedAt() { return deletedAt; }
    public void setDeletedAt(Instant value) { deletedAt = value; }
}
