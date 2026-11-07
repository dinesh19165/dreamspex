package com.dreamspex.returns;


import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductRepository;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderStatusHistory;
import com.dreamspex.payment.Payment;
import com.dreamspex.payment.PaymentRepository;
import com.dreamspex.payment.RazorpayGateway;
import com.dreamspex.prescription.PrescriptionStorage;
import com.dreamspex.returns.ReturnDtos.CreateRequest;
import com.dreamspex.returns.ReturnDtos.ProductEligibilityRequest;
import com.dreamspex.returns.ReturnDtos.RequestedItem;
import com.dreamspex.returns.ReturnDtos.StatusRequest;
import com.dreamspex.security.CurrentUser;
import jakarta.persistence.EntityManager;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.util.ReflectionTestUtils;

class ReturnServiceTest {
    private final CurrentUser current = mock(CurrentUser.class);
    private final OrderRepository orders = mock(OrderRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final ProductRepository products = mock(ProductRepository.class);
    private final ReturnPolicyRepository policies = mock(ReturnPolicyRepository.class);
    private final ReturnableProductRepository returnableProducts = mock(ReturnableProductRepository.class);
    private final ReturnRequestRepository requests = mock(ReturnRequestRepository.class);
    private final ReturnEvidenceRepository evidence = mock(ReturnEvidenceRepository.class);
    private final ReturnStatusHistoryRepository history = mock(ReturnStatusHistoryRepository.class);
    private final ReturnRefundTransactionRepository refunds = mock(ReturnRefundTransactionRepository.class);
    private final PrescriptionStorage storage = mock(PrescriptionStorage.class);
    private final RazorpayGateway gateway = mock(RazorpayGateway.class);
    private final ReturnRefundProcessor refundProcessor = mock(ReturnRefundProcessor.class);
    private final EntityManager entityManager = mock(EntityManager.class);
    private final ReturnRefundNotifications returnNotifications = mock(ReturnRefundNotifications.class);

    private final UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken("customer", null);
    private final User customer = new User();
    private final User admin = new User();
    private final Product product = new Product();
    private final Order order = new Order();
    private final OrderItem orderItem = new OrderItem();
    private Payment payment;
    private ReturnPolicy policy;
    private ReturnService service;

    @BeforeEach
    void setUp() {
        when(current.require(authentication)).thenReturn(customer);
        product.setName("Eyewear");
        product.setSku("FRAME-1");
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        order.setUser(customer);
        order.setOrderNumber("DS-RETURN-1");
        order.setStatus("DELIVERED");
        order.setPaymentStatus("PAID");
        order.setSubtotal(new BigDecimal("200.00"));
        order.setDiscountAmount(new BigDecimal("20.00"));
        order.setTotalAmount(new BigDecimal("180.00"));
        orderItem.setOrder(order);
        orderItem.setVariant(variant);
        orderItem.setProductNameSnapshot("Eyewear");
        orderItem.setSkuSnapshot("FRAME-1");
        orderItem.setUnitPrice(new BigDecimal("100.00"));
        orderItem.setLineTotal(new BigDecimal("200.00"));
        orderItem.setQuantity(2);
        order.getItems().add(orderItem);
        OrderStatusHistory delivered = new OrderStatusHistory();
        delivered.setOrder(order);
        delivered.setStatus("DELIVERED");
        order.getHistory().add(delivered);
        policy = new ReturnPolicy();
        policy.setEnabled(true);
        policy.setReturnWindowDays(30);
        when(policies.findById("default")).thenReturn(Optional.of(policy));
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(requests.findByOrderId(order.getId())).thenReturn(List.of());
        when(returnableProducts.findByProductIdAndEnabledTrue(product.getId()))
                .thenReturn(Optional.of(new ReturnableProduct(product.getId())));
        payment = new Payment();
        payment.setOrder(order);
        payment.setProvider("RAZORPAY_TEST");
        payment.setProviderPaymentId("pay_captured");
        payment.setAmount(new BigDecimal("180.00"));
        payment.setStatus("CAPTURED");
        when(payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), "CAPTURED"))
                .thenReturn(Optional.of(payment));
        when(evidence.findByReturnRequestIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        when(refunds.findByReturnRequestIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        when(history.findByReturnRequestIdOrderByCreatedAtAsc(any())).thenReturn(List.of());
        service = new ReturnService(current, orders, payments, products, policies, returnableProducts, requests,
                evidence, history, refunds, storage, gateway, refundProcessor, entityManager, returnNotifications);
    }

    @Test
    void createsPartialRefundUsingProportionalOrderDiscount() {
        var response = service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DAMAGED", "Frame was damaged.", List.of(new RequestedItem(orderItem.getId(), 1))));

        assertEquals("REQUESTED", response.status());
        assertEquals(new BigDecimal("90.00"), response.refundAmount());
        assertEquals(1, response.items().get(0).quantity());
        assertEquals(new BigDecimal("90.00"), response.items().get(0).refundAmount());
    }

    @Test
    void onlyLatestBackendConfirmedFailedRefundIsMarkedRetryable() {
        ReturnRequest request = new ReturnRequest();
        request.setOrder(order);
        request.setUser(customer);
        request.setResolution("REFUND");
        request.setStatus("REFUND_PROCESSING");

        ReturnRefundTransaction failed = new ReturnRefundTransaction();
        failed.setReturnRequest(request);
        failed.setPayment(payment);
        failed.setStatus("FAILED");
        ReturnRefundTransaction pending = new ReturnRefundTransaction();
        pending.setReturnRequest(request);
        pending.setPayment(payment);
        pending.setStatus("PENDING");

        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
        when(refunds.findByReturnRequestIdOrderByCreatedAtAsc(request.getId())).thenReturn(List.of(failed, pending));
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId())).thenReturn(Optional.of(pending));

