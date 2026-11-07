package com.dreamspex.delivery;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface DeliveryBatchRepository extends JpaRepository<DeliveryBatch, String> {
    List<DeliveryBatch> findAllByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select batch from DeliveryBatch batch where batch.id = :id")
    Optional<DeliveryBatch> findByIdForUpdate(@Param("id") String id);
}
