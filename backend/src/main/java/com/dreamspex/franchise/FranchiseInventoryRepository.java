package com.dreamspex.franchise;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FranchiseInventoryRepository extends JpaRepository<FranchiseInventory, String> {
    List<FranchiseInventory> findByStoreIdOrderByVariantProductNameAsc(String storeId);
    List<FranchiseInventory> findByStoreIdAndAvailabilityStatus(String storeId, String availabilityStatus);
    Optional<FranchiseInventory> findByStoreIdAndVariantId(String storeId, String variantId);
    List<FranchiseInventory> findByStoreIdAndVariantProductIdAndAvailabilityStatus(
            String storeId, String productId, String availabilityStatus);
    List<FranchiseInventory> findByStoreIdAndVariantProductIdOrderByVariantSkuAsc(String storeId, String productId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select i from FranchiseInventory i where i.store.id = :storeId and i.variant.id = :variantId")
    Optional<FranchiseInventory> findForUpdate(@Param("storeId") String storeId, @Param("variantId") String variantId);
}
