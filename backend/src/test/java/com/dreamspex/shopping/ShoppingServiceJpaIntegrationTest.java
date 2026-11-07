package com.dreamspex.shopping;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.prescription.LensOption;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.prescription.Prescription;
import com.dreamspex.prescription.PrescriptionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.test.web.servlet.MockMvc;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.springframework.http.MediaType;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class ShoppingServiceJpaIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired ProductRepository products;
    @Autowired ProductVariantRepository variants;
    @Autowired PrescriptionRepository prescriptions;
    @Autowired LensOptionRepository lensOptions;

    @Test
    void postCartItemsPersistsPrescriptionAndCurrentLensPrice() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User user = new User();
        user.setEmail("cart-" + suffix + "@example.com");
        user.setPasswordHash("test-password-hash");
        user.setDisplayName("Cart Test");
        user.setStatus("ACTIVE");
        user = users.save(user);

        Product product = new Product();
        product.setSku("CART-" + suffix);
        product.setName("Cart test frame");
        product.setSlug("cart-test-" + suffix);
        product.setBrand("Dream Spex");
        product.setDescription("Integration test frame");
        product.setBasePrice(new BigDecimal("1000.00"));
        product.setStatus("PUBLISHED");
        product = products.save(product);

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku("CART-VARIANT-" + suffix);
        variant.setAdditionalPrice(new BigDecimal("50.00"));
        variant.setQuantity(5);
        variant.setReservedQuantity(0);
        variant.setStatus("ACTIVE");
        variant = variants.save(variant);

        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(product);
        prescription.setPatientName("Cart Test");
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION,BLUE_LIGHT");
        prescription = prescriptions.save(prescription);

        LensOption lensType = lensOption("SINGLE_VISION", "TYPE", BigDecimal.ZERO);
        LensOption coating = lensOption("BLUE_LIGHT", "COATING", new BigDecimal("125.00"));
        lensOptions.saveAll(List.of(lensType, coating));

        mockMvc.perform(post("/api/v1/cart/items")
                        .with(authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "variantId": "%s",
                                  "quantity": 1,
                                  "prescriptionId": "%s",
                                  "selectedLensCodes": ["SINGLE_VISION", "BLUE_LIGHT"]
                                }
                                """.formatted(variant.getId(), prescription.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items", hasSize(1)))
                .andExpect(jsonPath("$.items[0].prescriptionId").value(prescription.getId()))
                .andExpect(jsonPath("$.items[0].selectedLensCodes", contains("SINGLE_VISION", "BLUE_LIGHT")))
                .andExpect(jsonPath("$.items[0].lensAdditionalPrice").value(125.0))
                .andExpect(jsonPath("$.items[0].unitPrice").value(1175.0));
    }

    private LensOption lensOption(String code, String category, BigDecimal price) {
        LensOption option = new LensOption();
        option.setCode(code);
        option.setName(code);
        option.setCategory(category);
        option.setBenefits("Integration test option");
        option.setAdditionalCost(price);
        option.setAvailable(true);
        return option;
    }
}
