package com.dreamspex.payment;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderStatusHistory;
import com.dreamspex.returns.ReturnRefundProcessor;
import com.dreamspex.loyalty.LoyaltyService;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.order.OrderDtos.*;

@Service
public class PaymentService {
    @Autowired private LoyaltyService loyaltyService;
    private static final Set<String> REFUND_WEBHOOK_EVENTS =
            Set.of("refund.created", "refund.processed", "refund.failed");
    private static final Set<String> REFUND_STATUSES = Set.of("created", "pending", "processed", "failed");

    private final CurrentUser current;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final PaymentWebhookEventRepository events;
    private final PaymentProperties properties;
    private final ObjectMapper mapper;
    private final NotificationService notifications;
    private final RazorpayGateway razorpay;
    private final ReturnRefundProcessor returnRefundProcessor;

    public PaymentService(CurrentUser current, OrderRepository orders, PaymentRepository payments,
                          PaymentWebhookEventRepository events, PaymentProperties properties, ObjectMapper mapper,
                          NotificationService notifications, RazorpayGateway razorpay,
                          ReturnRefundProcessor returnRefundProcessor) {
        this.current = current;
        this.orders = orders;
        this.payments = payments;
        this.events = events;
        this.properties = properties;
        this.mapper = mapper;
        this.notifications = notifications;
        this.razorpay = razorpay;
        this.returnRefundProcessor = returnRefundProcessor;
    }

    @Transactional
    public PaymentOrderResponse create(org.springframework.security.core.Authentication auth, String orderId) {
        User user = current.require(auth);
        Order order = orders.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ORDER_NOT_FOUND", "Order was not found."));
        if (!"PENDING_PAYMENT".equals(order.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_NOT_ALLOWED",
                    "Payment cannot be created for this order.");
        }
        Payment payment = payments.findByProviderAndOrderId(properties.provider(), order.getId()).orElseGet(() -> {
            Payment created = new Payment();
            created.setOrder(order);
            created.setProvider(properties.provider());
            created.setAmount(order.getTotalAmount());
            created.setProviderOrderId(razorpay.createOrder(
                    order.getOrderNumber(), created.getAmount(), created.getCurrency()));
            return payments.save(created);
        });
        requireOrderAmount(payment);
        return new PaymentOrderResponse(paymentResponse(payment), properties.keyId());
    }

