package com.dreamspex.catalog.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Set;

public final class CatalogDtos {
    private CatalogDtos() {}
    public record CategoryRequest(@NotBlank @Size(max=120) String name, @NotBlank @Size(max=140) String slug,
                                  @Size(max=2000) String description, @Size(max=1000) String imageUrl,
                                  @Min(0) int sortOrder, String status, String categoryType) {}
    public record CategoryResponse(String id, String name, String slug, String description, String imageUrl,
                                   String status, int sortOrder, String categoryType) {}
    public record VariantRequest(String id, @NotBlank @Size(max=80) String sku, @Size(max=80) String color,
                                 @Size(max=32) String size, @Size(max=80) String lensType,
                                 @NotNull @DecimalMin("0.00") BigDecimal additionalPrice,
                                 @Min(0) int quantity, @Min(0) int reservedQuantity, String status) {}
    public record ImageRequest(@NotBlank @Size(max=1000) String imageUrl, @Size(max=500) String storageKey,
                               @Size(max=255) String altText, @Min(0) int sortOrder, boolean primaryImage) {}
    public record ProductRequest(@NotBlank @Size(max=80) String sku, @NotBlank @Size(max=180) String name,
                                 @NotBlank @Size(max=220) String slug, @NotBlank @Size(max=120) String brand,
                                 @NotBlank String description, @Size(max=80) String material, @Size(max=40) String gender,
                                 @Size(max=80) String frameShape, @Size(max=80) String frameType,
                                 @NotNull @DecimalMin("0.00") BigDecimal basePrice, @DecimalMin("0.00") BigDecimal compareAtPrice,
                                 String badge, @Size(max=1000) String tryOnImageUrl, String status, Set<String> categoryIds,
                                 @Valid List<VariantRequest> variants, @Valid List<ImageRequest> images) {}
    public record VariantResponse(String id, String sku, String color, String size, String lensType,
                                  BigDecimal additionalPrice, int quantity, int availableQuantity, String status) {}
    public record ImageResponse(String id, String imageUrl, String storageKey, String altText, int sortOrder,
                                boolean primaryImage) {}
    public record ProductResponse(String id, String sku, String name, String slug, String brand, String description,
                                  String material, String gender, String frameShape, String frameType,
                                  BigDecimal basePrice, BigDecimal compareAtPrice, String badge, String tryOnImageUrl,
                                  String hsnCode, BigDecimal gstRate, boolean gstEnabled, String status,
                                  List<CategoryResponse> categories, List<VariantResponse> variants,
                                  List<ImageResponse> images) {}
    public record PageResponse<T>(List<T> items, int page, int pageSize, long total) {}
    public record ProductFilterOptions(List<String> brands, List<String> materials, List<String> genders,
                                       List<String> frameShapes, List<String> frameTypes, List<String> colors,
                                       List<String> badges) {}
    public record CartItemRequest(@NotBlank String variantId, @Min(1) @Max(99) int quantity,
                                  String prescriptionId, List<@NotBlank @Pattern(regexp="[A-Z0-9_]{2,64}") String> selectedLensCodes) {}
    public record CartItemResponse(String id, String variantId, String productId, String productName,
                                   String imageUrl, String sku, int quantity, BigDecimal unitPrice, BigDecimal lineTotal,
                                   int availableQuantity, String prescriptionId, List<String> selectedLensCodes,
                                   BigDecimal lensAdditionalPrice) {}
    public record CartResponse(String id, List<CartItemResponse> items, BigDecimal subtotal) {}
    public record WishlistRequest(@NotBlank String variantId) {}
    public record WishlistResponse(String id, String variantId, String productId, String productName,
                                   BigDecimal price, int availableQuantity) {}
    public record CouponRequest(@NotBlank @Size(max=64) String code, @NotNull @DecimalMin("0.00") BigDecimal subtotal) {}
    public record CouponResponse(String code, boolean valid, BigDecimal discount, String message) {}
    public record OfferRequest(
            @Size(max=64) String couponCode,
            @NotBlank @Size(max=180) String title,
            @Size(max=500) String subtitle,
            @NotBlank @Size(max=5000) String description,
            @NotBlank @Size(max=1000) String imageUrl,
            @NotBlank @Size(max=120) String category,
            @NotBlank @Size(max=16) String discountType,
            @NotNull @DecimalMin("0.01") BigDecimal discountValue,
            @DecimalMin("0.00") BigDecimal minSubtotal,
            @DecimalMin("0.00") BigDecimal maxDiscount,
            @NotNull Instant startsAt,
            Instant endsAt,
            @Min(1) Integer usageLimit,
            @Min(1) Integer perUserLimit,
            @NotBlank @Size(max=32) String customerEligibility,
            @Min(0) int displayOrder,
            boolean active,
            @NotBlank @Size(max=16) String publicationStatus,
            List<String> applicableProductIds,
            List<String> applicableCategoryIds) {}
    public record OfferResponse(
            String id,
            String couponCode,
            String title,
            String subtitle,
            String description,
            String imageUrl,
            String category,
            String discountType,
            BigDecimal discountValue,
            BigDecimal minSubtotal,
            BigDecimal maxDiscount,
            Instant startsAt,
            Instant endsAt,
            Integer usageLimit,
            Integer perUserLimit,
            String customerEligibility,
            int displayOrder,
            boolean active,
            String publicationStatus,
            List<String> applicableProductIds,
            List<String> applicableCategoryIds,
            String linkUrl) {}
}
