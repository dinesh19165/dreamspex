package com.dreamspex.returns;


import com.dreamspex.auth.entity.User;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import org.mockito.ArgumentCaptor;import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.payment.Payment;
import com.dreamspex.payment.PaymentRepository;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class ReturnRefundProcessorTest {
    private final ReturnRequestRepository requests = mock(ReturnRequestRepository.class);
    private final ReturnRefundTransactionRepository refunds = mock(ReturnRefundTransactionRepository.class);
    private final PaymentRepository payments = mock(PaymentRepository.class);
    private final ReturnStatusHistoryRepository history = mock(ReturnStatusHistoryRepository.class);
    private final ReturnRefundNotifications notifications = mock(ReturnRefundNotifications.class);
    private final ReturnRefundProcessor processor =
            new ReturnRefundProcessor(requests, refunds, payments, history, notifications);
    private final ReturnRequest request = new ReturnRequest();
    private final Payment payment = new Payment();
    private final User admin = new User();

    @BeforeEach
    void setUp() {
        Order order = new Order();
        request.setOrder(order);
        request.setUser(new User());
        request.setResolution("REFUND");
        request.setStatus("QUALITY_CHECK");
        request.setRefundAmount(new BigDecimal("90.00"));
        payment.setOrder(order);
        payment.setStatus("CAPTURED");
        payment.setProvider("RAZORPAY_TEST");
        payment.setProviderPaymentId("pay_verified");
        payment.setAmount(new BigDecimal("180.00"));
        when(requests.findByIdForUpdate(request.getId())).thenReturn(Optional.of(request));
        when(payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(order.getId(), "CAPTURED"))
                .thenReturn(Optional.of(payment));
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId())).thenReturn(Optional.empty());
        when(refunds.saveAndFlush(any(ReturnRefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(refunds.save(any(ReturnRefundTransaction.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(refunds.findById(any())).thenAnswer(invocation -> {
            ReturnRefundTransaction transaction = new ReturnRefundTransaction();
            transaction.setReturnRequest(request);
            transaction.setPayment(payment);
            transaction.setAmount(new BigDecimal("90.00"));
            transaction.setStatus("PROCESSING");
            transaction.setIdempotencyKey("ret_existing");
            transaction.setProviderRefundId("rfnd_1");
            return Optional.of(transaction);
        });
        when(history.save(any(ReturnStatusHistory.class))).thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void repeatedPrepareReusesDurableIdempotencyKeyInsteadOfCreatingAnotherRefund() {
        ReturnRefundProcessor.RefundCommand first = processor.prepare(request.getId(), admin);
        ArgumentCaptor<ReturnRefundTransaction> captor = ArgumentCaptor.forClass(ReturnRefundTransaction.class);
        verify(refunds).saveAndFlush(captor.capture());
        ReturnRefundTransaction pending = captor.getValue();
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId()))
                .thenReturn(Optional.of(pending));

        ReturnRefundProcessor.RefundCommand retry = processor.prepare(request.getId(), admin);

        assertEquals(first.transactionId(), retry.transactionId());
        assertEquals(first.idempotencyKey(), retry.idempotencyKey());
    }

    @Test
    void pendingRefundIsReconciledWithoutCreatingAnotherAttempt() {
        request.setStatus("REFUND_PROCESSING");
        ReturnRefundTransaction pending = new ReturnRefundTransaction();
        pending.setReturnRequest(request);
        pending.setPayment(payment);
        pending.setAmount(new BigDecimal("90.00"));
        pending.setStatus("PENDING");
        pending.setIdempotencyKey("ret_pending");
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId()))
                .thenReturn(Optional.of(pending));

        ReturnRefundProcessor.RefundCommand command = processor.prepare(request.getId(), admin);

        assertEquals(true, command.fetchOnly());
        assertEquals("ret_pending", command.idempotencyKey());
        verify(refunds, never()).saveAndFlush(any(ReturnRefundTransaction.class));
    }

    @Test
    void failedRefundCreatesRetryAttemptOnlyAfterBackendFailureStatus() {
        request.setStatus("REFUND_PROCESSING");
        ReturnRefundTransaction failed = new ReturnRefundTransaction();
        failed.setReturnRequest(request);
        failed.setPayment(payment);
        failed.setAmount(new BigDecimal("90.00"));
        failed.setStatus("FAILED");
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId()))
                .thenReturn(Optional.of(failed));

        ReturnRefundProcessor.RefundCommand retry = processor.prepare(request.getId(), admin);

        assertEquals(false, retry.fetchOnly());
        assertEquals("SUBMITTING", retry.status());
        verify(refunds).saveAndFlush(any(ReturnRefundTransaction.class));
    }

    @Test
    void processedRefundCannotCreateAnotherAttempt() {
        request.setStatus("REFUNDED");
        ReturnRefundTransaction processed = new ReturnRefundTransaction();
        processed.setReturnRequest(request);
        processed.setPayment(payment);
        processed.setAmount(new BigDecimal("90.00"));
        processed.setStatus("PROCESSED");
        when(refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId()))
                .thenReturn(Optional.of(processed));

        assertThrows(ApiException.class, () -> processor.prepare(request.getId(), admin));
        verify(refunds, never()).saveAndFlush(any(ReturnRefundTransaction.class));
    }

    @Test
    void onlyGatewayProcessedStatusMarksRequestRefunded() {
        request.setStatus("REFUND_PROCESSING");
        ReturnRefundTransaction transaction = new ReturnRefundTransaction();
        transaction.setReturnRequest(request);
        transaction.setPayment(payment);
        transaction.setAmount(new BigDecimal("90.00"));
        transaction.setStatus("PROCESSING");
        when(refunds.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        processor.complete(transaction.getId(), "rfnd_1", "pending");
        assertEquals("REFUND_PROCESSING", request.getStatus());

        processor.complete(transaction.getId(), "rfnd_1", "processed");
        assertEquals("REFUNDED", request.getStatus());
        assertEquals("PROCESSED", transaction.getStatus());
    }

    @Test
    void failedGatewayRefundRemainsUnrefundedAndNotifiesCustomer() {
        request.setStatus("REFUND_PROCESSING");
        ReturnRefundTransaction transaction = new ReturnRefundTransaction();
        transaction.setReturnRequest(request);
        transaction.setPayment(payment);
        transaction.setAmount(new BigDecimal("90.00"));
        transaction.setCurrency("INR");
        transaction.setStatus("PENDING");
        when(refunds.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        processor.complete(transaction.getId(), "rfnd_failed", "failed");

        assertEquals("FAILED", transaction.getStatus());
        assertEquals("REFUND_PROCESSING", request.getStatus());
        verify(notifications).refundFailed(transaction);
    }

    @Test
    void staleRefundEventsCannotChangeProcessedTerminalState() {
        request.setStatus("REFUNDED");
        ReturnRefundTransaction transaction = new ReturnRefundTransaction();
        transaction.setReturnRequest(request);
        transaction.setPayment(payment);
        transaction.setAmount(new BigDecimal("90.00"));
        transaction.setStatus("PROCESSED");
        transaction.setProviderRefundId("rfnd_processed");
        when(refunds.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        processor.complete(transaction.getId(), "rfnd_stale", "failed");
        processor.complete(transaction.getId(), "rfnd_stale", "pending");

        assertEquals("PROCESSED", transaction.getStatus());
        assertEquals("rfnd_processed", transaction.getProviderRefundId());
        assertEquals("REFUNDED", request.getStatus());
        verify(notifications, never()).refundFailed(any());
    }

    @Test
    void staleRefundEventsCannotChangeFailedTerminalState() {
        request.setStatus("REFUND_PROCESSING");
        ReturnRefundTransaction transaction = new ReturnRefundTransaction();
        transaction.setReturnRequest(request);
        transaction.setPayment(payment);
        transaction.setAmount(new BigDecimal("90.00"));
        transaction.setStatus("FAILED");
        transaction.setProviderRefundId("rfnd_failed");
        when(refunds.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        processor.complete(transaction.getId(), "rfnd_stale", "created");
        processor.complete(transaction.getId(), "rfnd_stale", "processed");

        assertEquals("FAILED", transaction.getStatus());
        assertEquals("rfnd_failed", transaction.getProviderRefundId());
        assertEquals("REFUND_PROCESSING", request.getStatus());
        verifyNoInteractions(notifications);
    }

    @Test
    void webhookMatchesPartialRefundByReceiptAndValidatesAmountBeforeCompletion() {
        request.setStatus("REFUND_PROCESSING");
        payment.setProviderPaymentId("pay_verified");
        ReturnRefundTransaction transaction = new ReturnRefundTransaction();
        transaction.setReturnRequest(request);
        transaction.setPayment(payment);
        transaction.setProvider("RAZORPAY_TEST");
        transaction.setAmount(new BigDecimal("45.00"));
        transaction.setCurrency("INR");
        transaction.setStatus("PENDING");
        transaction.setIdempotencyKey("ret_partial");
        when(refunds.findByIdempotencyKey("ret_partial")).thenReturn(Optional.of(transaction));
        when(refunds.findById(transaction.getId())).thenReturn(Optional.of(transaction));

        boolean handled = processor.handleGatewayEvent("RAZORPAY_TEST", "rfnd_partial", "pay_verified",
                4500, "INR", "processed", "ret_partial", Instant.now());

        assertEquals(true, handled);
        assertEquals("PROCESSED", transaction.getStatus());
        assertEquals("REFUNDED", request.getStatus());
        assertEquals("rfnd_partial", transaction.getProviderRefundId());
    }
}
