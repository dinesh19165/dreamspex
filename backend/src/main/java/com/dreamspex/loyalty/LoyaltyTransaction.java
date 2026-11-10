package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loyalty_transactions")
public class LoyaltyTransaction {
    @Id
    private String id = UUID.randomUUID().toString();
    @Column(name = "user_id", nullable = false)
    private String userId;
    @Column(name = "order_id")
    private String orderId;
    @Column(name = "transaction_type", nullable = false)
    private String transactionType;
    @Column(name = "points_delta", nullable = false)
    private long pointsDelta;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal amount = BigDecimal.ZERO;
    @Column(name = "reference_key", nullable = false, unique = true)
    private String referenceKey;
    @Column(nullable = false)
    private String description;
    @Column(name = "expires_at")
    private Instant expiresAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String value) { userId = value; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String value) { orderId = value; }
    public String getTransactionType() { return transactionType; }
    public void setTransactionType(String value) { transactionType = value; }
    public long getPointsDelta() { return pointsDelta; }
    public void setPointsDelta(long value) { pointsDelta = value; }
    public BigDecimal getAmount() { return amount; }
    public void setAmount(BigDecimal value) { amount = value; }
    public String getReferenceKey() { return referenceKey; }
    public void setReferenceKey(String value) { referenceKey = value; }
    public String getDescription() { return description; }
    public void setDescription(String value) { description = value; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant value) { expiresAt = value; }
    public Instant getCreatedAt() { return createdAt; }
}
