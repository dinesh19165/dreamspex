package com.dreamspex.delivery;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

public interface DeliveryBatchOrderRepository extends JpaRepository<DeliveryBatchOrder, String> {
    List<DeliveryBatchOrder> findByBatchIdOrderByCreatedAtAsc(String batchId);
    List<DeliveryBatchOrder> findByBatchIdAndStatusNotOrderByCreatedAtAsc(String batchId, String status);
    List<DeliveryBatchOrder> findByActiveOrderIdIsNotNull();
    List<DeliveryBatchOrder> findByActiveReturnRequestIdIsNotNull();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from DeliveryBatchOrder item where item.activeReturnRequestId = :requestId")
    Optional<DeliveryBatchOrder> findByActiveReturnRequestIdForUpdate(@Param("requestId") String requestId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from DeliveryBatchOrder item where item.activeOrderId = :orderId")
    Optional<DeliveryBatchOrder> findByActiveOrderIdForUpdate(@Param("orderId") String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from DeliveryBatchOrder item where item.batch.id = :batchId and item.order.id = :orderId")
    Optional<DeliveryBatchOrder> findByBatchAndOrderForUpdate(
            @Param("batchId") String batchId, @Param("orderId") String orderId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select item from DeliveryBatchOrder item where item.batch.id = :batchId and item.returnRequest.id = :requestId")
    Optional<DeliveryBatchOrder> findByBatchAndReturnRequestForUpdate(
            @Param("batchId") String batchId, @Param("requestId") String requestId);

}
