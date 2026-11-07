package com.dreamspex.returns;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.payment.Payment;
import com.dreamspex.payment.PaymentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class ReturnRefundProcessor {
    private final ReturnRequestRepository requests;
    private final ReturnRefundTransactionRepository refunds;
    private final PaymentRepository payments;
    private final ReturnStatusHistoryRepository history;
    private final ReturnRefundNotifications notifications;

    public ReturnRefundProcessor(ReturnRequestRepository requests, ReturnRefundTransactionRepository refunds,
                                 PaymentRepository payments, ReturnStatusHistoryRepository history,
                                 ReturnRefundNotifications notifications) {
        this.requests = requests;
        this.refunds = refunds;
        this.payments = payments;
        this.history = history;
        this.notifications = notifications;
    }

    @Transactional
    public RefundCommand prepare(String returnRequestId, User admin) {
        ReturnRequest request = requests.findByIdForUpdate(returnRequestId)
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND"));
        if (!"REFUND".equals(request.getResolution()) || request.getRefundAmount().signum() <= 0) {
            throw new ApiException(HttpStatus.CONFLICT, "REFUND_NOT_AVAILABLE",
                    "This return request does not have a refundable amount.");
        }
        if (!"QUALITY_CHECK".equals(request.getStatus()) && !"REFUND_PROCESSING".equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "REFUND_NOT_READY",
                    "The return must pass quality check before a refund can be processed.");
        }

        ReturnRefundTransaction latest = refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(returnRequestId)
                .orElse(null);
        if (latest != null && "PROCESSED".equals(latest.getStatus())) {
            return command(latest, true, false);
        }
        if (latest != null && Set.of("PROCESSING", "PENDING", "CREATED", "SUBMITTING")
                .contains(latest.getStatus())) {
            return command(latest, false, true);
        }

        Payment payment = payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                        request.getOrder().getId(), "CAPTURED")
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "CAPTURED_PAYMENT_NOT_FOUND",
                        "A verified captured payment could not be found for this order."));
        if (latest == null || "FAILED".equals(latest.getStatus())) {
            latest = new ReturnRefundTransaction();
            latest.setReturnRequest(request);
            latest.setPayment(payment);
            latest.setProvider(payment.getProvider());
            latest.setAmount(request.getRefundAmount());
            latest.setCurrency(payment.getCurrency());
            latest.setStatus("SUBMITTING");
            latest.setIdempotencyKey("ret_" + UUID.randomUUID().toString().replace("-", ""));
            refunds.saveAndFlush(latest);
        }

        if (!"REFUND_PROCESSING".equals(request.getStatus())) {
            request.setStatus("REFUND_PROCESSING");
            request.setUpdatedAt(Instant.now());
            record(request, "REFUND_PROCESSING", "Refund submitted to payment provider.", admin);
        }
        return command(latest, false, false);
    }

    @Transactional
    public ReturnRefundTransaction complete(String transactionId, String providerRefundId, String providerStatus) {
        return complete(transactionId, providerRefundId, providerStatus, null);
    }

    @Transactional
    public ReturnRefundTransaction complete(String transactionId, String providerRefundId, String providerStatus,
                                            Instant gatewayCreatedAt) {
        ReturnRefundTransaction transaction = refunds.findById(transactionId)
                .orElseThrow(() -> notFound("REFUND_NOT_FOUND"));
        ReturnRequest request = requests.findByIdForUpdate(transaction.getReturnRequest().getId())
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND"));

        String previousStatus = transaction.getStatus();
        if (Set.of("PROCESSED", "FAILED").contains(previousStatus)) {
            return transaction;
        }
        transaction.setProviderRefundId(providerRefundId);
        transaction.setUpdatedAt(Instant.now());
        if (gatewayCreatedAt != null) transaction.setGatewayCreatedAt(gatewayCreatedAt);
        transaction.setErrorMessage(null);
        String normalized = providerStatus.toLowerCase(java.util.Locale.ROOT);
        if ("processed".equals(normalized)) {
            transaction.setStatus("PROCESSED");
            transaction.setProcessedAt(Instant.now());
            if (!"REFUNDED".equals(request.getStatus())) {
                request.setStatus("REFUNDED");
                request.setUpdatedAt(Instant.now());
                record(request, "REFUNDED", "The payment provider confirmed the refund.", null);
                notifications.refundProcessed(transaction);
            }
        } else if ("failed".equals(normalized)) {
            transaction.setStatus("FAILED");
            transaction.setErrorMessage("The payment provider reported that the refund failed.");
            transaction.setProcessedAt(Instant.now());
            if (!"FAILED".equals(previousStatus)) notifications.refundFailed(transaction);
        } else {
            transaction.setStatus(normalized.toUpperCase(java.util.Locale.ROOT));
            if (Set.of("SUBMITTING", "PENDING", "CREATED").contains(previousStatus)
                    && !"SUBMITTING".equals(transaction.getStatus())) {
                notifications.refundApproved(transaction);
            }
        }
        return refunds.save(transaction);
    }

    @Transactional
    public boolean handleGatewayEvent(String provider, String providerRefundId, String providerPaymentId,
                                      long amountMinor, String currency, String gatewayStatus, String receipt,
                                      Instant gatewayCreatedAt) {
        Optional<ReturnRefundTransaction> match = providerRefundId == null || providerRefundId.isBlank()
                ? Optional.empty() : refunds.findByProviderRefundId(providerRefundId);
        if (match.isEmpty() && receipt != null && !receipt.isBlank()) {
            match = refunds.findByIdempotencyKey(receipt);
        }
        if (match.isEmpty()) return false;

        ReturnRefundTransaction transaction = match.get();
        if (!transaction.getProvider().equals(provider)
                || !transaction.getPayment().getProviderPaymentId().equals(providerPaymentId)
                || transaction.getAmount().movePointRight(2).longValueExact() != amountMinor
                || !transaction.getCurrency().equalsIgnoreCase(currency)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_MISMATCH",
                    "Payment provider refund does not match the stored return transaction.");
        }
        complete(transaction.getId(), providerRefundId, gatewayStatus, gatewayCreatedAt);
        return true;
    }

    private RefundCommand command(ReturnRefundTransaction transaction, boolean complete, boolean fetchOnly) {
        Payment payment = transaction.getPayment();
        return new RefundCommand(
                transaction.getId(),
                payment.getProviderPaymentId(),
                transaction.getAmount(),
                transaction.getCurrency(),
                transaction.getIdempotencyKey(),
                transaction.getProviderRefundId(),
                transaction.getStatus(),
                complete,
                fetchOnly);
    }

    private void record(ReturnRequest request, String status, String note, User actor) {
        ReturnStatusHistory entry = new ReturnStatusHistory();
        entry.setReturnRequest(request);
        entry.setStatus(status);
        entry.setNote(note);
        entry.setChangedBy(actor);
        history.save(entry);
    }

    private ApiException notFound(String code) {
        return new ApiException(HttpStatus.NOT_FOUND, code, "Return management record was not found.");
    }

    public record RefundCommand(String transactionId, String providerPaymentId, BigDecimal amount,
                                String currency, String idempotencyKey, String providerRefundId, String status,
                                boolean complete, boolean fetchOnly) {}
}
