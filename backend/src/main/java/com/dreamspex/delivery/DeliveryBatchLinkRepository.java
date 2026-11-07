package com.dreamspex.delivery;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeliveryBatchLinkRepository extends JpaRepository<DeliveryBatchLink, String> {
    Optional<DeliveryBatchLink> findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
            String tokenHash, Instant now);
    Optional<DeliveryBatchLink> findFirstByBatchIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
            String batchId, Instant now);
    List<DeliveryBatchLink> findByBatchIdAndRevokedAtIsNull(String batchId);

    @Modifying
    @Query("update DeliveryBatchLink link set link.revokedAt = :now " +
            "where link.batch.id = :batchId and link.revokedAt is null")
    int revokeActiveLinks(@Param("batchId") String batchId, @Param("now") Instant now);
}
