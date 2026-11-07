package com.dreamspex.returns;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnableProductRepository extends JpaRepository<ReturnableProduct, String> {
    Optional<ReturnableProduct> findByProductIdAndEnabledTrue(String productId);
    List<ReturnableProduct> findAllByEnabledTrue();
}
