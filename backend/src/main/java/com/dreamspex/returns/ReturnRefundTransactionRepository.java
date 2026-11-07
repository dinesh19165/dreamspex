package com.dreamspex.returns;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnRefundTransactionRepository extends JpaRepository<ReturnRefundTransaction, String> {
    List<ReturnRefundTransaction> findByReturnRequestIdOrderByCreatedAtAsc(String returnRequestId);
    Optional<ReturnRefundTransaction> findFirstByReturnRequestIdOrderByCreatedAtDesc(String returnRequestId);
    Optional<ReturnRefundTransaction> findByIdAndReturnRequestId(String id, String returnRequestId);
    Optional<ReturnRefundTransaction> findByProviderRefundId(String providerRefundId);
    Optional<ReturnRefundTransaction> findByIdempotencyKey(String idempotencyKey);
}
