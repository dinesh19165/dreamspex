package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "loyalty_point_lots")
public class LoyaltyPointLot {
    @Id
    private String id = UUID.randomUUID().toString();
    @Column(name = "user_id", nullable = false)
    private String userId;
    @Column(name = "transaction_id", nullable = false)
    private String transactionId;
    @Column(name = "original_points", nullable = false)
    private long originalPoints;
    @Column(name = "remaining_points", nullable = false)
    private long remainingPoints;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String value) { userId = value; }
    public String getTransactionId() { return transactionId; }
    public void setTransactionId(String value) { transactionId = value; }
    public long getOriginalPoints() { return originalPoints; }
    public void setOriginalPoints(long value) { originalPoints = value; }
    public long getRemainingPoints() { return remainingPoints; }
    public void setRemainingPoints(long value) { remainingPoints = value; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant value) { expiresAt = value; }
    public Instant getCreatedAt() { return createdAt; }
}
