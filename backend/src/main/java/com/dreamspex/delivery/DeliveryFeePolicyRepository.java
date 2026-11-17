package com.dreamspex.delivery;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface DeliveryFeePolicyRepository extends JpaRepository<DeliveryFeePolicy, String> {
    List<DeliveryFeePolicy> findAllByOrderByUpdatedAtDesc();
    Optional<DeliveryFeePolicy> findFirstByStatusAndScopeOrderByUpdatedAtDesc(String status, DeliveryFeePolicy.Scope scope);
    Optional<DeliveryFeePolicy> findFirstByStatusAndScopeAndStore_IdOrderByUpdatedAtDesc(String status, DeliveryFeePolicy.Scope scope, String storeId);
    List<DeliveryFeePolicy> findByStatusOrderByUpdatedAtDesc(String status);
    List<DeliveryFeePolicy> findByStore_IdAndStatusOrderByUpdatedAtDesc(String storeId, String status);
}