    @Transactional
    public PaymentResponse verify(org.springframework.security.core.Authentication auth, String orderId,
                                  PaymentVerificationRequest request) {
        User user = current.require(auth);
        Payment payment = payments.findByProviderAndProviderOrderId(properties.provider(), request.providerOrderId())
                .filter(value -> value.getOrder().getId().equals(orderId)
                        && value.getOrder().getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment was not found."));
        requireOrderAmount(payment);
        if ("CAPTURED".equals(payment.getStatus())) {
            if (!request.providerPaymentId().equals(payment.getProviderPaymentId())) {
                throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_VERIFIED",
                        "Payment has already been verified.");
            }
            markOrderPaid(payment.getOrder(), user);
            return paymentResponse(payment);
        }
        if (properties.keySecret() == null || properties.keySecret().isBlank()) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "PAYMENT_NOT_CONFIGURED",
                    "Razorpay credentials are not configured.");
        }
        if (!constantTime(request.signature(),
                sign(request.providerOrderId() + "|" + request.providerPaymentId(), properties.keySecret()))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PAYMENT_SIGNATURE",
                    "Payment signature is invalid.");
        }
        if (payments.findByProviderAndProviderPaymentId(properties.provider(), request.providerPaymentId())
                .filter(existing -> !existing.getId().equals(payment.getId())).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_ALREADY_USED", "Payment has already been used.");
        }
        RazorpayGateway.RazorpayPayment remote = razorpay.fetchPayment(request.providerPaymentId());
        if (!request.providerOrderId().equals(remote.orderId())
                || remote.amount() != payment.getAmount().movePointRight(2).longValueExact()
                || !"INR".equalsIgnoreCase(remote.currency()) || !"captured".equalsIgnoreCase(remote.status())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_MISMATCH",
                    "Payment details do not match the order.");
        }
        payment.setProviderPaymentId(request.providerPaymentId());
        payment.setSignatureVerified(true);
        payment.setStatus("CAPTURED");
        markOrderPaid(payment.getOrder(), user);
        notifications.create(payment.getOrder().getUser(), "PAYMENT_CAPTURED", "Payment confirmed",
                "Payment for order " + payment.getOrder().getOrderNumber() + " was confirmed.");
        return paymentResponse(payments.save(payment));
    }

    @Transactional
    public PaymentResponse failed(org.springframework.security.core.Authentication auth, String orderId,
                                  PaymentFailureRequest request) {
        User user = current.require(auth);
        Payment payment = payments.findByProviderAndProviderOrderId(properties.provider(), request.providerOrderId())
                .filter(value -> value.getOrder().getId().equals(orderId)
                        && value.getOrder().getUser().getId().equals(user.getId()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment was not found."));
        if (!"CAPTURED".equals(payment.getStatus())) {
            payment.setStatus("FAILED");
            payment.getOrder().setPaymentStatus("FAILED");
            Order order = payment.getOrder();
            if (loyaltyService != null && order.getLoyaltyPointsRedeemed() > 0) {
                loyaltyService.restoreRedemption(order,
                        "ORDER:" + order.getId() + ":PAYMENT_FAILED_REDEMPTION_REVERSAL",
                        order.getTotalAmount());
                order.setTotalAmount(order.getTotalAmount().add(order.getLoyaltyDiscountAmount()));
                order.setLoyaltyDiscountAmount(BigDecimal.ZERO);
                order.setLoyaltyPointsRedeemed(0);
            }
            if (request.providerPaymentId() != null && !request.providerPaymentId().isBlank()) {
                payment.setProviderPaymentId(request.providerPaymentId());
            }
            return paymentResponse(payments.save(payment));
        }
        return paymentResponse(payment);
    }

    @Transactional(readOnly = true)
    public PaymentResponse get(org.springframework.security.core.Authentication auth, String id) {
        return paymentResponse(payments.findByIdAndOrderUserId(id, current.require(auth).getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND", "Payment was not found.")));
    }

    @Transactional(readOnly = true)
    public java.util.List<PaymentResponse> adminList() {
        return payments.findAllByOrderByCreatedAtDesc().stream().map(this::paymentResponse).toList();
    }

    @Transactional
    public PaymentResponse webhook(String signature, String eventId, String payload) {
        if (properties.webhookSecret() == null || properties.webhookSecret().isBlank()
                || !constantTime(signature, sign(payload, properties.webhookSecret()))) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_PAYMENT_SIGNATURE",
                    "Payment signature is invalid.");
        }
        if (eventId == null || eventId.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "WEBHOOK_EVENT_REQUIRED", "Webhook event id is required.");
        }
        if (events.existsByProviderAndEventId(properties.provider(), eventId)) {
            return webhookResponse("DUPLICATE");
        }
        try {
            JsonNode root = mapper.readTree(payload);
            String event = root.path("event").asText();
            if (event.startsWith("refund.")) {
                if (!REFUND_WEBHOOK_EVENTS.contains(event)) {
                    saveWebhookEvent(eventId, payload);
                    return webhookResponse("REFUND_EVENT_IGNORED");
                }
                processRefundWebhook(root);
                saveWebhookEvent(eventId, payload);
                return webhookResponse("REFUND_EVENT");
            }

            JsonNode entity = root.path("payload").path("payment").path("entity");
            String providerOrder = entity.path("order_id").asText();
            String providerPayment = entity.path("id").asText();
            Payment payment = payments.findByProviderAndProviderOrderId(properties.provider(), providerOrder)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "PAYMENT_NOT_FOUND",
                            "Payment was not found."));
            if (entity.path("amount").asLong() != payment.getAmount().movePointRight(2).longValueExact()
                    || !"INR".equalsIgnoreCase(entity.path("currency").asText())) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "PAYMENT_MISMATCH",
                        "Payment details do not match the order.");
            }
            payment.setProviderPaymentId(providerPayment);
            payment.setSignatureVerified(true);
            payment.setStatus(event.contains("captured") || event.contains("paid") ? "CAPTURED"
                    : event.contains("failed") ? "FAILED" : payment.getStatus());
            if ("CAPTURED".equals(payment.getStatus())) {
                markOrderPaid(payment.getOrder(), payment.getOrder().getUser());
                notifications.create(payment.getOrder().getUser(), "PAYMENT_CAPTURED", "Payment confirmed",
                        "Payment for order " + payment.getOrder().getOrderNumber() + " was confirmed.");
            } else if ("FAILED".equals(payment.getStatus())) {
                payment.getOrder().setPaymentStatus("FAILED");
            }
            saveWebhookEvent(eventId, payload);
            return paymentResponse(payments.save(payment));
        } catch (java.io.IOException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK", "Payment webhook payload is invalid.");
        }
    }

    private void processRefundWebhook(JsonNode root) {
        JsonNode entity = root.path("payload").path("refund").path("entity");
        String refundId = requiredField(entity, "id");
        String paymentId = requiredField(entity, "payment_id");
        String status = requiredField(entity, "status").toLowerCase(java.util.Locale.ROOT);
        String currency = requiredField(entity, "currency");
        String amountValue = requiredField(entity, "amount");
        if (!REFUND_STATUSES.contains(status)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_REFUND_STATUS",
                    "Refund webhook contains an unsupported refund status.");
        }
        long amount;
        try {
            amount = Long.parseLong(amountValue);
        } catch (NumberFormatException exception) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK",
                    "Refund webhook amount is invalid.", exception);
        }
        String receipt = entity.path("receipt").asText(null);
        if (receipt != null && receipt.isBlank()) receipt = null;
        long createdAtSeconds = entity.path("created_at").asLong(0);
        Instant createdAt = createdAtSeconds > 0 ? Instant.ofEpochSecond(createdAtSeconds) : null;
        returnRefundProcessor.handleGatewayEvent(properties.provider(), refundId, paymentId, amount,
                currency, status, receipt, createdAt);
    }

    private String requiredField(JsonNode entity, String field) {
        String value = entity.path(field).asText(null);
        if (value == null || value.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_WEBHOOK",
                    "Refund webhook is missing a required field.");
        }
        return value;
    }

    private void saveWebhookEvent(String eventId, String payload) {
        PaymentWebhookEvent record = new PaymentWebhookEvent();
        record.setProvider(properties.provider());
        record.setEventId(eventId);
        record.setPayloadHash(hash(payload));
        events.save(record);
    }

    private PaymentResponse webhookResponse(String status) {
        return new PaymentResponse("", "", "", status, BigDecimal.ZERO, "INR", true);
    }

    private void markOrderPaid(Order order, User changedBy) {
        order.setPaymentStatus("PAID");
        order.setStatus("PAID");
        if (order.getHistory().stream().noneMatch(history -> "PAID".equals(history.getStatus()))) {
            OrderStatusHistory history = new OrderStatusHistory();
            history.setOrder(order);
            history.setStatus("PAID");
            history.setNote("Payment confirmed");
            history.setChangedBy(changedBy);
            order.getHistory().add(history);
        }
    }

    private void requireOrderAmount(Payment payment) {
        if (payment.getAmount() == null || payment.getOrder().getTotalAmount() == null
                || payment.getAmount().compareTo(payment.getOrder().getTotalAmount()) != 0) {
            throw new ApiException(HttpStatus.CONFLICT, "PAYMENT_AMOUNT_MISMATCH",
                    "Payment amount does not match the saved order total.");
        }
    }

    private PaymentResponse paymentResponse(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getProvider(), payment.getProviderOrderId(),
                payment.getStatus(), payment.getAmount(), payment.getCurrency(), payment.isSignatureVerified());
    }

    private String sign(String value, String secret) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Payment signing unavailable", exception);
        }
    }

    private boolean constantTime(String actual, String expected) {
        return actual != null && MessageDigest.isEqual(actual.getBytes(StandardCharsets.UTF_8),
                expected.getBytes(StandardCharsets.UTF_8));
    }

    private String hash(String value) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Webhook hashing unavailable", exception);
        }
    }
}
