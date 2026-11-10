package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "loyalty_accounts")
public class LoyaltyAccount {
    @Id
    @Column(name = "user_id")
    private String userId;
    @Column(name = "available_points", nullable = false)
    private long availablePoints;
    @Column(name = "total_earned", nullable = false)
    private long totalEarned;
    @Column(name = "total_redeemed", nullable = false)
    private long totalRedeemed;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected LoyaltyAccount() {}
    public LoyaltyAccount(String userId) { this.userId = userId; }
    public String getUserId() { return userId; }
    public long getAvailablePoints() { return availablePoints; }
    public void setAvailablePoints(long value) { availablePoints = value; }
    public long getTotalEarned() { return totalEarned; }
    public void setTotalEarned(long value) { totalEarned = value; }
    public long getTotalRedeemed() { return totalRedeemed; }
    public void setTotalRedeemed(long value) { totalRedeemed = value; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
