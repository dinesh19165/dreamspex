package com.dreamspex.returns;

import java.util.List;
import java.util.Optional;
import java.util.Collection;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnableProductRepository extends JpaRepository<ReturnableProduct, String> {
    Optional<ReturnableProduct> findByProductIdAndEnabledTrue(String productId);
    List<ReturnableProduct> findAllByEnabledTrue();
    List<ReturnableProduct> findAllByProductIdIn(Collection<String> productIds);
}
