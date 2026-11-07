package com.dreamspex.admin;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "homepage_cards")
public class HomepageCard {
    @Id
    @Column(length = 255)
    private String id = UUID.randomUUID().toString();

    @Column(name = "section_key", nullable = false, length = 40)
    private String sectionKey;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(length = 500)
    private String subtitle;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "image_storage_key", length = 500)
    private String imageStorageKey;

    @Column(name = "button_text", length = 120)
    private String buttonText;

    @Column(name = "destination_type", nullable = false, length = 16)
    private String destinationType;

    @Column(name = "destination_value", nullable = false, length = 500)
    private String destinationValue;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false, length = 16)
    private String status = "DRAFT";

    @Column(nullable = false)
    private boolean enabled = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "product_id")
    private Product product;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "category_id")
    private Category category;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "updated_by")
    private User updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getSectionKey() { return sectionKey; }
    public void setSectionKey(String value) { sectionKey = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String value) { subtitle = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String value) { imageUrl = value; }
    public String getImageStorageKey() { return imageStorageKey; }
    public void setImageStorageKey(String value) { imageStorageKey = value; }
    public String getButtonText() { return buttonText; }
    public void setButtonText(String value) { buttonText = value; }
    public String getDestinationType() { return destinationType; }
    public void setDestinationType(String value) { destinationType = value; }
    public String getDestinationValue() { return destinationValue; }
    public void setDestinationValue(String value) { destinationValue = value; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int value) { displayOrder = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public Product getProduct() { return product; }
    public void setProduct(Product value) { product = value; }
    public Category getCategory() { return category; }
    public void setCategory(Category value) { category = value; }
    public void setUpdatedBy(User value) { updatedBy = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
