package com.dreamspex.delivery;

import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface DeliveryFeeSlabRepository extends JpaRepository<DeliveryFeeSlab, String> {
    List<DeliveryFeeSlab> findByPolicyIdOrderByMinDistanceKmAsc(String policyId);
    List<DeliveryFeeSlab> findByPolicyIdAndStatusOrderByMinDistanceKmAsc(String policyId, String status);
}
