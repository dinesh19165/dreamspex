package com.dreamspex.payment;
import com.dreamspex.order.Order; import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="payments")
public class Payment {
 @Id private String id=UUID.randomUUID().toString(); @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="order_id",nullable=false) private Order order;
 @Column(nullable=false) private String provider; @Column(name="provider_order_id") private String providerOrderId; @Column(name="provider_payment_id") private String providerPaymentId;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal amount; @Column(nullable=false) private String currency="INR"; @Column(nullable=false) private String status="CREATED";
 @Column(name="signature_verified",nullable=false) private boolean signatureVerified;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now(); @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public Order getOrder(){return order;} public void setOrder(Order v){order=v;} public String getProvider(){return provider;} public void setProvider(String v){provider=v;}
 public String getProviderOrderId(){return providerOrderId;} public void setProviderOrderId(String v){providerOrderId=v;} public String getProviderPaymentId(){return providerPaymentId;} public void setProviderPaymentId(String v){providerPaymentId=v;}
 public BigDecimal getAmount(){return amount;} public void setAmount(BigDecimal v){amount=v;} public String getCurrency(){return currency;} public void setCurrency(String v){currency=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;}
 public boolean isSignatureVerified(){return signatureVerified;} public void setSignatureVerified(boolean v){signatureVerified=v;}
}
