package com.dreamspex.payment;


import com.dreamspex.auth.entity.User;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderDtos.PaymentFailureRequest;
import com.dreamspex.order.OrderDtos.PaymentResponse;
import com.dreamspex.order.OrderDtos.PaymentVerificationRequest;import com.dreamspex.security.CurrentUser;
import com.dreamspex.returns.ReturnRefundProcessor;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import com.dreamspex.common.ApiException;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.HexFormat;
import org.json.JSONObject;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {
    @Mock CurrentUser current;
    @Mock OrderRepository orders;
    @Mock PaymentRepository payments;
    @Mock PaymentWebhookEventRepository events;
    @Mock NotificationService notifications;
    @Mock RazorpayGateway razorpay;
    @Mock ReturnRefundProcessor returnRefundProcessor;

    @Test
    void razorpayOrderUsesTheSavedOrderPayableAmount() {
        User user = new User();
        Order order = order(user);
        when(current.require(any())).thenReturn(user);
        when(orders.findByIdAndUserId("order-id", user.getId())).thenReturn(Optional.of(order));
        when(payments.findByProviderAndOrderId("RAZORPAY_TEST", order.getId())).thenReturn(Optional.empty());
        when(razorpay.createOrder("DS-1", order.getTotalAmount(), "INR")).thenReturn("provider-order");
        when(payments.save(any(Payment.class))).thenAnswer(invocation -> invocation.getArgument(0));

        var response = service().create(auth(), "order-id");

        assertEquals(order.getTotalAmount(), response.payment().amount());
        verify(razorpay).createOrder("DS-1", order.getTotalAmount(), "INR");
    }

    @Test
    void existingPaymentMustMatchTheSavedOrderTotal() {
        User user = new User();
        Order order = order(user);
        Payment payment = payment(order);
        payment.setAmount(new java.math.BigDecimal("10.98"));
        when(current.require(any())).thenReturn(user);
        when(orders.findByIdAndUserId("order-id", user.getId())).thenReturn(Optional.of(order));
        when(payments.findByProviderAndOrderId("RAZORPAY_TEST", order.getId())).thenReturn(Optional.of(payment));

        ApiException error = assertThrows(ApiException.class, () -> service().create(auth(), "order-id"));

        assertEquals("PAYMENT_AMOUNT_MISMATCH", error.code());
        verifyNoInteractions(razorpay);
    }

    @Test
    void invalidWebhookSignatureIsRejected() {
        PaymentService service = new PaymentService(current, orders, payments, events,
                new PaymentProperties("RAZORPAY_TEST", "key", "secret", "webhook-secret"),
                new ObjectMapper(), notifications, razorpay, returnRefundProcessor);

        ApiException error = assertThrows(ApiException.class,
                () -> service.webhook("wrong", "event-1", "{}"));

        assertEquals("INVALID_PAYMENT_SIGNATURE", error.code());
    }

    @Test
    void duplicateWebhookCallbackDoesNotProcessPaymentAgain() throws Exception {
        String payload = "{\"event\":\"payment.captured\"}";
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-1")).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"), "event-1", payload);

        assertEquals("DUPLICATE", response.status());
        verifyNoInteractions(payments, notifications, razorpay);
    }

    @Test
    void verifiedProcessedRefundWebhookUpdatesMatchingPartialRefund() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{
                  "id":"rfnd_1","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"processed","receipt":"ret_partial","created_at":1793790000
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-1")).thenReturn(false);
        when(events.save(any(PaymentWebhookEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRefundProcessor.handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_1"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("processed"), eq("ret_partial"), any())).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-1", payload);

        assertEquals("REFUND_EVENT", response.status());
        verify(returnRefundProcessor).handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_1"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("processed"), eq("ret_partial"), any());
    }

    @Test
    void duplicateRefundWebhookIsIgnoredAfterSignatureVerification() throws Exception {
        String payload = """
                {"event":"refund.failed","payload":{"refund":{"entity":{
                  "id":"rfnd_1","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"failed","receipt":"ret_partial"
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-duplicate")).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-duplicate", payload);

        assertEquals("DUPLICATE", response.status());
        verifyNoInteractions(returnRefundProcessor);
    }

    @Test
    void verifiedFailedRefundWebhookIsForwardedForFailureHandling() throws Exception {
        String payload = """
                {"event":"refund.failed","payload":{"refund":{"entity":{
                  "id":"rfnd_failed","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"failed","receipt":"ret_partial","created_at":1793790000
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-failed")).thenReturn(false);
        when(events.save(any(PaymentWebhookEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRefundProcessor.handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_failed"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("failed"), eq("ret_partial"), any())).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-failed", payload);

        assertEquals("REFUND_EVENT", response.status());
        verify(returnRefundProcessor).handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_failed"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("failed"), eq("ret_partial"), any());
    }

    @Test
    void delayedRefundEventUsesVerifiedEntityStatusForReconciliation() throws Exception {
        String payload = """
                {"event":"refund.created","payload":{"refund":{"entity":{
                  "id":"rfnd_delayed","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"processed","receipt":"ret_partial"
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-delayed")).thenReturn(false);
        when(events.save(any(PaymentWebhookEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRefundProcessor.handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_delayed"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("processed"), eq("ret_partial"), any())).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-delayed", payload);

        assertEquals("REFUND_EVENT", response.status());
        verify(returnRefundProcessor).handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_delayed"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("processed"), eq("ret_partial"), any());
    }

    @Test
    void outOfOrderRefundEventUsesCurrentEntityStatus() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{
                  "id":"rfnd_pending","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"pending","receipt":"ret_partial"
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-out-of-order")).thenReturn(false);
        when(events.save(any(PaymentWebhookEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(returnRefundProcessor.handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_pending"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("pending"), eq("ret_partial"), any())).thenReturn(true);

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-out-of-order", payload);

        assertEquals("REFUND_EVENT", response.status());
        verify(returnRefundProcessor).handleGatewayEvent(eq("RAZORPAY_TEST"), eq("rfnd_pending"), eq("pay_1"),
                eq(4500L), eq("INR"), eq("pending"), eq("ret_partial"), any());
    }

    @Test
    void unknownRefundEventIsAcknowledgedAndDeduplicatedWithoutReconciliation() throws Exception {
        String payload = "{\"event\":\"refund.updated\"}";
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-unknown")).thenReturn(false);
        when(events.save(any(PaymentWebhookEvent.class))).thenAnswer(invocation -> invocation.getArgument(0));

        PaymentResponse response = service().webhook(signature(payload, "webhook-secret"),
                "event-refund-unknown", payload);

        assertEquals("REFUND_EVENT_IGNORED", response.status());
        verify(events).save(any(PaymentWebhookEvent.class));
        verifyNoInteractions(returnRefundProcessor);
    }

    @Test
    void unsupportedRefundStatusIsRejectedWithoutRecordingOrReconciling() throws Exception {
        String payload = """
                {"event":"refund.processed","payload":{"refund":{"entity":{
                  "id":"rfnd_unknown","payment_id":"pay_1","amount":4500,"currency":"INR",
                  "status":"authorized","receipt":"ret_partial"
                }}}}
                """;
        when(events.existsByProviderAndEventId("RAZORPAY_TEST", "event-refund-invalid-status")).thenReturn(false);

        ApiException error = assertThrows(ApiException.class,
                () -> service().webhook(signature(payload, "webhook-secret"),
                        "event-refund-invalid-status", payload));

        assertEquals("INVALID_REFUND_STATUS", error.code());
        verify(events, never()).save(any(PaymentWebhookEvent.class));
        verifyNoInteractions(returnRefundProcessor);
    }

    @Test
    void refundWebhookRejectsInvalidSignature() {
        ApiException error = assertThrows(ApiException.class,
                () -> service().webhook("invalid", "event-refund-bad", "{\"event\":\"refund.processed\"}"));

        assertEquals("INVALID_PAYMENT_SIGNATURE", error.code());
        verifyNoInteractions(returnRefundProcessor);
    }

    @Test
    void successfulVerificationCapturesMatchingPayment() throws Exception {
        User user = new User();
        Order order = order(user);
        Payment payment = payment(order);
        when(current.require(any())).thenReturn(user);
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1")).thenReturn(Optional.of(payment));
        when(payments.findByProviderAndProviderPaymentId("RAZORPAY_TEST", "pay_1")).thenReturn(Optional.empty());
        when(razorpay.fetchPayment("pay_1")).thenReturn(new RazorpayGateway.RazorpayPayment("order_1", 1099, "INR", "captured"));
        when(payments.save(payment)).thenReturn(payment);

        PaymentResponse response = service().verify(auth(), order.getId(),
                new PaymentVerificationRequest("order_1", "pay_1", signature("order_1|pay_1")));

        assertEquals("CAPTURED", response.status());
        assertEquals("PAID", order.getStatus());
        assertEquals(1, order.getHistory().size());
        assertEquals("PAID", order.getHistory().get(0).getStatus());
        assertEquals("Payment confirmed", order.getHistory().get(0).getNote());
        verify(payments).save(payment);
    }

    @Test
    void invalidSignatureIsRejected() {
        Payment payment = payment(order(new User()));
        when(current.require(any())).thenReturn(payment.getOrder().getUser());
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1")).thenReturn(Optional.of(payment));

        ApiException error = assertThrows(ApiException.class, () -> service().verify(auth(), payment.getOrder().getId(),
                new PaymentVerificationRequest("order_1", "pay_1", "invalid")));

        assertEquals("INVALID_PAYMENT_SIGNATURE", error.code());
        verifyNoInteractions(razorpay);
    }

    @Test
    void amountMismatchIsRejected() {
        Payment payment = payment(order(new User()));
        when(current.require(any())).thenReturn(payment.getOrder().getUser());
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1")).thenReturn(Optional.of(payment));
        when(payments.findByProviderAndProviderPaymentId("RAZORPAY_TEST", "pay_1")).thenReturn(Optional.empty());
        when(razorpay.fetchPayment("pay_1")).thenReturn(new RazorpayGateway.RazorpayPayment("order_1", 1000, "INR", "captured"));

        ApiException error = assertThrows(ApiException.class, () -> service().verify(auth(), payment.getOrder().getId(),
                new PaymentVerificationRequest("order_1", "pay_1", signature("order_1|pay_1"))));

        assertEquals("PAYMENT_MISMATCH", error.code());
    }

    @Test
    void duplicateVerificationIsIdempotentForSamePayment() {
        Payment payment = payment(order(new User()));
        payment.setProviderPaymentId("pay_1");
        payment.setStatus("CAPTURED");
        when(current.require(any())).thenReturn(payment.getOrder().getUser());
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1")).thenReturn(Optional.of(payment));

        PaymentResponse response = service().verify(auth(), payment.getOrder().getId(),
                new PaymentVerificationRequest("order_1", "pay_1", "unused"));

        assertEquals("CAPTURED", response.status());
        verifyNoInteractions(razorpay);
    }

    @Test
    void failedPaymentUpdatesPaymentWithoutMarkingOrderPaid() {
        Payment payment = payment(order(new User()));
        when(current.require(any())).thenReturn(payment.getOrder().getUser());
        when(payments.findByProviderAndProviderOrderId("RAZORPAY_TEST", "order_1")).thenReturn(Optional.of(payment));
        when(payments.save(payment)).thenReturn(payment);

        PaymentResponse response = service().failed(auth(), payment.getOrder().getId(),
                new PaymentFailureRequest("order_1", "pay_1"));

        assertEquals("FAILED", response.status());
        assertEquals("FAILED", payment.getOrder().getPaymentStatus());
        verify(payments).save(payment);
    }

    @Test
    void razorpayStringFieldsAreReadWithoutCharArrayCast() {
        com.razorpay.Payment providerPayment = new com.razorpay.Payment(new JSONObject()
                .put("id", "pay_1")
                .put("order_id", "order_1")
                .put("amount", "1099")
                .put("currency", "INR")
                .put("status", "captured"));

        RazorpayGateway.RazorpayPayment result =
                RazorpayGateway.toRazorpayPayment("pay_1", providerPayment);

        assertEquals("order_1", result.orderId());
        assertEquals(1099L, result.amount());
        assertEquals("INR", result.currency());
        assertEquals("captured", result.status());
    }

    private PaymentService service() {
        return new PaymentService(current, orders, payments, events,
                new PaymentProperties("RAZORPAY_TEST", "key", "secret", "webhook-secret"),
                new ObjectMapper(), notifications, razorpay, returnRefundProcessor);
    }

    private UsernamePasswordAuthenticationToken auth() {
        return new UsernamePasswordAuthenticationToken("customer", null);
    }

    private Order order(User user) {
        Order order = new Order();
        order.setUser(user);
        order.setOrderNumber("DS-1");
        order.setTotalAmount(new java.math.BigDecimal("10.99"));
        return order;
    }

    private Payment payment(Order order) {
        Payment payment = new Payment();
        payment.setOrder(order);
        payment.setProvider("RAZORPAY_TEST");
        payment.setProviderOrderId("order_1");
        payment.setAmount(new java.math.BigDecimal("10.99"));
        return payment;
    }

    private String signature(String value) throws Exception {
        return signature(value, "secret");
    }

    private String signature(String value, String secret) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }
}
