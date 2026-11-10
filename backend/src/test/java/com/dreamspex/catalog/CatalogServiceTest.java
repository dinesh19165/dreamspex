package com.dreamspex.catalog;


import com.dreamspex.catalog.dto.CatalogDtos;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.catalog.service.CatalogService;
import com.dreamspex.gst.GstDtos.ProductGstRequest;
import com.dreamspex.gst.GstDtos.ProductGstResponse;
import com.dreamspex.common.ApiException;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import java.math.BigDecimal;
import java.util.Optional;
import org.springframework.data.domain.PageImpl;
import java.util.List;
import static com.dreamspex.catalog.dto.CatalogDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertSame;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.anyString;
import org.springframework.http.HttpStatus;

@ExtendWith(MockitoExtension.class)
class CatalogServiceTest {
    @Mock CategoryRepository categories;
    @Mock ProductRepository products;
    @Mock ProductVariantRepository variants;
    @Mock CouponRepository coupons;

    @Test
    void publicProductHidesNonPublishedProducts() {
        CatalogService service = service();
        when(products.findByIdAndStatusAndDeletedAtIsNull("p1", "PUBLISHED")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.publicProduct("p1"));

        assertEquals("PRODUCT_NOT_FOUND", error.code());
    }

    @Test
    void publicSearchUsesPublishedProductsOnly() {
        CatalogService service = service();
        Product published = product("PUBLISHED");
        published.setTryOnImageUrl("/api/v1/cms/images/frame.webp");
        when(products.search(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), eq(false), isNull(), isNull(), any()))
                .thenReturn(new PageImpl<>(List.of(published)));

