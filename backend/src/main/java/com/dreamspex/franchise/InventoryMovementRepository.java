package com.dreamspex.franchise;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface InventoryMovementRepository extends JpaRepository<InventoryMovement, String> {
    List<InventoryMovement> findTop100ByStoreIdOrderByCreatedAtDesc(String storeId);
    List<InventoryMovement> findTop100ByOrderByCreatedAtDesc();
    boolean existsByReferenceIdAndMovementType(String referenceId, String movementType);
}
