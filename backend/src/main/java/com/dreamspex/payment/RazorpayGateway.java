package com.dreamspex.payment;

import com.razorpay.Entity;
import com.razorpay.Order;
import com.razorpay.RazorpayClient;
import com.razorpay.RazorpayException;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Date;
import java.util.List;
import java.util.Optional;
import org.json.JSONObject;
import org.springframework.stereotype.Component;

@Component
public class RazorpayGateway {
    private final PaymentProperties properties;

    public RazorpayGateway(PaymentProperties properties) {
        this.properties = properties;
    }

    public String createOrder(String receipt, BigDecimal amount, String currency) {
        requireCredentials();
        try {
            RazorpayClient client = new RazorpayClient(properties.keyId(), properties.keySecret());
            JSONObject options = new JSONObject();
            options.put("amount", amount.movePointRight(2).longValueExact());
            options.put("currency", currency);
            options.put("receipt", receipt);
            Order order = client.orders.create(options);
            return stringField(order, "id");
        } catch (RazorpayException | ArithmeticException e) {
            throw new PaymentGatewayException("Unable to create Razorpay order.", e);
        }
    }

    public RazorpayPayment fetchPayment(String paymentId) {
        requireCredentials();
        if (paymentId == null || paymentId.isBlank()) {
            throw new PaymentGatewayException("Razorpay payment ID is required.");
        }
        try {
            RazorpayClient client = new RazorpayClient(properties.keyId(), properties.keySecret());
            com.razorpay.Payment payment = client.payments.fetch(paymentId);
            return toRazorpayPayment(paymentId, payment);
        } catch (RazorpayException | NumberFormatException e) {
            throw new PaymentGatewayException("Unable to verify Razorpay payment.", e);
        }
    }

    public RazorpayRefund createOrFindRefund(String paymentId, BigDecimal amount, String receipt) {
        requireCredentials();
        try {
            RazorpayClient client = new RazorpayClient(properties.keyId(), properties.keySecret());
            List<com.razorpay.Refund> refunds = client.payments.fetchAllRefunds(paymentId);
            for (com.razorpay.Refund refund : refunds) {
                if (receipt.equals(stringField(refund, "receipt"))) {
                    RazorpayRefund existing = toRazorpayRefund(refund);
                    if (existing.amount() != amount.movePointRight(2).longValueExact()) {
                        throw new PaymentGatewayException(
                                "Existing Razorpay refund does not match the requested amount.");
                    }
                    return existing;
                }
            }

            JSONObject options = new JSONObject();
            options.put("amount", amount.movePointRight(2).longValueExact());
            options.put("receipt", receipt);
            options.put("notes", new JSONObject().put("dreamspex_refund_receipt", receipt));
            return toRazorpayRefund(client.payments.refund(paymentId, options));
        } catch (RazorpayException | ArithmeticException e) {
            throw new PaymentGatewayException("Unable to create or locate the Razorpay refund.", e);
        }
    }

    public Optional<RazorpayRefund> findRefundByReceipt(String paymentId, String receipt) {
        requireCredentials();
        try {
            RazorpayClient client = new RazorpayClient(properties.keyId(), properties.keySecret());
            return client.payments.fetchAllRefunds(paymentId).stream()
                    .filter(refund -> receipt.equals(stringField(refund, "receipt")))
                    .map(RazorpayGateway::toRazorpayRefund)
                    .findFirst();
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Unable to reconcile the Razorpay refund.", e);
        }
    }

    public RazorpayRefund fetchRefund(String paymentId, String refundId) {
        requireCredentials();
        try {
            RazorpayClient client = new RazorpayClient(properties.keyId(), properties.keySecret());
            return toRazorpayRefund(client.payments.fetchRefund(paymentId, refundId));
        } catch (RazorpayException e) {
            throw new PaymentGatewayException("Unable to verify the Razorpay refund.", e);
        }
    }

    static RazorpayPayment toRazorpayPayment(String paymentId, Entity payment) {
        String orderId = stringField(payment, "order_id");
        String amountValue = stringField(payment, "amount");
        String currency = stringField(payment, "currency");
        String status = stringField(payment, "status");
        if (orderId == null || amountValue == null || currency == null || status == null) {
            throw new PaymentGatewayException("Razorpay payment response is missing required fields.");
        }
        try {
            return new RazorpayPayment(orderId, Long.parseLong(amountValue), currency, status);
        } catch (NumberFormatException e) {
            throw new PaymentGatewayException("Razorpay payment amount is invalid.", e);
        }
    }

    static RazorpayRefund toRazorpayRefund(Entity refund) {
        String id = stringField(refund, "id");
        String amountValue = stringField(refund, "amount");
        String status = stringField(refund, "status");
        String receipt = stringField(refund, "receipt");
        String currency = stringField(refund, "currency");
        if (id == null || amountValue == null || status == null) {
            throw new PaymentGatewayException("Razorpay refund response is missing required fields.");
        }
        try {
            Instant createdAt = instantField(refund, "created_at");
            return new RazorpayRefund(id, Long.parseLong(amountValue), status, receipt, currency,
                    stringField(refund, "payment_id"), createdAt);
        } catch (NumberFormatException e) {
            throw new PaymentGatewayException("Razorpay refund fields are invalid.", e);
        }
    }

    private static Instant instantField(Entity entity, String field) {
        if (!entity.toJson().has(field) || entity.toJson().isNull(field)) return null;
        Object value = entity.get(field);
        if (value == null) return null;
        if (value instanceof Date date) return date.toInstant();
        if (value instanceof Number timestamp) return Instant.ofEpochSecond(timestamp.longValue());
        if (value instanceof String timestamp) return Instant.ofEpochSecond(Long.parseLong(timestamp));
        throw new PaymentGatewayException("Razorpay refund timestamp has an unsupported format.");
    }

    private static String stringField(Entity entity, String field) {
        Object value = entity.get(field);
        return value == null ? null : value.toString();
    }

    private void requireCredentials() {
        if (properties.keyId() == null || properties.keyId().isBlank()
                || properties.keySecret() == null || properties.keySecret().isBlank()) {
            throw new PaymentGatewayException("Razorpay credentials are not configured.");
        }
    }

    public record RazorpayPayment(String orderId, long amount, String currency, String status) {}
    public record RazorpayRefund(String id, long amount, String status, String receipt, String currency,
                                 String paymentId, Instant createdAt) {
        public RazorpayRefund(String id, long amount, String status, String receipt) {
            this(id, amount, status, receipt, null, null, null);
        }
    }

    public static class PaymentGatewayException extends RuntimeException {
        public PaymentGatewayException(String message) { super(message); }
        public PaymentGatewayException(String message, Throwable cause) { super(message, cause); }
    }
}
