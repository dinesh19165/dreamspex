package com.dreamspex.payment;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="payment_webhook_events",uniqueConstraints=@UniqueConstraint(name="uk_payment_webhook_event",columnNames={"provider","event_id"}))
public class PaymentWebhookEvent {
 @Id private String id=UUID.randomUUID().toString(); @Column(nullable=false) private String provider; @Column(name="event_id",nullable=false) private String eventId; @Column(name="payload_hash",nullable=false) private String payloadHash; @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 public void setProvider(String v){provider=v;} public void setEventId(String v){eventId=v;} public void setPayloadHash(String v){payloadHash=v;}
}
