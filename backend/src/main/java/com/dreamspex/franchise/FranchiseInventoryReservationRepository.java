package com.dreamspex.franchise;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FranchiseInventoryReservationRepository extends JpaRepository<FranchiseInventoryReservation, String> {
    List<FranchiseInventoryReservation> findByOrderId(String orderId);
    Optional<FranchiseInventoryReservation> findByOrderIdAndInventoryId(String orderId, String inventoryId);
}
