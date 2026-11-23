package com.dreamspex.catalog;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.hamcrest.Matchers.hasItem;
import static org.hamcrest.Matchers.not;

import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.service.CatalogService;
import java.math.BigDecimal;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ProductCatalogVariantsIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired ProductRepository products;
    @Autowired CategoryRepository categories;
    @Autowired CatalogService catalogService;

    @Test
    void publishedProductWithFourActiveVariantsIsListedAndDetailedForCustomers() throws Exception {
        Category category = new Category();
        category.setName("Eyeglasses");
        category.setSlug("eyeglasses-variants-api-test");
        category.setCategoryType("CATALOG");
        category.setStatus("ACTIVE");
        category = categories.save(category);

        Product product = new Product();
        product.setSku("TEST-VARIANTS-API");
        product.setName("Variant API test frame");
        product.setSlug("variant-api-test-frame");
        product.setBrand("Dream Spex");
        product.setDescription("Product with multiple selectable options");
        product.setBasePrice(BigDecimal.valueOf(100));
        product.setStatus("PUBLISHED");
        product.getCategories().add(category);
        for (int index = 1; index <= 4; index++) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku("TEST-VARIANTS-API-" + index);
            variant.setColor("Color " + index);
            variant.setSize("Size " + index);
            variant.setLensType("Lens " + index);
            variant.setAdditionalPrice(BigDecimal.valueOf(index * 10));
            variant.setQuantity(5);
            variant.setReservedQuantity(1);
            variant.setStatus("ACTIVE");
            product.getVariants().add(variant);
        }
        product = products.save(product);
        ProductImage image = new ProductImage();
        image.setProduct(product);
        image.setVariant(product.getVariants().get(0));
        image.setImageUrl("/images/color-1.webp");
        image.setStorageKey("color-1.webp");
        image.setSortOrder(0);
        image.setPrimaryImage(true);
        product.getImages().add(image);
        product = products.save(product);

        mockMvc.perform(get("/api/v1/products").param("category", category.getSlug()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].variants.length()").value(4));
        mockMvc.perform(get("/api/v1/products/" + product.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants.length()").value(4))
                .andExpect(jsonPath("$.variants[0].reservedQuantity").value(1))
                .andExpect(jsonPath("$.variants[0].availableQuantity").value(4))
                .andExpect(jsonPath("$.images[0].variantId").value(product.getVariants().get(0).getId()));
    }

    @Test
    void createsVariantMappedImageInOneCatalogSave() throws Exception {
        Category category = new Category();
        category.setName("Mapped image category");
        category.setSlug("mapped-image-category");
        category.setCategoryType("CATALOG");
        category.setStatus("ACTIVE");
        category = categories.save(category);

        String variantId = UUID.randomUUID().toString();
        var request = new com.dreamspex.catalog.dto.CatalogDtos.ProductRequest(
                "TEST-MAPPED-IMAGE", "Mapped frame", "mapped-frame", "Dream Spex", "Mapped test frame",
                "Metal", "Unisex", "Round", "Full Rim", BigDecimal.valueOf(100), null, null, null,
                "PUBLISHED", Set.of(category.getId()),
                List.of(new com.dreamspex.catalog.dto.CatalogDtos.VariantRequest(variantId,
                        "TEST-MAPPED-IMAGE-YELLOW", "Yellow", "50", "Clear", BigDecimal.ZERO,
                        5, 0, "ACTIVE")),
                List.of(new com.dreamspex.catalog.dto.CatalogDtos.ImageRequest("/images/yellow.webp",
                        "yellow.webp", "Mapped frame", 0, true, variantId)));

        var created = catalogService.saveProduct(null, request);

        assertEquals(variantId, created.images().get(0).variantId());
        mockMvc.perform(get("/api/v1/products/" + created.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.variants[0].id").value(variantId))
                .andExpect(jsonPath("$.images[0].variantId").value(variantId));
    }

    @Test
    void mixedColourVariantsMatchEachComponentWithoutDuplicatingProducts() throws Exception {
        Category category = new Category();
        category.setName("Mixed colour category");
        category.setSlug("mixed-colour-category-test");
        category.setCategoryType("CATALOG");
        category.setStatus("ACTIVE");
        category = categories.save(category);

        Product product = new Product();
        product.setSku("TEST-MIXED-COLOUR");
        product.setName("Mixed colour test frame");
        product.setSlug("mixed-colour-test-frame");
        product.setBrand("Dream Spex");
        product.setDescription("Frame with a mixed colour variant");
        product.setBasePrice(BigDecimal.valueOf(100));
        product.setStatus("PUBLISHED");
        product.getCategories().add(category);
        for (String color : List.of("RED / BLACK", "RED")) {
            ProductVariant variant = new ProductVariant();
            variant.setProduct(product);
            variant.setSku("TEST-MIXED-COLOUR-" + product.getVariants().size());
            variant.setColor(color);
            variant.setStatus("ACTIVE");
            variant.setQuantity(5);
            product.getVariants().add(variant);
        }
        product = products.save(product);

        mockMvc.perform(get("/api/v1/products").param("category", category.getSlug()).param("color", "red"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(product.getId()));
        mockMvc.perform(get("/api/v1/products").param("category", category.getSlug()).param("color", "BLACK"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(product.getId()));
        mockMvc.perform(get("/api/v1/products/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.colors", hasItem("RED")))
                .andExpect(jsonPath("$.colors", hasItem("BLACK")))
                .andExpect(jsonPath("$.colors", not(hasItem("RED / BLACK"))));
    }
}
