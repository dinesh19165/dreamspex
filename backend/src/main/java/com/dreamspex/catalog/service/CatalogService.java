package com.dreamspex.catalog.service;


import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.common.ApiException;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.util.*;
import static com.dreamspex.catalog.dto.CatalogDtos.*;
import static com.dreamspex.gst.GstDtos.*;

@Service
public class CatalogService {
    private final CategoryRepository categories;
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final CouponRepository coupons;

    public CatalogService(CategoryRepository categories, ProductRepository products, ProductVariantRepository variants,
                          CouponRepository coupons) {
        this.categories = categories; this.products = products; this.variants = variants; this.coupons = coupons;
    }

    @Transactional(readOnly = true)
    public List<CategoryResponse> publicCategories(String type) {
        String categoryType = categoryType(type);
        return categories.findByCategoryTypeAndStatusAndDeletedAtIsNullOrderBySortOrderAscNameAsc(categoryType, "ACTIVE")
                .stream().map(this::category).toList();
    }
    @Transactional(readOnly = true)
    public CategoryResponse publicCategory(String slug) {
        return category(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull(slug, "CATALOG", "ACTIVE")
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", "Category was not found.")));
    }
    @Transactional(readOnly = true)
    public PageResponse<ProductResponse> search(String q, String brand, String category, String material,
                                                String gender, String frameShape, String frameType, String color,
                                                String badge, boolean availableOnly, BigDecimal minPrice,
                                                BigDecimal maxPrice, int page, int pageSize, String sort) {
        if (page < 0 || pageSize < 1 || pageSize > 100) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PAGINATION", "Invalid pagination.");
        if (minPrice != null && maxPrice != null && minPrice.compareTo(maxPrice) > 0) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PRICE_RANGE", "Minimum price cannot exceed maximum price.");
        }
        Sort ordering = switch (sort == null ? "newest" : sort) {
            case "price_asc" -> Sort.by("basePrice").ascending();
            case "price_desc" -> Sort.by("basePrice").descending();
            case "name" -> Sort.by("name").ascending();
            default -> Sort.by("createdAt").descending();
        };
        Page<Product> result = products.search(blank(q), blank(brand), blank(category), blank(material), blank(gender),
                blank(frameShape), blank(frameType), blank(color), blank(badge), availableOnly,
                minPrice, maxPrice, PageRequest.of(page, pageSize, ordering));
        return new PageResponse<>(result.getContent().stream().map(this::product).toList(), page, pageSize, result.getTotalElements());
    }
    @Transactional(readOnly = true)
    public ProductFilterOptions productFilterOptions() {
        return new ProductFilterOptions(sorted(products.findPublicBrands()), sorted(products.findPublicMaterials()),
                sorted(products.findPublicGenders()), sorted(products.findPublicFrameShapes()),
                sorted(products.findPublicFrameTypes()), sorted(products.findPublicColors()),
                sorted(products.findPublicBadges()));
    }
    @Transactional(readOnly = true)
    public ProductResponse publicProduct(String id) {
        return product(products.findByIdAndStatusAndDeletedAtIsNull(id, "PUBLISHED")
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product was not found.")));
    }
    @Transactional(readOnly = true)
    public List<ProductResponse> adminProducts() { return products.findAll().stream().filter(p -> p.getDeletedAt() == null).map(this::product).toList(); }
    @Transactional(readOnly = true)
    public List<CategoryResponse> adminCategories(String type) {
        return categories.findByCategoryTypeAndDeletedAtIsNullOrderBySortOrderAscNameAsc(categoryType(type))
                .stream().map(this::category).toList();
    }
    @Transactional
    public CategoryResponse saveCategory(String id, CategoryRequest request) {
        Category value = id == null ? new Category() : categories.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", "Category was not found."));
        if (value.getDeletedAt() != null) throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_DELETED", "Deleted categories cannot be edited.");
        String name = request.name().trim();
        String slug = request.slug().trim().toLowerCase(Locale.ROOT);
        String requestedType = request.categoryType() == null ? value.getCategoryType()
                : request.categoryType().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("CATALOG", "OFFER").contains(requestedType)
                || id != null && !requestedType.equals(value.getCategoryType())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_CATEGORY_TYPE", "Category type cannot be changed.");
        }
        if (categories.existsByNameIgnoreCaseAndCategoryTypeAndDeletedAtIsNullAndIdNot(name, requestedType, value.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_NAME_EXISTS", "A category with this name already exists.");
        }
        if (categories.existsBySlugAndIdNot(slug, value.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_SLUG_EXISTS", "A category with this URL slug already exists.");
        }
        if (value.getSlug() != null && coupons.existsByOfferCategoryIgnoreCase(value.getSlug())
                && !value.getSlug().equalsIgnoreCase(slug)) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_IN_USE", "The category URL slug cannot change while offers are linked.");
        }
        String status = request.status() == null ? "ACTIVE" : request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("ACTIVE", "INACTIVE").contains(status)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_CATEGORY_STATUS", "Category status must be Active or Inactive.");
        }
        value.setName(name); value.setSlug(slug); value.setCategoryType(requestedType); value.setDescription(request.description());
        value.setImageUrl(request.imageUrl()); value.setSortOrder(request.sortOrder()); value.setStatus(status);
        return category(categories.save(value));
    }
    @Transactional
    public void deleteCategory(String id) {
        Category value = categories.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CATEGORY_NOT_FOUND", "Category was not found."));
        if ("OFFER".equals(value.getCategoryType()) && coupons.existsByOfferCategoryIgnoreCase(value.getSlug())) {
            throw new ApiException(HttpStatus.CONFLICT, "CATEGORY_IN_USE", "This category is linked to offers and cannot be deleted.");
        }
        value.setDeletedAt(java.time.Instant.now()); value.setStatus("INACTIVE"); categories.save(value);
    }
    @Transactional
    public ProductResponse saveProduct(String id, ProductRequest request) {
        Product value = id == null ? new Product() : products.findWithLockById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product was not found."));
        value.setSku(request.sku().trim()); value.setName(request.name().trim()); value.setSlug(request.slug().trim().toLowerCase()); value.setBrand(request.brand().trim());
        value.setDescription(request.description()); value.setMaterial(request.material()); value.setGender(request.gender()); value.setFrameShape(request.frameShape()); value.setFrameType(request.frameType());
        value.setBasePrice(request.basePrice()); value.setCompareAtPrice(request.compareAtPrice()); value.setBadge(request.badge());
        if (request.tryOnImageUrl() != null) value.setTryOnImageUrl(blank(request.tryOnImageUrl()));
        value.setStatus(request.status() == null ? "DRAFT" : request.status());
        value.getCategories().clear();
        if (request.categoryIds() != null) request.categoryIds().forEach(categoryId -> {
            Category category = categories.findById(categoryId)
                    .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CATEGORY_NOT_FOUND", "Category was not found."));
            if (!"CATALOG".equals(category.getCategoryType())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CATEGORY_NOT_FOUND", "Product category was not found.");
            }
            value.getCategories().add(category);
        });
        if (request.variants() != null) {
            Set<String> requestedSkus = new HashSet<>();
            Set<String> requestedVariantIds = new HashSet<>();
            for (VariantRequest item : request.variants()) {
                String sku = item.sku().trim();
                if (!requestedSkus.add(sku.toLowerCase(Locale.ROOT))) {
                    throw variantSkuConflict(sku);
                }
                if (item.id() != null && !requestedVariantIds.add(item.id())) {
                    throw new ApiException(HttpStatus.CONFLICT, "PRODUCT_VARIANT_CONFLICT",
                            "A product variant may only be included once.");
                }

                ProductVariant variant = item.id() == null ? null : value.getVariants().stream()
                        .filter(existing -> existing.getId().equals(item.id())).findFirst()
                        .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "PRODUCT_VARIANT_CONFLICT",
                                "The specified variant does not belong to this product."));
                Optional<ProductVariant> skuOwner = variants.findBySku(sku);
                if (skuOwner.isPresent() && (variant == null || !skuOwner.get().getId().equals(variant.getId()))) {
                    ProductVariant owner = skuOwner.get();
                    if (!owner.getProduct().getId().equals(value.getId())) {
                        throw variantSkuConflict(sku);
                    }
                    if (item.id() != null) {
                        throw variantSkuConflict(sku);
                    }
                    variant = owner;
                }
                if (variant == null) {
                    variant = new ProductVariant();
                    variant.setProduct(value);
                    value.getVariants().add(variant);
                }
                variant.setSku(sku);
                variant.setColor(item.color());
                variant.setSize(item.size());
                variant.setLensType(item.lensType());
                variant.setAdditionalPrice(item.additionalPrice());
                variant.setQuantity(item.quantity());
                variant.setReservedQuantity(item.reservedQuantity());
                variant.setStatus(item.status() == null ? "ACTIVE" : item.status());
            }
        }
        if (request.images() != null) {
            value.getImages().clear();
            for (ImageRequest item : request.images()) {
                ProductImage image = new ProductImage();
                image.setProduct(value);
                image.setImageUrl(item.imageUrl());
                image.setStorageKey(item.storageKey());
                image.setAltText(item.altText());
                image.setSortOrder(item.sortOrder());
                image.setPrimaryImage(item.primaryImage());
                value.getImages().add(image);
            }
        }
        return product(products.save(value));
    }
    @Transactional
    public ProductGstResponse updateProductGst(String id, ProductGstRequest request) {
        Product value = products.findWithLockById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product was not found."));
        if (Boolean.FALSE.equals(request.useGlobalRate()) && request.gstRate() == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PRODUCT_GST_RATE_REQUIRED",
                    "A product GST rate is required when the global rate is not selected.");
        }
        if (Boolean.TRUE.equals(request.useGlobalRate()) && request.gstRate() != null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PRODUCT_GST_RATE_CONFLICT",
                    "Remove the product GST rate when using the global rate.");
        }
        String hsnCode = request.hsnCode() == null || request.hsnCode().isBlank()
                ? null : request.hsnCode().trim();
        if (hsnCode != null && !hsnCode.matches("[0-9]{4}|[0-9]{6}|[0-9]{8}")) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_HSN_CODE",
                    "HSN code must contain 4, 6, or 8 digits.");
        }
        value.setHsnCode(hsnCode);
        value.setGstRate(Boolean.TRUE.equals(request.useGlobalRate()) ? null : request.gstRate());
        value.setGstEnabled(Boolean.TRUE.equals(request.gstEnabled()));
        Product saved = products.save(value);
        return new ProductGstResponse(saved.getId(), saved.getHsnCode(), saved.getGstRate(),
                saved.getGstRate() == null, saved.isGstEnabled());
    }
    @Transactional
    public void deleteProduct(String id) { Product value = products.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product was not found.")); value.setDeletedAt(java.time.Instant.now()); value.setStatus("INACTIVE"); products.save(value); }
    @Transactional
    public ProductResponse setProductStatus(String id, String status) {
        if (!Set.of("DRAFT", "PENDING_APPROVAL", "APPROVED", "PUBLISHED", "INACTIVE").contains(status))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_PRODUCT_STATUS", "Invalid product status.");
        Product value = products.findById(id).orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PRODUCT_NOT_FOUND", "Product was not found."));
        value.setStatus(status);
        return product(products.save(value));
    }
    private String blank(String value) { return value == null || value.isBlank() ? null : value.trim(); }
    private ApiException variantSkuConflict(String sku) {
        return new ApiException(HttpStatus.CONFLICT, "PRODUCT_VARIANT_SKU_CONFLICT",
                "A product variant with SKU '" + sku + "' already exists.");
    }
    private CategoryResponse category(Category v) { return new CategoryResponse(v.getId(), v.getName(), v.getSlug(), v.getDescription(), v.getImageUrl(), v.getStatus(), v.getSortOrder(), v.getCategoryType()); }
    private String categoryType(String value) {
        String type = value == null ? "CATALOG" : value.trim().toUpperCase(Locale.ROOT);
        if (!Set.of("CATALOG", "OFFER").contains(type)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_CATEGORY_TYPE", "Category type must be CATALOG or OFFER.");
        }
        return type;
    }
    private List<String> sorted(List<String> values) {
        return values.stream().map(String::trim).filter(value -> !value.isEmpty())
                .distinct().sorted(String.CASE_INSENSITIVE_ORDER).toList();
    }
    private ProductResponse product(Product v) { return new ProductResponse(v.getId(), v.getSku(), v.getName(), v.getSlug(), v.getBrand(), v.getDescription(), v.getMaterial(), v.getGender(), v.getFrameShape(), v.getFrameType(), v.getBasePrice(), v.getCompareAtPrice(), v.getBadge(), v.getTryOnImageUrl(), v.getHsnCode(), v.getGstRate(), v.isGstEnabled(), v.getStatus(), v.getCategories().stream().filter(c -> c.getDeletedAt() == null).map(this::category).toList(), v.getVariants().stream().map(x -> new VariantResponse(x.getId(), x.getSku(), x.getColor(), x.getSize(), x.getLensType(), x.getAdditionalPrice(), x.getQuantity(), x.getAvailableQuantity(), x.getStatus())).toList(), v.getImages().stream().map(x -> new ImageResponse(x.getId(), x.getImageUrl(), x.getStorageKey(), x.getAltText(), x.getSortOrder(), x.isPrimaryImage())).toList()); }
}
