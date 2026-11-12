package com.dreamspex.franchise;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FranchiseProductAssignmentRepository extends JpaRepository<FranchiseProductAssignment, String> {
    Optional<FranchiseProductAssignment> findByStoreIdAndProductId(String storeId, String productId);
    List<FranchiseProductAssignment> findByStoreIdOrderByCreatedAtDesc(String storeId);

    @Query("""
        select distinct assignment.product.id from FranchiseProductAssignment assignment
        where assignment.store.id = :storeId and assignment.availabilityStatus = 'ACTIVE'
          and exists (
            select inventory.id from FranchiseInventory inventory
            where inventory.store = assignment.store and inventory.variant.product = assignment.product
              and inventory.availabilityStatus = 'ACTIVE'
              and inventory.quantity > inventory.reservedQuantity
          )
        """)
    List<String> findStorefrontProductIds(@Param("storeId") String storeId);
}
