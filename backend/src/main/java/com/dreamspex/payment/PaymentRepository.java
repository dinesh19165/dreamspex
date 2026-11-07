package com.dreamspex.payment;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface PaymentRepository extends JpaRepository<Payment,String>{
 Optional<Payment> findByIdAndOrderUserId(String id,String userId);
 Optional<Payment> findByProviderAndProviderOrderId(String provider,String orderId);
 Optional<Payment> findByProviderAndOrderId(String provider,String orderId);
 Optional<Payment> findByProviderAndProviderPaymentId(String provider,String paymentId);
 Optional<Payment> findFirstByOrderIdAndStatusOrderByCreatedAtDesc(String orderId,String status);
 List<Payment> findAllByOrderByCreatedAtDesc();
}
