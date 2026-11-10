package com.dreamspex.loyalty;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;

public interface LoyaltyPointLotRepository extends JpaRepository<LoyaltyPointLot, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
        select l from LoyaltyPointLot l
        where l.userId = :userId and l.remainingPoints > 0 and l.expiresAt > :now
        order by l.expiresAt asc, l.createdAt asc
        """)
    List<LoyaltyPointLot> findSpendableForUpdate(@Param("userId") String userId, @Param("now") Instant now);

    List<LoyaltyPointLot> findByExpiresAtLessThanEqualAndRemainingPointsGreaterThan(Instant expiresAt, long remainingPoints);

    @Query("select coalesce(sum(l.remainingPoints), 0) from LoyaltyPointLot l where l.userId = :userId and l.remainingPoints > 0 and l.expiresAt > :now and l.expiresAt <= :soon")
    Long sumExpiringPoints(@Param("userId") String userId, @Param("now") Instant now, @Param("soon") Instant soon);
}
