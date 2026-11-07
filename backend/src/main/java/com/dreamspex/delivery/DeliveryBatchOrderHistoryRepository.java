package com.dreamspex.delivery;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface DeliveryBatchOrderHistoryRepository extends JpaRepository<DeliveryBatchOrderHistory, String> {
    List<DeliveryBatchOrderHistory> findByBatchOrderIdOrderByCreatedAtAsc(String batchOrderId);
}
