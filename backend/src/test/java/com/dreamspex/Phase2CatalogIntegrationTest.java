package com.dreamspex;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.franchise.FranchiseInventory;
import com.dreamspex.franchise.FranchiseInventoryRepository;
import com.dreamspex.franchise.FranchiseProductAssignment;
import com.dreamspex.franchise.FranchiseProductAssignmentRepository;
import com.dreamspex.franchise.FranchiseService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import java.util.List;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class Phase2CatalogIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired RoleRepository roles;
    @Autowired ProductRepository products;
    @Autowired CategoryRepository categories;
    @Autowired ProductVariantRepository variants;
    @Autowired StoreRepository stores;
    @Autowired FranchiseInventoryRepository franchiseInventory;
    @Autowired FranchiseProductAssignmentRepository assignments;
    @Autowired FranchiseService franchises;

    @Test
    void publicCatalogBrowsingIsAllowed() throws Exception {
        mockMvc.perform(get("/api/v1/categories")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/products")).andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/offers")).andExpect(status().isOk());
    }

    @Test
    void customerCannotMutateCatalog() throws Exception {
        mockMvc.perform(get("/api/v1/admin/products")
                .with(authentication(new UsernamePasswordAuthenticationToken("customer", null,
                        List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isForbidden());
    }

    @Test
    @Transactional
    void publicListingShowsOnlyPublishedProducts() throws Exception {
        Product published = product("published");
        Product draft = product("draft");
        draft.setStatus("DRAFT");
        Product inactive = product("inactive");
        inactive.setStatus("INACTIVE");
        products.saveAll(List.of(published, draft, inactive));

        mockMvc.perform(get("/api/v1/products?page=0&pageSize=20&sort=newest"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items.length()").value(1))
                .andExpect(jsonPath("$.items[0].id").value(published.getId()));
    }

    @Test
    @Transactional
    void publicSearchAppliesCombinedFiltersAndExposesEligibleFacets() throws Exception {
        Product product = product("faceted");
        String categorySlug = "eyeglasses-faceted";
        String[][] individualFilters = {
                {"category", categorySlug},
                {"brand", product.getBrand()},
                {"material", product.getMaterial()},
                {"gender", product.getGender()},
                {"frameShape", product.getFrameShape()},
                {"frameType", product.getFrameType()},
                {"color", "Black"},
                {"badge", product.getBadge()},
                {"availableOnly", "true"},
                {"minPrice", "10"},
                {"maxPrice", "10"}
        };
        for (String[] filter : individualFilters) {
            mockMvc.perform(get("/api/v1/products").param(filter[0], filter[1]))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.total").value(1));
        }

        mockMvc.perform(get("/api/v1/products")
                        .param("category", categorySlug)
                        .param("brand", product.getBrand())
                        .param("material", product.getMaterial())
                        .param("gender", product.getGender())
                        .param("frameShape", product.getFrameShape())
                        .param("frameType", product.getFrameType())
                        .param("color", "Black")
                        .param("badge", product.getBadge())
                        .param("availableOnly", "true")
                        .param("minPrice", "10")
                        .param("maxPrice", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(1))
                .andExpect(jsonPath("$.items[0].id").value(product.getId()));

        mockMvc.perform(get("/api/v1/products/filters"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.brands[0]").value("Dream Spex"))
                .andExpect(jsonPath("$.materials[0]").value("Acetate"))
                .andExpect(jsonPath("$.colors[0]").value("Black"));
    }

    @Test
    @Transactional
    void publicProductDetailsRequirePublishedStatus() throws Exception {
        Product published = product("detail-published");
        Product draft = product("detail-draft");
        draft.setStatus("DRAFT");
        Product inactive = product("detail-inactive");
        inactive.setStatus("INACTIVE");
        products.saveAll(List.of(published, draft, inactive));

        mockMvc.perform(get("/api/v1/products/" + published.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(published.getId()));
        mockMvc.perform(get("/api/v1/products/" + draft.getId())).andExpect(status().isNotFound());
        mockMvc.perform(get("/api/v1/products/" + inactive.getId())).andExpect(status().isNotFound());
    }

    @Test
    @Transactional
    void storefrontCatalogIncludesAllPublishedProductsWithoutAssignmentsOrStock() throws Exception {
        Product previouslyAssigned = product("franchise-assigned");
        Product neverAssigned = product("franchise-unassigned");
        Store store = new Store();
        store.setName("Test franchise");
        store.setAddress("1 Test Road");
        store.setCity("Test City");
        store.setState("Test State");
        store.setPostalCode("000001");
        store.setFranchiseManaged(true);
        store = stores.save(store);

        FranchiseProductAssignment assignment = new FranchiseProductAssignment();
        assignment.setStore(store);
        assignment.setProduct(previouslyAssigned);
        assignments.save(assignment);
        ProductVariant variant = variants.findBySku("TEST-VARIANT-franchise-assigned").orElseThrow();
        FranchiseInventory stock = new FranchiseInventory();
        stock.setStore(store);
        stock.setVariant(variant);
        stock.setQuantity(2);
        stock.setReservedQuantity(1);
        stock.setAvailabilityStatus("ACTIVE");
        franchiseInventory.save(stock);

        assertEquals(2, franchises.storefrontProductIds(store.getId()).size());
        int unassignedStock = franchises.storefrontAvailableQuantity(store.getId(),
                variants.findBySku("TEST-VARIANT-franchise-unassigned").orElseThrow().getId());
        assertEquals(0, unassignedStock);
        mockMvc.perform(get("/api/v1/products").param("franchiseId", store.getId()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(2));
        assertEquals(1, franchises.storefrontAvailableQuantity(store.getId(), variant.getId()));
        assertEquals(neverAssigned.getStatus(), "PUBLISHED");
    }

    private Product product(String suffix) {
        Product product = new Product();
        product.setSku("TEST-" + suffix);
        product.setName("Test " + suffix);
        product.setSlug("test-" + suffix);
        product.setBrand("Dream Spex");
        product.setDescription("Test product");
        product.setBasePrice(java.math.BigDecimal.TEN);
        product.setMaterial("Acetate");
        product.setGender("Unisex");
        product.setFrameShape("Round");
        product.setFrameType("Full Rim");
        product.setBadge("Bestseller");
        product.setStatus("PUBLISHED");
        Category category = new Category();
        category.setName("Eyeglasses");
        category.setSlug("eyeglasses-" + suffix);
        category.setCategoryType("CATALOG");
        category.setStatus("ACTIVE");
        category = categories.save(category);
        product.getCategories().add(category);
        product = products.save(product);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku("TEST-VARIANT-" + suffix);
        variant.setColor("Black");
        variant.setQuantity(5);
        variant.setReservedQuantity(1);
        variant.setStatus("ACTIVE");
        variants.save(variant);
        return product;
    }
}