        ProductResponse response = service.search(null, null, null, null, null, null, null,
                null, null, false, null, null, 0, 20, "newest").items().get(0);
        assertEquals("/api/v1/cms/images/frame.webp", response.tryOnImageUrl());
        verify(products).search(isNull(), isNull(), isNull(), isNull(), isNull(), isNull(), isNull(),
                isNull(), isNull(), eq(false), isNull(), isNull(), any());
    }

    @Test
    void publicSearchForwardsCombinedFacetAndPriceFilters() {
        CatalogService service = service();
        when(products.search(eq("classic"), eq("Dream Spex"), eq("eyeglasses"), eq("acetate"),
                eq("Unisex"), eq("Round"), eq("Full Rim"), eq("Black"), eq("Bestseller"),
                eq(true), eq(new BigDecimal("100")), eq(new BigDecimal("500")), any()))
                .thenReturn(new PageImpl<>(List.of()));

        service.search("classic", "Dream Spex", "eyeglasses", "acetate", "Unisex",
                "Round", "Full Rim", "Black", "Bestseller", true,
                new BigDecimal("100"), new BigDecimal("500"), 0, 6, "price_asc");

        verify(products).search(eq("classic"), eq("Dream Spex"), eq("eyeglasses"), eq("acetate"),
                eq("Unisex"), eq("Round"), eq("Full Rim"), eq("Black"), eq("Bestseller"),
                eq(true), eq(new BigDecimal("100")), eq(new BigDecimal("500")), any());
    }

    @Test
    void rejectsInvertedPriceRangeBeforeQueryingProducts() {
        CatalogService service = service();

        ApiException error = assertThrows(ApiException.class, () -> service.search(
                null, null, null, null, null, null, null, null, null, false,
                new BigDecimal("500"), new BigDecimal("100"), 0, 6, "newest"));

        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
        assertEquals("INVALID_PRICE_RANGE", error.code());
        verifyNoInteractions(products);
    }

    @Test
    void publicFilterOptionsAreSortedAndExcludeBlankValues() {
        CatalogService service = service();
        when(products.findPublicBrands()).thenReturn(List.of("Zen", "acme", " "));

        ProductFilterOptions options = service.productFilterOptions();

        assertEquals(List.of("acme", "Zen"), options.brands());
        assertEquals(List.of(), options.materials());
    }

    @Test
    void savesTryOnImageSeparatelyFromCatalogueImages() {
        CatalogService service = service();
        when(products.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));
        ImageRequest catalogueImage = new ImageRequest(
                "https://cdn.example.test/catalogue.jpg", "catalogue-key", "Catalogue photo", 0, true);
        ProductRequest request = new ProductRequest("SKU", "Frame", "frame", "Brand", "Description",
                null, null, "Round", "Full Rim", java.math.BigDecimal.TEN, null, null,
                "/api/v1/cms/images/frame.webp", "DRAFT", null, null, List.of(catalogueImage));

        ProductResponse response = service.saveProduct(null, request);

        assertEquals("/api/v1/cms/images/frame.webp", response.tryOnImageUrl());
        assertEquals("https://cdn.example.test/catalogue.jpg", response.images().get(0).imageUrl());
    }

    @Test
    void updatesProductClassificationAndAllowsGlobalRateFallback() {
        CatalogService service = service();
        Product product = product("PUBLISHED");
        when(products.findWithLockById("product-id")).thenReturn(Optional.of(product));
        when(products.save(product)).thenReturn(product);

        ProductGstResponse response = service.updateProductGst("product-id",
                new ProductGstRequest("9004", true, null, true));

        assertEquals("9004", response.hsnCode());
        assertEquals(true, response.usesGlobalRate());
        assertNull(response.gstRate());
        assertEquals(true, response.gstEnabled());
    }

    @Test
    void requiresAnExplicitProductRateWhenGlobalRateIsNotSelected() {
        CatalogService service = service();
        Product product = product("PUBLISHED");
        when(products.findWithLockById("product-id")).thenReturn(Optional.of(product));

        ApiException error = assertThrows(ApiException.class, () -> service.updateProductGst("product-id",
                new ProductGstRequest("9004", false, null, true)));

        assertEquals("PRODUCT_GST_RATE_REQUIRED", error.code());
        verify(products, never()).save(any(Product.class));
    }

    @Test
    void omitsTryOnImageForProductsThatHaveNoOverlay() {
        CatalogService service = service();
        when(products.findByIdAndStatusAndDeletedAtIsNull("p1", "PUBLISHED"))
                .thenReturn(Optional.of(product("PUBLISHED")));

        assertNull(service.publicProduct("p1").tryOnImageUrl());
    }

    private Product product(String status) {
        Product product = new Product();
        product.setSku("SKU-" + status);
        product.setName("Test product");
        product.setSlug("test-" + status.toLowerCase());
        product.setBrand("Dream Spex");
        product.setDescription("Test description");
        product.setBasePrice(java.math.BigDecimal.TEN);
        product.setStatus(status);
        return product;
    }

    @Test
    void adminProductRequestRequiresPositivePriceThroughValidationContract() {
        ProductRequest request = new ProductRequest("SKU", "Name", "slug", "Brand", "Description",
                null, null, null, null, java.math.BigDecimal.ZERO, null, null, null, "DRAFT",
                null, null, null);
        assertEquals(java.math.BigDecimal.ZERO, request.basePrice());
    }

    @Test
    void createsOfferCategoryWithCatalogCategoryRecord() {
        CatalogService service = service();
        when(categories.existsByNameIgnoreCaseAndCategoryTypeAndDeletedAtIsNullAndIdNot(eq("Seasonal Offers"), eq("OFFER"), anyString()))
                .thenReturn(false);
        when(categories.existsBySlugAndIdNot(eq("seasonal-offers"), anyString())).thenReturn(false);
        when(categories.save(any(Category.class))).thenAnswer(invocation -> invocation.getArgument(0));
        CategoryRequest request = new CategoryRequest(
                " Seasonal Offers ", "seasonal-offers", "Seasonal savings", "/api/v1/cms/images/offers.webp",
                20, "ACTIVE", "OFFER");

        CategoryResponse response = service.saveCategory(null, request);

        assertEquals("Seasonal Offers", response.name());
        assertEquals("seasonal-offers", response.slug());
        assertEquals("OFFER", response.categoryType());
        assertEquals("Seasonal savings", response.description());
        verify(categories).save(any(Category.class));
    }

    @Test
    void rejectsDuplicateCategoryNamesWithoutSaving() {
        CatalogService service = service();
        when(categories.existsByNameIgnoreCaseAndCategoryTypeAndDeletedAtIsNullAndIdNot(eq("Seasonal Offers"), eq("OFFER"), anyString()))
                .thenReturn(true);

        ApiException error = assertThrows(ApiException.class, () -> service.saveCategory(null,
                new CategoryRequest("Seasonal Offers", "another-slug", null, null, 0, "ACTIVE", "OFFER")));

        assertEquals(HttpStatus.CONFLICT, error.status());
        assertEquals("CATEGORY_NAME_EXISTS", error.code());
        verify(categories, never()).save(any(Category.class));
    }

    @Test
    void preventsDeletingOfferCategoryWhileOffersAreLinked() {
        CatalogService service = service();
        Category category = new Category();
        category.setName("Seasonal Offers");
        category.setSlug("seasonal-offers");
        category.setCategoryType("OFFER");
        when(categories.findById(category.getId())).thenReturn(Optional.of(category));
        when(coupons.existsByOfferCategoryIgnoreCase("seasonal-offers")).thenReturn(true);

        ApiException error = assertThrows(ApiException.class, () -> service.deleteCategory(category.getId()));

        assertEquals(HttpStatus.CONFLICT, error.status());
        assertEquals("CATEGORY_IN_USE", error.code());
        verify(categories, never()).save(any(Category.class));
    }

    @Test
    void editsExistingVariantByIdAndPreservesImagesAndTryOnImage() {
        CatalogService service = service();
        Product existing = product("DRAFT");
        existing.setTryOnImageUrl("/try-on/frame.webp");
        ProductVariant variant = variant(existing, "DS-EYE-002-BLK");
        variant.setQuantity(5);
        existing.getVariants().add(variant);
        ProductImage image = new ProductImage();
        image.setProduct(existing);
        image.setImageUrl("/images/frame.webp");
        existing.getImages().add(image);
        when(products.findWithLockById(existing.getId())).thenReturn(Optional.of(existing));
        when(variants.findBySku("DS-EYE-002-BLK")).thenReturn(Optional.of(variant));
        when(products.save(existing)).thenReturn(existing);

        ProductResponse response = service.saveProduct(existing.getId(), request(
                List.of(variantRequest(variant.getId(), "DS-EYE-002-BLK", 12)), null, null));

        assertEquals(1, existing.getVariants().size());
        assertSame(variant, existing.getVariants().get(0));
        assertEquals(12, variant.getQuantity());
        assertEquals("/images/frame.webp", response.images().get(0).imageUrl());
        assertEquals("/try-on/frame.webp", response.tryOnImageUrl());
        assertEquals(variant.getId(), response.variants().get(0).id());
    }

    @Test
    void rejectsVariantSkuOwnedByAnotherProductWithConflict() {
        CatalogService service = service();
        Product otherProduct = product("DRAFT");
        ProductVariant existingVariant = variant(otherProduct, "DS-EYE-002-BLK");
        otherProduct.getVariants().add(existingVariant);
        when(variants.findBySku("DS-EYE-002-BLK")).thenReturn(Optional.of(existingVariant));

        ApiException error = assertThrows(ApiException.class, () -> service.saveProduct(null, request(
                List.of(variantRequest(null, "DS-EYE-002-BLK", 3)), null, null)));

        assertEquals(HttpStatus.CONFLICT, error.status());
        assertEquals("PRODUCT_VARIANT_SKU_CONFLICT", error.code());
        verify(products, never()).save(any(Product.class));
        assertEquals("DS-EYE-002-BLK", existingVariant.getSku());
    }

    @Test
    void createsProductAndVariantWhenSkuIsAvailable() {
        CatalogService service = service();
        when(variants.findBySku("DS-EYE-003-BLK")).thenReturn(Optional.empty());
        when(products.save(any(Product.class))).thenAnswer(invocation -> invocation.getArgument(0));

        ProductResponse response = service.saveProduct(null, request(
                List.of(variantRequest(null, "DS-EYE-003-BLK", 4)), List.of(), null));

        assertEquals(1, response.variants().size());
        assertEquals("DS-EYE-003-BLK", response.variants().get(0).sku());
        assertEquals(4, response.variants().get(0).quantity());
        verify(products).save(any(Product.class));
    }

    @Test
    void repeatedProductSaveUpdatesVariantInsteadOfAddingDuplicate() {
        CatalogService service = service();
        Product existing = product("DRAFT");
        ProductVariant variant = variant(existing, "DS-EYE-004-BLK");
        existing.getVariants().add(variant);
        when(products.findWithLockById(existing.getId())).thenReturn(Optional.of(existing));
        when(variants.findBySku("DS-EYE-004-BLK")).thenReturn(Optional.of(variant));
        when(products.save(existing)).thenReturn(existing);
        ProductRequest request = request(List.of(
                variantRequest(variant.getId(), "DS-EYE-004-BLK", 5)), List.of(), null);

        service.saveProduct(existing.getId(), request);
        service.saveProduct(existing.getId(), request);

        assertEquals(1, existing.getVariants().size());
        assertSame(variant, existing.getVariants().get(0));
        verify(products, times(2)).save(existing);
    }

    private CatalogService service() {
        return new CatalogService(categories, products, variants, coupons);
    }

    private ProductRequest request(List<VariantRequest> variants, List<ImageRequest> images, String tryOnImageUrl) {
        return new ProductRequest("PRODUCT-SKU", "Frame", "frame", "Brand", "Description",
                null, null, null, null, BigDecimal.TEN, null, null, tryOnImageUrl, "DRAFT",
                null, variants, images);
    }

    private VariantRequest variantRequest(String id, String sku, int quantity) {
        return new VariantRequest(id, sku, "Black", null, null, BigDecimal.ZERO, quantity, 0, "ACTIVE");
    }

    private ProductVariant variant(Product product, String sku) {
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku(sku);
        variant.setAdditionalPrice(BigDecimal.ZERO);
        variant.setQuantity(1);
        variant.setReservedQuantity(0);
        variant.setStatus("ACTIVE");
        return variant;
    }
}
