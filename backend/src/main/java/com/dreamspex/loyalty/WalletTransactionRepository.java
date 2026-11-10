package com.dreamspex.loyalty;

import java.util.List;
import java.util.Optional;
import java.time.Instant;
import org.springframework.data.jpa.repository.JpaRepository;

public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, String> {
    Optional<WalletTransaction> findByReferenceKey(String referenceKey);
    List<WalletTransaction> findTop100ByUserIdOrderByCreatedAtDesc(String userId);
    List<WalletTransaction> findByExpiresAtLessThanEqualAndAmountDeltaGreaterThan(Instant expiresAt, java.math.BigDecimal amount);
}
