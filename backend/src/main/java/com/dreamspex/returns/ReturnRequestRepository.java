package com.dreamspex.returns;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReturnRequestRepository extends JpaRepository<ReturnRequest, String> {
    Optional<ReturnRequest> findByIdAndUserId(String id, String userId);
    List<ReturnRequest> findByUserIdOrderByCreatedAtDesc(String userId);
    List<ReturnRequest> findByOrderId(String orderId);
    List<ReturnRequest> findAllByOrderByCreatedAtDesc();
    List<ReturnRequest> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
            java.time.Instant from, java.time.Instant to);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from ReturnRequest request where request.id = :id")
    Optional<ReturnRequest> findByIdForUpdate(@Param("id") String id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select request from ReturnRequest request where request.id in :ids order by request.id")
    List<ReturnRequest> findAllByIdsForUpdate(@Param("ids") List<String> ids);
}
