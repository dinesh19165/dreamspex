package com.dreamspex.membership;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface MembershipPaymentRepository extends JpaRepository<MembershipPayment, String> {
    Optional<MembershipPayment> findByProviderAndProviderOrderId(String provider, String providerOrderId);
    Optional<MembershipPayment> findByProviderAndProviderPaymentId(String provider, String providerPaymentId);
    List<MembershipPayment> findByUserIdOrderByCreatedAtDesc(String userId);
    List<MembershipPayment> findAllByOrderByCreatedAtDesc();
}
