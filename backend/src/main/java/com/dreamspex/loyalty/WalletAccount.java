package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "wallet_accounts")
public class WalletAccount {
    @Id
    @Column(name = "user_id")
    private String userId;
    @Column(nullable = false, precision = 12, scale = 2)
    private BigDecimal balance = BigDecimal.ZERO;
    @Column(name = "total_credited", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalCredited = BigDecimal.ZERO;
    @Column(name = "total_debited", nullable = false, precision = 12, scale = 2)
    private BigDecimal totalDebited = BigDecimal.ZERO;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    protected WalletAccount() {}
    public WalletAccount(String userId) { this.userId = userId; }
    public String getUserId() { return userId; }
    public BigDecimal getBalance() { return balance; }
    public void setBalance(BigDecimal value) { balance = value; }
    public BigDecimal getTotalCredited() { return totalCredited; }
    public void setTotalCredited(BigDecimal value) { totalCredited = value; }
    public BigDecimal getTotalDebited() { return totalDebited; }
    public void setTotalDebited(BigDecimal value) { totalDebited = value; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
