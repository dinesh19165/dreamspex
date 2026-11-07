package com.dreamspex.payment;
import org.springframework.data.jpa.repository.JpaRepository;
public interface PaymentWebhookEventRepository extends JpaRepository<PaymentWebhookEvent,String>{boolean existsByProviderAndEventId(String provider,String eventId);}
