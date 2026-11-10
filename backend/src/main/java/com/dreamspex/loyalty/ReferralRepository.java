package com.dreamspex.loyalty;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReferralRepository extends JpaRepository<Referral, String> {
    Optional<Referral> findByReferredUserId(String referredUserId);
    List<Referral> findByReferrerIdOrderByCreatedAtDesc(String referrerId);
    long countByReferrerIdAndStatus(String referrerId, String status);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select r from Referral r where r.referredUserId = :userId")
    Optional<Referral> findByReferredUserIdForUpdate(@Param("userId") String userId);

    @Query("""
        select r from Referral r
        where (:search is null or exists (
            select u.id from User u where (u.id = r.referrerId or u.id = r.referredUserId)
              and (lower(u.displayName) like lower(concat('%', :search, '%'))
               or lower(coalesce(u.email, '')) like lower(concat('%', :search, '%'))
               or lower(coalesce(u.phone, '')) like lower(concat('%', :search, '%'))
               or u.id = :search)
        ))
          and (:status is null or r.status = :status)
          and (:fromDate is null or r.createdAt >= :fromDate)
          and (:toDate is null or r.createdAt < :toDate)
        order by r.createdAt desc
        """)
    Page<Referral> search(@Param("search") String search,
                          @Param("status") String status,
                          @Param("fromDate") Instant fromDate,
                          @Param("toDate") Instant toDate, Pageable pageable);

    long countByStatus(String status);
}
