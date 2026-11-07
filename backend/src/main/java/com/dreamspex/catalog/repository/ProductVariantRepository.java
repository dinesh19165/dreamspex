package com.dreamspex.catalog.repository;


import com.dreamspex.catalog.entity.ProductVariant;
import org.springframework.data.jpa.repository.JpaRepository;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.Lock;
import java.util.List;
import java.util.Optional;

public interface ProductVariantRepository extends JpaRepository<ProductVariant, String> {
    long countByQuantityLessThanEqualAndStatus(int quantity, String status);
    Optional<ProductVariant> findBySku(String sku);
    List<ProductVariant> findByProductIdAndStatusOrderBySku(String productId, String status);
    Optional<ProductVariant> findByIdAndStatus(String id, String status);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<ProductVariant> findWithLockByIdAndStatus(String id, String status);
}
