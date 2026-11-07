package com.dreamspex.order;
import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.dto.AuthDtos.AddressResponse;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartItemRepository;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;import com.dreamspex.prescription.LensOption;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.prescription.Prescription;
import com.dreamspex.prescription.PrescriptionFile;
import com.dreamspex.prescription.PrescriptionFileRepository;
import com.dreamspex.prescription.PrescriptionRepository;
import com.dreamspex.prescription.PrescriptionStorage;import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.AfterEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import static org.hamcrest.Matchers.hasSize;
import static org.hamcrest.Matchers.containsInAnyOrder;
import static org.hamcrest.Matchers.nullValue;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static com.dreamspex.order.OrderDtos.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.junit.jupiter.api.Assertions.assertEquals;

@SpringBootTest(properties = "dreamspex.storage.local-directory=target/test-private-prescriptions")
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class OrderCreationJpaIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired StoreRepository stores;
    @Autowired AddressRepository addresses;
    @Autowired ProductRepository products;
    @Autowired ProductVariantRepository variants;
    @Autowired LensOptionRepository lensOptions;
    @Autowired PrescriptionRepository prescriptions;
    @Autowired CartRepository carts;
    @Autowired CartItemRepository cartItems;
    @Autowired OrderRepository orders;
    @Autowired OrderItemRepository orderItems;
    @Autowired PrescriptionFileRepository prescriptionFiles;
    @Autowired PrescriptionStorage prescriptionStorage;
    @Autowired ObjectMapper objectMapper;
    private final List<String> storedFiles = new ArrayList<>();

    @Test
    void customerAddressesStoreValidatedCoordinatePairs() throws Exception {
        User user = createUser(UUID.randomUUID().toString());
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        String addressJson = """
                {"label":"Home","recipientName":"Order Test","phone":"+919876543210","line1":"1 Test Street",
                 "line2":"","city":"Hyderabad","state":"Telangana","postalCode":"500001","countryCode":"IN",
                 "defaultAddress":true,"latitude":17.385,"longitude":78.4867}
                """;

        MvcResult saved = mockMvc.perform(post("/api/v1/me/addresses").with(customer)
                        .contentType(MediaType.APPLICATION_JSON).content(addressJson))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.defaultAddress").value(true))
                .andExpect(jsonPath("$.latitude").value(17.385))
                .andExpect(jsonPath("$.longitude").value(78.4867))
                .andReturn();
        AddressResponse response = objectMapper.readValue(saved.getResponse().getContentAsByteArray(),
                AddressResponse.class);
        mockMvc.perform(get("/api/v1/me/addresses").with(customer))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].latitude").value(17.385))
                .andExpect(jsonPath("$[0].longitude").value(78.4867));

        mockMvc.perform(post("/api/v1/me/addresses").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addressJson.replace("\"defaultAddress\":true", "\"defaultAddress\":false")
                                .replace(",\"latitude\":17.385,\"longitude\":78.4867", "")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.defaultAddress").value(false))
                .andExpect(jsonPath("$.latitude").value(nullValue()))
                .andExpect(jsonPath("$.longitude").value(nullValue()));

        mockMvc.perform(post("/api/v1/me/addresses").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addressJson.replace("\"latitude\":17.385", "\"latitude\":91")))
                .andExpect(status().isUnprocessableEntity());
        mockMvc.perform(patch("/api/v1/me/addresses/{id}", response.id()).with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(addressJson.replace(",\"longitude\":78.4867", "")))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void firstManuallyEnteredAddressBecomesDefaultWithoutCoordinates() throws Exception {
        User user = createUser(UUID.randomUUID().toString());
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));

        mockMvc.perform(post("/api/v1/me/addresses").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"label":"Home","recipientName":"Order Test","phone":"+919876543210",
                                 "line1":"1 Test Street","line2":"","city":"Hyderabad","state":"Telangana",
                                 "postalCode":"500001","countryCode":"IN","defaultAddress":false,
                                 "latitude":null,"longitude":null}
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.defaultAddress").value(true))
                .andExpect(jsonPath("$.latitude").value(nullValue()))
                .andExpect(jsonPath("$.longitude").value(nullValue()));
    }

    @Test
    void quoteAcceptsValidCheckoutRequestAndReportsInvalidRequestFields() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User user = createUser(suffix);
        Address address = createAddress(user);
        Cart cart = new Cart();
        cart.setUser(user);
        cart = carts.save(cart);
        Product product = createProduct("QUOTE-" + suffix);
        ProductVariant variant = createVariant(product, "QUOTE-" + suffix, "0.00");
        CartItem item = cartItem(cart, variant, null, null, "0.00", "800.00");
        cart.getItems().add(cartItems.save(item));
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));

        mockMvc.perform(post("/api/v1/checkout/quote").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.subtotal").value(800.0))
                .andExpect(jsonPath("$.total").value(899.0))
                .andExpect(jsonPath("$.deliveryAvailability.available").value(true))
                .andExpect(jsonPath("$.deliveryAvailability.distanceKm").value(0.0))
                .andExpect(jsonPath("$.deliveryAvailability.radiusKm").value(100.0));

        address.setLatitude(new BigDecimal("20.0000000"));
        address.setLongitude(new BigDecimal("80.0000000"));
        addresses.save(address);
        mockMvc.perform(post("/api/v1/checkout/quote").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryAvailability.available").value(false))
                .andExpect(jsonPath("$.deliveryAvailability.status").value("OUTSIDE_DELIVERY_AREA"))
                .andExpect(jsonPath("$.deliveryAvailability.message").value("Sorry, this location is outside our delivery area."));

        mockMvc.perform(post("/api/v1/orders").with(customer)
                        .header("Idempotency-Key", "outside-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("DELIVERY_OUTSIDE_AREA"));

        mockMvc.perform(post("/api/v1/checkout/quote").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"","couponCode":"%s"}
                                """.formatted("X".repeat(65))))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("VALIDATION_ERROR"))
                .andExpect(jsonPath("$.fieldErrors[*].field",
                        containsInAnyOrder("addressId", "couponCode")));
    }

    @Test
    void quoteAndOrderFailClosedForMissingCustomerLocationAndStoreConfiguration() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User user = createUser(suffix);
        Address address = createAddress(user);
        address.setLatitude(null);
        address.setLongitude(null);
        addresses.save(address);
        Cart cart = new Cart();
        cart.setUser(user);
        cart = carts.save(cart);
        Product product = createProduct("SERVICEABILITY-" + suffix);
        ProductVariant variant = createVariant(product, "SERVICEABILITY-" + suffix, "0.00");
        cart.getItems().add(cartItems.save(cartItem(cart, variant, null, null, "0.00", "800.00")));
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));

        mockMvc.perform(post("/api/v1/checkout/quote").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryAvailability.available").value(false))
                .andExpect(jsonPath("$.deliveryAvailability.status").value("LOCATION_REQUIRED"));

        mockMvc.perform(post("/api/v1/orders").with(customer)
                        .header("Idempotency-Key", "missing-location-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("DELIVERY_LOCATION_REQUIRED"));

        address.setLatitude(new BigDecimal("17.3850000"));
        address.setLongitude(new BigDecimal("78.4867000"));
        addresses.save(address);
        stores.deleteAll();
        mockMvc.perform(post("/api/v1/checkout/quote").with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.deliveryAvailability.available").value(false))
                .andExpect(jsonPath("$.deliveryAvailability.status").value("STORE_CONFIGURATION_REQUIRED"));

        mockMvc.perform(post("/api/v1/orders").with(customer)
                        .header("Idempotency-Key", "missing-store-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isServiceUnavailable())
                .andExpect(jsonPath("$.code").value("DELIVERY_CONFIGURATION_UNAVAILABLE"));
    }

    @AfterEach
    void removeStoredTestFiles() throws IOException {
        Path root = Path.of("target/test-private-prescriptions").toAbsolutePath().normalize();
        for (String file : storedFiles) Files.deleteIfExists(root.resolve(file).normalize());
        storedFiles.clear();
    }

    @Test
    void createsOrderForPrescriptionAndOrdinaryCartItems() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User user = createUser(suffix);
        Address address = createAddress(user);
        Product prescriptionProduct = createProduct("PRESCRIPTION-" + suffix);
        Product ordinaryProduct = createProduct("ORDINARY-" + suffix);
        ProductVariant prescriptionVariant = createVariant(prescriptionProduct, "PRESCRIPTION-" + suffix, "120.00");
        ProductVariant ordinaryVariant = createVariant(ordinaryProduct, "ORDINARY-" + suffix, "0.00");
        LensOption type = createLensOption("SINGLE_VISION", "TYPE", "0.00");
        LensOption coating = createLensOption("BLUE_LIGHT", "COATING", "150.00");
        LensOption material = createLensOption("STANDARD", "MATERIAL", "0.00");
        type.setName("Single Vision");
        type.setPreparationDays(5);
        coating.setName("Blue Light Protection");
        coating.setPreparationDays(2);
        material.setName("Standard");
        material.setPreparationDays(3);
        lensOptions.saveAll(List.of(type, coating, material));

        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(prescriptionProduct);
        prescription.setPatientName("Test Customer");
        prescription.setRightSph(new BigDecimal("-2.25"));
        prescription.setRightCyl(new BigDecimal("-0.75"));
        prescription.setRightAxis(90);
        prescription.setRightAdd(new BigDecimal("1.00"));
        prescription.setLeftSph(new BigDecimal("-1.50"));
        prescription.setLeftCyl(new BigDecimal("-0.50"));
        prescription.setLeftAxis(80);
        prescription.setLeftAdd(new BigDecimal("1.00"));
        prescription.setPd(new BigDecimal("63.00"));
        prescription.setRightPd(new BigDecimal("31.00"));
        prescription.setLeftPd(new BigDecimal("32.00"));
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION,BLUE_LIGHT,STANDARD");
        prescription = prescriptions.save(prescription);

        Cart cart = new Cart();
        cart.setUser(user);
        cart = carts.save(cart);
        CartItem prescriptionItem = cartItem(cart, prescriptionVariant, prescription, "SINGLE_VISION,BLUE_LIGHT,STANDARD",
                "150.00", "1070.00");
        CartItem ordinaryItem = cartItem(cart, ordinaryVariant, null, null, "0.00", "800.00");
        cart.getItems().addAll(cartItems.saveAll(List.of(prescriptionItem, ordinaryItem)));

        mockMvc.perform(post("/api/v1/orders")
                        .with(authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))))
                        .header("Idempotency-Key", "order-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.items", hasSize(2)))
                .andExpect(jsonPath("$.subtotal").value(1870.0))
                .andExpect(jsonPath("$.total").value(1969.0));

        Order order = orders.findByUserIdAndIdempotencyKey(user.getId(), "order-" + suffix).orElseThrow();
        assertNotNull(order.getFulfillmentStore());
        assertTrue(order.getAddressSnapshot().contains("\"latitude\":17.385"));
        assertTrue(order.getAddressSnapshot().contains("\"longitude\":78.4867"));
        List<OrderItem> savedItems = orderItems.findAll().stream()
                .filter(item -> item.getOrder().getId().equals(order.getId())).toList();
        assertEquals(2, savedItems.size());
        OrderItem savedPrescriptionItem = savedItems.stream()
                .filter(item -> item.getPrescription() != null).findFirst().orElseThrow();
        assertEquals(prescription.getId(), savedPrescriptionItem.getPrescription().getId());
        assertEquals("SINGLE_VISION,BLUE_LIGHT,STANDARD", savedPrescriptionItem.getSelectedLensCodes());
        assertEquals(new BigDecimal("150.00"), savedPrescriptionItem.getLensAdditionalPrice());
        assertEquals(new BigDecimal("1070.00"), savedPrescriptionItem.getUnitPrice());
        assertEquals(1, savedItems.stream().filter(item -> item.getPrescription() == null).count());
        assertEquals(order.getId(), prescriptions.findById(prescription.getId()).orElseThrow().getOrder().getId());

        var admin = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        MvcResult detailsResult = mockMvc.perform(get("/api/v1/admin/orders/{id}", order.getId()).with(admin))
                .andExpect(status().isOk()).andReturn();
        AdminOrderResponse details = objectMapper.readValue(detailsResult.getResponse().getContentAsByteArray(),
                AdminOrderResponse.class);
        AdminOrderItemResponse detailsItem = details.items().stream().filter(item -> item.prescription() != null)
                .findFirst().orElseThrow();
        assertEquals("MANUAL", detailsItem.prescription().source());
        assertEquals(new BigDecimal("-2.25"), detailsItem.prescription().rightSph());
        assertEquals(new BigDecimal("32.00"), detailsItem.prescription().leftPd());
        assertEquals(3, detailsItem.prescription().selectedLenses().size());
        assertEquals(5, detailsItem.prescription().preparationDays());
        assertTrue(detailsItem.prescription().files().isEmpty());

        MvcResult pdfResult = mockMvc.perform(get("/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-summary.pdf",
                        order.getId(), savedPrescriptionItem.getId()).with(admin))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andReturn();
        String summaryPdf = new String(pdfResult.getResponse().getContentAsByteArray(),
                java.nio.charset.StandardCharsets.US_ASCII);
        assertTrue(summaryPdf.startsWith("%PDF-1.4"));
        assertTrue(summaryPdf.contains("Right Eye \\(OD\\)"));
        assertTrue(summaryPdf.contains("SPH: -2.25"));
        assertTrue(summaryPdf.contains("Monocular PD - Right: 31.00 mm"));

        order.setStatus("PAID");
        order.setPaymentStatus("PAID");
        OrderStatusHistory paidHistory = new OrderStatusHistory();
        paidHistory.setOrder(order);
        paidHistory.setStatus("PAID");
        paidHistory.setNote("Payment confirmed");
        paidHistory.setChangedBy(user);
        order.getHistory().add(paidHistory);
        orders.save(order);
        int historyCountBeforeProcessing = order.getHistory().size();
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PROCESSING","note":"Preparing the order"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("PROCESSING"));
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}/status", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PROCESSING","note":"Duplicate submission"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.history", hasSize(historyCountBeforeProcessing + 1)));
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}/status", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SHIPPED","note":"Dispatched"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SHIPPED"));
        int historyCountAfterShipping = order.getHistory().size();
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}/status", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"SHIPPED","note":"Repeated dispatch"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.history", hasSize(historyCountAfterShipping)));
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}/status", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"PROCESSING","note":"Invalid backwards transition"}
                                """))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("INVALID_ORDER_TRANSITION"));
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}", order.getId()).with(admin)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DELIVERED","note":"Delivered"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("DELIVERED"));
        MvcResult timelineResult = mockMvc.perform(get("/api/v1/orders/{id}", order.getId())
                        .with(authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isOk())
                .andReturn();
        OrderResponse timeline = objectMapper.readValue(timelineResult.getResponse().getContentAsByteArray(),
                OrderResponse.class);
        assertEquals("DELIVERED", timeline.status());
        assertEquals(List.of("PENDING_PAYMENT", "PAID", "PROCESSING", "SHIPPED", "DELIVERED"),
                timeline.history().stream().map(HistoryResponse::status).toList());
        assertTrue(timeline.history().stream().map(HistoryResponse::createdAt)
                .reduce((previous, current) -> {
                    assertTrue(!current.isBefore(previous));
                    return current;
                }).isPresent());
        mockMvc.perform(patch("/api/v1/admin/orders/{orderId}", order.getId()).with(customer)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"status":"DELIVERED"}
                                """))
                .andExpect(status().isForbidden());

        for (String preparationStatus : List.of("PENDING", "IN_PREPARATION", "READY_FOR_DISPATCH")) {
            mockMvc.perform(patch("/api/v1/admin/orders/{orderId}/items/{itemId}/lens-preparation",
                            order.getId(), savedPrescriptionItem.getId()).with(admin)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("""
                                    {"status":"%s","notes":"Private preparation note"}
                                    """.formatted(preparationStatus)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.status").value(preparationStatus))
                    .andExpect(jsonPath("$.updatedBy").value("Order Test"))
                    .andExpect(jsonPath("$.updatedAt").isNotEmpty());

            MvcResult customerOrderResult = mockMvc.perform(get("/api/v1/orders/{id}", order.getId())
                            .with(authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                                    List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                    .andExpect(status().isOk())
                    .andReturn();
            OrderResponse customerOrder = objectMapper.readValue(
                    customerOrderResult.getResponse().getContentAsByteArray(), OrderResponse.class);
            ItemResponse customerLensItem = customerOrder.items().stream()
                    .filter(item -> item.lensPreparation() != null).findFirst().orElseThrow();
            assertEquals(preparationStatus, customerLensItem.lensPreparation().status());
            assertNotNull(customerLensItem.lensPreparation().updatedAt());
            ItemResponse customerOrderOrdinaryItem = customerOrder.items().stream()
                    .filter(item -> item.lensPreparation() == null).findFirst().orElseThrow();
            assertEquals("VAR-ORDINARY-" + suffix, customerOrderOrdinaryItem.sku());

            String customerJson = customerOrderResult.getResponse().getContentAsString();
            assertTrue(!customerJson.contains("Private preparation note"));
            assertTrue(!customerJson.contains("updatedBy"));
            assertTrue(!customerJson.contains("\"prescription\""));
        }
        OrderItem updatedItem = orderItems.findById(savedPrescriptionItem.getId()).orElseThrow();
        assertEquals("READY_FOR_DISPATCH", updatedItem.getLensPreparationStatus());
        assertEquals("Private preparation note", updatedItem.getLensPreparationNotes());
        assertEquals(user.getId(), updatedItem.getLensPreparationUpdatedBy().getId());
        assertNotNull(updatedItem.getLensPreparationUpdatedAt());

        mockMvc.perform(get("/api/v1/admin/orders/{id}", order.getId()).with(customer))
                .andExpect(status().isForbidden());
        User otherUser = createUser("OTHER-" + suffix);
        var otherCustomer = authentication(new UsernamePasswordAuthenticationToken(otherUser.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/orders/{id}", order.getId()).with(otherCustomer))
                .andExpect(status().isNotFound());
    }

    @Test
    void uploadedPrescriptionDocumentIsOrderLinkedAndAdminOnly() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User user = createUser(suffix);
        Address address = createAddress(user);
        Product product = createProduct("UPLOADED-" + suffix);
        ProductVariant variant = createVariant(product, "UPLOADED-" + suffix, "0.00");
        LensOption type = createLensOption("SINGLE_VISION", "TYPE", "0.00");
        type.setName("Single Vision");
        type.setPreparationDays(4);
        lensOptions.save(type);

        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(product);
        prescription.setPatientName("Uploaded Customer");
        prescription.setRightSph(new BigDecimal("1.00"));
        prescription.setRightCyl(BigDecimal.ZERO);
        prescription.setLeftSph(new BigDecimal("1.25"));
        prescription.setLeftCyl(BigDecimal.ZERO);
        prescription.setPd(new BigDecimal("62.00"));
        prescription.setSource("UPLOAD");
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION");
        prescription = prescriptions.save(prescription);

        byte[] pdf = "%PDF-1.4\nDream Spex test prescription\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII);
        var customer = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .multipart("/api/v1/prescriptions/{id}/files", prescription.getId())
                        .file(new MockMultipartFile("file", "original-prescription.pdf",
                                "application/pdf", pdf))
                        .with(customer))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.originalName").value("original-prescription.pdf"));
        PrescriptionFile file = prescriptionFiles.findByPrescriptionId(prescription.getId()).stream()
                .findFirst().orElseThrow();
        storedFiles.add(file.getStorageKey());

        Cart cart = new Cart();
        cart.setUser(user);
        cart = carts.save(cart);
        cart.getItems().add(cartItems.save(cartItem(cart, variant, prescription, "SINGLE_VISION", "0.00", "800.00")));
        mockMvc.perform(post("/api/v1/orders")
                        .with(authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER")))))
                        .header("Idempotency-Key", "order-" + suffix)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"addressId":"%s","couponCode":null}
                                """.formatted(address.getId())))
                .andExpect(status().isCreated());

        Order order = orders.findByUserIdAndIdempotencyKey(user.getId(), "order-" + suffix).orElseThrow();
        OrderItem item = orderItems.findAll().stream()
                .filter(row -> row.getOrder().getId().equals(order.getId()) && row.getPrescription() != null)
                .findFirst().orElseThrow();
        assertEquals(order.getId(), prescriptions.findById(prescription.getId()).orElseThrow().getOrder().getId());
        var admin = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
        mockMvc.perform(get("/api/v1/admin/orders/{id}", order.getId()).with(admin))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.items[0].prescription.source").value("UPLOAD"))
                .andExpect(jsonPath("$.items[0].prescription.files[0].originalName").value("original-prescription.pdf"));
        mockMvc.perform(get("/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-files/{fileId}",
                        order.getId(), item.getId(), file.getId()).with(admin))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_PDF))
                .andExpect(content().bytes(pdf));
        MvcResult downloadResult = mockMvc.perform(get(
                        "/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-files/{fileId}",
                        order.getId(), item.getId(), file.getId()).param("download", "true").with(admin))
                .andExpect(status().isOk())
                .andReturn();
        assertTrue(downloadResult.getResponse().getHeader("Content-Disposition").startsWith("attachment"));
        mockMvc.perform(get("/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-files/{fileId}",
                        order.getId(), "unrelated-item", file.getId()).with(admin))
                .andExpect(status().isNotFound());
        var franchise = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_FRANCHISE"))));
        mockMvc.perform(get("/api/v1/admin/orders/{id}", order.getId()).with(franchise))
                .andExpect(status().isForbidden());
        mockMvc.perform(get("/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-files/{fileId}",
                        order.getId(), item.getId(), file.getId()).with(franchise))
                .andExpect(status().isForbidden());
        var customerAccess = authentication(new UsernamePasswordAuthenticationToken(user.getId(), null,
                List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))));
        mockMvc.perform(get("/api/v1/admin/orders/{orderId}/items/{itemId}/prescription-files/{fileId}",
                        order.getId(), item.getId(), file.getId()).with(customerAccess))
                .andExpect(status().isForbidden());
    }

    private User createUser(String suffix) {
        User user = new User();
        user.setEmail("order-" + suffix + "@example.com");
        user.setPasswordHash("test-password-hash");
        user.setDisplayName("Order Test");
        user.setStatus("ACTIVE");
        return users.save(user);
    }

    private Address createAddress(User user) {
        if (stores.findByStatusOrderByNameAsc("ACTIVE").isEmpty()) {
            Store store = new Store();
            store.setName("Test fulfilment store");
            store.setAddress("1 Test Street");
            store.setCity("Hyderabad");
            store.setState("Telangana");
            store.setPostalCode("500001");
            store.setLatitude(new BigDecimal("17.3850000"));
            store.setLongitude(new BigDecimal("78.4867000"));
            store.setDeliveryRadiusKm(new BigDecimal("100.00"));
            stores.save(store);
        }
        Address address = new Address();
        address.setUser(user);
        address.setRecipientName("Order Test");
        address.setPhone("9876543210");
        address.setLine1("1 Test Street");
        address.setCity("Hyderabad");
        address.setState("Telangana");
        address.setPostalCode("500001");
        address.setCountryCode("IN");
        address.setLatitude(new BigDecimal("17.3850000"));
        address.setLongitude(new BigDecimal("78.4867000"));
        return addresses.save(address);
    }

    private Product createProduct(String suffix) {
        Product product = new Product();
        product.setSku("SKU-" + suffix);
        product.setName("Test frame " + suffix);
        product.setSlug("frame-" + suffix.toLowerCase());
        product.setBrand("Dream Spex");
        product.setDescription("Integration test frame");
        product.setBasePrice(new BigDecimal("800.00"));
        product.setStatus("PUBLISHED");
        return products.save(product);
    }

    private ProductVariant createVariant(Product product, String suffix, String additionalPrice) {
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku("VAR-" + suffix);
        variant.setAdditionalPrice(new BigDecimal(additionalPrice));
        variant.setQuantity(5);
        variant.setReservedQuantity(0);
        variant.setStatus("ACTIVE");
        return variants.save(variant);
    }

    private LensOption createLensOption(String code, String category, String price) {
        LensOption option = new LensOption();
        option.setCode(code);
        option.setName(code);
        option.setCategory(category);
        option.setBenefits("Integration test option");
        option.setAdditionalCost(new BigDecimal(price));
        option.setAvailable(true);
        return option;
    }

    private CartItem cartItem(Cart cart, ProductVariant variant, Prescription prescription, String codes,
                              String lensPrice, String price) {
        CartItem item = new CartItem();
        item.setCart(cart);
        item.setVariant(variant);
        item.setPrescription(prescription);
        item.setSelectedLensCodes(codes);
        item.setLensAdditionalPrice(new BigDecimal(lensPrice));
        item.setUnitPriceSnapshot(new BigDecimal(price));
        item.setQuantity(1);
        return item;
    }
}
