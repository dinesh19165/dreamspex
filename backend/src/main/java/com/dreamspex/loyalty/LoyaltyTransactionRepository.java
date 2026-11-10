package com.dreamspex.loyalty;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface LoyaltyTransactionRepository extends JpaRepository<LoyaltyTransaction, String> {
    Optional<LoyaltyTransaction> findByReferenceKey(String referenceKey);
    List<LoyaltyTransaction> findTop100ByUserIdOrderByCreatedAtDesc(String userId);

    @Query("""
        select t from LoyaltyTransaction t
        where (:search is null or exists (
            select u.id from User u where u.id = t.userId and
              (lower(u.displayName) like lower(concat('%', :search, '%'))
               or lower(coalesce(u.email, '')) like lower(concat('%', :search, '%'))
               or lower(coalesce(u.phone, '')) like lower(concat('%', :search, '%'))
               or u.id = :search)
        ))
          and (:fromDate is null or t.createdAt >= :fromDate)
          and (:toDate is null or t.createdAt < :toDate)
          and (:type is null or t.transactionType = :type)
        order by t.createdAt desc
        """)
    Page<LoyaltyTransaction> search(@Param("search") String search,
                                    @Param("fromDate") Instant fromDate,
                                    @Param("toDate") Instant toDate,
                                    @Param("type") String type, Pageable pageable);

    @Query("select coalesce(sum(t.pointsDelta), 0) from LoyaltyTransaction t where t.pointsDelta > 0")
    Long totalPositivePoints();

    @Query("select coalesce(sum(-t.pointsDelta), 0) from LoyaltyTransaction t where t.pointsDelta < 0 and t.transactionType = 'REDEMPTION'")
    Long totalRedeemedPoints();

    @Query("select coalesce(sum(t.pointsDelta), 0) from LoyaltyTransaction t where t.orderId = :orderId and t.transactionType = :type")
    Long sumPointsForOrderAndType(@Param("orderId") String orderId, @Param("type") String type);
}
