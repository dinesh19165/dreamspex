package com.dreamspex.catalog.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "coupons")
public class Coupon {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(unique = true, length = 64)
    private String code;

    @Column(nullable = false)
    private String title;

    private String subtitle;
    private String description;

    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "offer_category", nullable = false, length = 120)
    private String offerCategory = "COUPON_OFFERS";

    @Column(name = "display_order", nullable = false)
    private int displayOrder;

    @Column(nullable = false)
    private boolean published = true;

    @Column(name = "customer_eligibility", nullable = false, length = 32)
    private String customerEligibility = "ALL";

    @Column(name = "applicable_product_ids", columnDefinition = "json")
    private String applicableProductIds;

    @Column(name = "applicable_category_ids", columnDefinition = "json")
    private String applicableCategoryIds;

    @Column(name = "discount_type", nullable = false)
    private String discountType;

    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_subtotal", precision = 12, scale = 2)
    private BigDecimal minSubtotal;

    @Column(name = "max_discount", precision = 12, scale = 2)
    private BigDecimal maxDiscount;

    @Column(name = "starts_at", nullable = false)
    private Instant startsAt;

    @Column(name = "ends_at")
    private Instant endsAt;

    @Column(name = "usage_limit")
    private Integer usageLimit;

    @Column(name = "per_user_limit")
    private Integer perUserLimit;

    @Column(nullable = false)
    private String status = "ACTIVE";

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getCode() { return code; }
    public void setCode(String value) { code = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getSubtitle() { return subtitle; }
    public void setSubtitle(String value) { subtitle = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public String getImageUrl() { return imageUrl; }
    public void setImageUrl(String value) { imageUrl = value; }
    public String getOfferCategory() { return offerCategory; }
    public void setOfferCategory(String value) { offerCategory = value; }
    public int getDisplayOrder() { return displayOrder; }
    public void setDisplayOrder(int value) { displayOrder = value; }
    public boolean isPublished() { return published; }
    public void setPublished(boolean value) { published = value; }
    public String getCustomerEligibility() { return customerEligibility; }
    public void setCustomerEligibility(String value) { customerEligibility = value; }
    public String getApplicableProductIds() { return applicableProductIds; }
    public void setApplicableProductIds(String value) { applicableProductIds = value; }
    public String getApplicableCategoryIds() { return applicableCategoryIds; }
    public void setApplicableCategoryIds(String value) { applicableCategoryIds = value; }
    public String getDiscountType() { return discountType; }
    public void setDiscountType(String value) { discountType = value; }
    public BigDecimal getDiscountValue() { return discountValue; }
    public void setDiscountValue(BigDecimal value) { discountValue = value; }
    public BigDecimal getMinSubtotal() { return minSubtotal; }
    public void setMinSubtotal(BigDecimal value) { minSubtotal = value; }
    public BigDecimal getMaxDiscount() { return maxDiscount; }
    public void setMaxDiscount(BigDecimal value) { maxDiscount = value; }
    public Instant getStartsAt() { return startsAt; }
    public void setStartsAt(Instant value) { startsAt = value; }
    public Instant getEndsAt() { return endsAt; }
    public void setEndsAt(Instant value) { endsAt = value; }
    public Integer getUsageLimit() { return usageLimit; }
    public void setUsageLimit(Integer value) { usageLimit = value; }
    public Integer getPerUserLimit() { return perUserLimit; }
    public void setPerUserLimit(Integer value) { perUserLimit = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
}
