package com.dreamspex.returns;

import com.dreamspex.notification.NotificationService;
import java.math.BigDecimal;
import java.text.NumberFormat;
import java.util.Locale;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;

@Service
public class ReturnRefundNotifications {
    private final NotificationService notifications;
    private final ApplicationEventPublisher events;

    public ReturnRefundNotifications(NotificationService notifications, ApplicationEventPublisher events) {
        this.notifications = notifications;
        this.events = events;
    }

    public void submitted(ReturnRequest request) {
        publish(request, "RETURN_SUBMITTED", "Return request received",
                "Your return request has been submitted.", "REQUESTED", null);
    }

    public void refundApproved(ReturnRefundTransaction transaction) {
        publish(transaction.getReturnRequest(), "REFUND_APPROVED", "Refund approved",
                "Your refund has been approved and submitted to the payment provider.",
                transaction.getStatus(), transaction.getProviderRefundId());
    }

    public void refundProcessed(ReturnRefundTransaction transaction) {
        publish(transaction.getReturnRequest(), "REFUND_PROCESSED", "Refund processed",
                "The payment provider has confirmed your refund.", "PROCESSED",
                transaction.getProviderRefundId());
    }

    public void refundFailed(ReturnRefundTransaction transaction) {
        publish(transaction.getReturnRequest(), "REFUND_FAILED", "Refund processing failed",
                "The payment provider reported that the refund failed. Dream Spex will review the transaction.",
                "FAILED", transaction.getProviderRefundId());
    }

    private void publish(ReturnRequest request, String type, String title, String summary,
                         String status, String refundReference) {
        String orderId = request.getOrder().getId();
        String orderNumber = request.getOrder().getOrderNumber();
        String amount = format(request.getRefundAmount());
        String reference = refundReference == null || refundReference.isBlank()
                ? "Not assigned yet" : refundReference;
        String message = "%s Order ID %s (%s) · Refund amount %s · Status %s · Razorpay refund reference %s."
                .formatted(summary, orderId, orderNumber, amount, status, reference);
        notifications.create(request.getUser(), type, title, message);

        String recipient = request.getUser().getEmail();
        if (recipient == null || recipient.isBlank()) return;
        String subject = "Dream Spex: " + title + " for order " + orderNumber;
        String text = """
                Hello,

                %s
                Order ID: %s
                Order number: %s
                Refund amount: %s
                Refund status: %s
                Razorpay refund reference: %s

                Dream Spex
                """.formatted(summary, orderId, orderNumber, amount, status, reference);
        String html = """
                <div style="font-family:Arial,sans-serif;color:#24352b;line-height:1.6">
                  <h2 style="color:#1f5c43">Dream Spex</h2>
                  <p>%s</p>
                  <p><strong>Order ID:</strong> %s<br>
                  <strong>Order number:</strong> %s<br>
                  <strong>Refund amount:</strong> %s<br>
                  <strong>Refund status:</strong> %s<br>
                  <strong>Razorpay refund reference:</strong> %s</p>
                </div>
                """.formatted(escape(summary), escape(orderId), escape(orderNumber), escape(amount),
                escape(status), escape(reference));
        events.publishEvent(new ReturnRefundEmail(recipient, subject, text, html, orderId));
    }

    private String format(BigDecimal amount) {
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("en-IN"))
                .format(amount == null ? BigDecimal.ZERO : amount);
    }

    private String escape(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
                .replace("\"", "&quot;").replace("'", "&#39;");
    }
}
