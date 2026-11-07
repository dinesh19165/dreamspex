package com.dreamspex.returns;


import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderStatusHistory;
import com.dreamspex.payment.Payment;
import com.dreamspex.prescription.PrescriptionStorage;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class ReturnRequestPersistenceJpaIntegrationTest {
    @Autowired EntityManager entityManager;
    @Autowired ReturnService returnService;
    @Autowired ReturnRequestRepository returnRequests;
    @Autowired ReturnEvidenceRepository returnEvidence;
    @Autowired ReturnStatusHistoryRepository returnHistory;

    @MockBean PrescriptionStorage storage;

    @Test
    void persistsRequestItemsHistoryAndUploadedEvidenceAgainstManagedRequest() throws Exception {
        String suffix = UUID.randomUUID().toString();
        User customer = new User();
        customer.setEmail("return-" + suffix + "@example.com");
        customer.setPasswordHash("test-password-hash");
        customer.setDisplayName("Return Test Customer");
        customer.setStatus("ACTIVE");
        entityManager.persist(customer);

        Address address = new Address();
        address.setUser(customer);
        address.setRecipientName("Return Test Customer");
        address.setPhone("5550000000");
        address.setLine1("1 Test Road");
        address.setCity("Test City");
        address.setState("Test State");
        address.setPostalCode("000001");
        address.setCountryCode("IN");
        entityManager.persist(address);

        Product product = new Product();
        product.setSku("RETURN-" + suffix);
        product.setName("Return Test Frame");
        product.setSlug("return-test-" + suffix);
        product.setBrand("Dream Spex");
        product.setDescription("Integration test frame");
        product.setBasePrice(new BigDecimal("100.00"));
        product.setStatus("PUBLISHED");
        entityManager.persist(product);

        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setSku("RETURN-VARIANT-" + suffix);
        variant.setQuantity(2);
        variant.setReservedQuantity(0);
        variant.setStatus("ACTIVE");
        entityManager.persist(variant);

        Order order = new Order();
        order.setOrderNumber("DS-RETURN-" + suffix);
        order.setUser(customer);
        order.setAddressId(address.getId());
        order.setAddressSnapshot("{}");
        order.setIdempotencyKey("return-" + suffix);
        order.setStatus("DELIVERED");
        order.setPaymentStatus("PAID");
        order.setSubtotal(new BigDecimal("200.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setShippingAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("200.00"));

        OrderItem orderItem = new OrderItem();
        orderItem.setOrder(order);
        orderItem.setVariant(variant);
        orderItem.setProductNameSnapshot(product.getName());
        orderItem.setSkuSnapshot(variant.getSku());
        orderItem.setUnitPrice(new BigDecimal("100.00"));
        orderItem.setQuantity(2);
        orderItem.setLineTotal(new BigDecimal("200.00"));
        order.getItems().add(orderItem);

        OrderStatusHistory delivered = new OrderStatusHistory();
        delivered.setOrder(order);
        delivered.setStatus("DELIVERED");
        order.getHistory().add(delivered);
        entityManager.persist(order);

        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider("RAZORPAY_TEST");
        payment.setProviderPaymentId("pay_" + suffix);
        payment.setAmount(new BigDecimal("200.00"));
        payment.setStatus("CAPTURED");
        entityManager.persist(payment);

        ReturnPolicy policy = new ReturnPolicy();
        policy.setEnabled(true);
        policy.setReturnWindowDays(30);
        entityManager.persist(policy);
        entityManager.persist(new ReturnableProduct(product.getId()));
        entityManager.flush();

        byte[] image = new byte[] {(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10, 0, 0, 0, 0};
        when(storage.store(any())).thenReturn(new PrescriptionStorage.StoredFile(
                "return-evidence/" + suffix + ".png", "checksum", image.length));

        var authentication = new UsernamePasswordAuthenticationToken(customer.getId(), null, List.of());
        var created = returnService.create(authentication, order.getId(),
                new ReturnDtos.CreateRequest("REFUND", "DAMAGED", "Image attached",
                        List.of(new ReturnDtos.RequestedItem(orderItem.getId(), 1))));
        var uploaded = returnService.uploadEvidence(authentication, created.id(),
                new MockMultipartFile("file", "frame.png", "image/png", image));

        entityManager.flush();
        entityManager.clear();

        ReturnRequest persistedRequest = returnRequests.findById(created.id()).orElseThrow();
        ReturnRequestItem persistedItem = entityManager.createQuery(
                        "select item from ReturnRequestItem item where item.returnRequest.id = :requestId",
                        ReturnRequestItem.class)
                .setParameter("requestId", created.id())
                .getSingleResult();
        ReturnEvidence persistedEvidence = returnEvidence.findById(uploaded.id()).orElseThrow();
        ReturnStatusHistory persistedHistory = returnHistory
                .findByReturnRequestIdOrderByCreatedAtAsc(created.id()).get(0);

        assertEquals(persistedRequest.getId(), persistedItem.getReturnRequest().getId());
        assertEquals(orderItem.getId(), persistedItem.getOrderItem().getId());
        assertEquals(persistedRequest.getId(), persistedEvidence.getReturnRequest().getId());
        assertEquals(persistedRequest.getId(), persistedHistory.getReturnRequest().getId());
        assertNotNull(persistedRequest.getRequestNumber());
    }
}