        var response = service.adminGet(request.getId());

        assertEquals(false, response.refunds().get(0).retryable());
        assertEquals(false, response.refunds().get(1).retryable());
    }

    @Test
    void latestFailedRefundIsMarkedRetryableByBackend() {
        ReturnRequest request = new ReturnRequest();
        request.setOrder(order);
        request.setUser(customer);
        request.setResolution("REFUND");
        request.setStatus("REFUND_PROCESSING");

        ReturnRefundTransaction failed = new ReturnRefundTransaction();
        failed.setReturnRequest(request);
        failed.setPayment(payment);
        failed.setStatus("FAILED");

        when(requests.findById(request.getId())).thenReturn(Optional.of(request));
        when(refunds.findByReturnRequestIdOrderByCreatedAtAsc(request.getId())).thenReturn(List.of(failed));
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId())).thenReturn(Optional.of(failed));

        var response = service.adminGet(request.getId());

        assertEquals(true, response.refunds().get(0).retryable());
    }

    @Test
    void fullQuantityRefundUsesExactDiscountedLineAmount() {
        var response = service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DEFECTIVE", null, List.of(new RequestedItem(orderItem.getId(), 2))));

        assertEquals(new BigDecimal("180.00"), response.refundAmount());
    }

    @Test
    void customerEligibilityReturnsAllRemainingUnitsWhenProductIsEnabled() {
        when(orders.findByIdAndUserId(order.getId(), customer.getId())).thenReturn(Optional.of(order));

        var response = service.eligibility(authentication, order.getId());

        assertEquals(true, response.eligible());
        assertEquals(true, response.items().get(0).returnable());
        assertEquals(2, response.items().get(0).availableQuantity());
    }

    @Test
    void customerEligibilityShowsZeroUnitsWhenProductIsNotEnabled() {
        when(orders.findByIdAndUserId(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(returnableProducts.findByProductIdAndEnabledTrue(product.getId())).thenReturn(Optional.empty());

        var response = service.eligibility(authentication, order.getId());

        assertEquals(false, response.items().get(0).returnable());
        assertEquals(0, response.items().get(0).availableQuantity());
    }

    @Test
    void eligibilityKeepsOnlyGenuinelyUnreservedPartialQuantitiesAcrossReturnStatuses() {
        for (String status : List.of("REQUESTED", "REFUND_PROCESSING", "REFUNDED", "REPLACED")) {
            ReturnRequest existing = requestForItem(status, 1);
            when(requests.findByOrderId(order.getId())).thenReturn(List.of(existing));
            when(orders.findByIdAndUserId(order.getId(), customer.getId())).thenReturn(Optional.of(order));

            var response = service.eligibility(authentication, order.getId());

            assertEquals(1, response.items().get(0).availableQuantity(), status);
        }
    }

    @Test
    void expiredReturnWindowMakesBackendEligibilityAndRemainingQuantityUnavailable() {
        OrderStatusHistory delivered = order.getHistory().get(0);
        ReflectionTestUtils.setField(delivered, "createdAt", Instant.now().minusSeconds(31L * 86400));
        when(orders.findByIdAndUserId(order.getId(), customer.getId())).thenReturn(Optional.of(order));

        var response = service.eligibility(authentication, order.getId());

        assertEquals(false, response.eligible());
        assertEquals(0, response.items().get(0).availableQuantity());
        assertEquals("The configured return window has expired.", response.ineligibleReason());
    }

    @Test
    void partialRefundLeavesOnlyRemainingQuantityRequestable() {
        ReturnRequest refunded = requestForItem("REFUNDED", 1);
        refunded.setRefundAmount(new BigDecimal("90.00"));
        when(requests.findByOrderId(order.getId())).thenReturn(List.of(refunded));
        when(orders.findByIdAndUserId(order.getId(), customer.getId())).thenReturn(Optional.of(order));
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.of(order));

        var eligibility = service.eligibility(authentication, order.getId());
        var response = service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DAMAGED", null, List.of(new RequestedItem(orderItem.getId(), 1))));

        assertEquals(1, eligibility.items().get(0).availableQuantity());
        assertEquals(new BigDecimal("90.00"), response.refundAmount());
    }

    @Test
    void adminCanEnableReturnsForAnExistingProduct() {
        when(products.findById(product.getId())).thenReturn(Optional.of(product));
        when(returnableProducts.findById(product.getId())).thenReturn(Optional.empty());
        when(returnableProducts.save(any(ReturnableProduct.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));

        var response = service.setProductEligibility(admin, product.getId(), new ProductEligibilityRequest(true));

        assertEquals(product.getId(), response.productId());
        assertEquals(true, response.returnable());
        verify(returnableProducts).save(org.mockito.ArgumentMatchers.argThat(ReturnableProduct::isEnabled));
    }

    @Test
    void preventsRequestingQuantityAlreadyReservedByAnotherReturn() {
        ReturnRequest active = new ReturnRequest();
        active.setStatus("REQUESTED");
        ReturnRequestItem reserved = new ReturnRequestItem();
        reserved.setReturnRequest(active);
        reserved.setOrderItem(orderItem);
        reserved.setQuantity(1);
        active.getItems().add(reserved);
        when(requests.findByOrderId(order.getId())).thenReturn(List.of(active));

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DAMAGED", null, List.of(new RequestedItem(orderItem.getId(), 2)))));

        assertEquals("RETURN_QUANTITY_EXCEEDED", error.code());
    }

    @Test
    void rejectsOrderNotOwnedByCustomer() {
        when(orders.findByIdAndUserIdForUpdate(order.getId(), customer.getId())).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DAMAGED", null, List.of(new RequestedItem(orderItem.getId(), 1)))));

        assertEquals("ORDER_NOT_FOUND", error.code());
        verify(requests, never()).save(any(ReturnRequest.class));
    }

    @Test
    void refusesRequestsUntilReturnPolicyIsConfigured() {
        policy.setEnabled(false);

        ApiException error = assertThrows(ApiException.class, () -> service.create(authentication, order.getId(),
                new CreateRequest("REFUND", "DAMAGED", null, List.of(new RequestedItem(orderItem.getId(), 1)))));

        assertEquals("RETURN_NOT_ELIGIBLE", error.code());
    }

    @Test
    void rejectsCancellingAfterApproval() {
        ReturnRequest request = requestWithStatus("APPROVED");
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        ApiException error = assertThrows(ApiException.class, () -> service.cancel(authentication, request.getId()));

        assertEquals("RETURN_NOT_CANCELLABLE", error.code());
    }

    @Test
    void adminCanRejectRequestAndKeepRemarksPrivate() {
        ReturnRequest request = requestWithStatus("REQUESTED");
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        var response = service.updateStatus(admin, request.getId(),
                new StatusRequest("REJECTED", "Inspection found the item ineligible."));

        assertEquals("REJECTED", response.status());
        assertEquals("Inspection found the item ineligible.", response.adminRemarks());
        verify(entityManager).persist(any(ReturnStatusHistory.class));
    }

    @Test
    void refundRequestsCannotBeMovedIntoReplacementProcessing() {
        ReturnRequest request = requestWithStatus("QUALITY_CHECK");
        request.setResolution("REFUND");
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        ApiException error = assertThrows(ApiException.class, () -> service.updateStatus(admin, request.getId(),
                new StatusRequest("REPLACEMENT_PROCESSING", null)));

        assertEquals("RETURN_RESOLUTION_MISMATCH", error.code());
    }

    @Test
    void replacementMovesThroughPickupQualityAndCompletionStates() {
        ReturnRequest request = requestWithStatus("REQUESTED");
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));

        for (String status : List.of("APPROVED", "PICKUP_SCHEDULED", "PICKED_UP", "RECEIVED",
                "QUALITY_CHECK", "REPLACEMENT_PROCESSING", "REPLACED")) {
            var response = service.updateStatus(admin, request.getId(), new StatusRequest(status, "Reviewed"));
            assertEquals(status, response.status());
        }
    }

    private ReturnRequest requestWithStatus(String status) {
        ReturnRequest request = new ReturnRequest();
        request.setOrder(order);
        request.setUser(customer);
        request.setRequestNumber("DSR-TEST");
        request.setResolution("REPLACEMENT");
        request.setReasonCode("OTHER");
        request.setStatus(status);
        request.setRefundAmount(BigDecimal.ZERO);
        request.setUpdatedAt(Instant.now());
        return request;
    }

    private ReturnRequest requestForItem(String status, int quantity) {
        ReturnRequest request = new ReturnRequest();
        request.setOrder(order);
        request.setUser(customer);
        request.setResolution("REFUND");
        request.setStatus(status);
        ReturnRequestItem item = new ReturnRequestItem();
        item.setReturnRequest(request);
        item.setOrderItem(orderItem);
        item.setQuantity(quantity);
        request.getItems().add(item);
        return request;
    }
}
