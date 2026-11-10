package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "referral_settings")
public class ReferralSettings {
    @Id
    private Integer id = 1;
    @Column(nullable = false)
    private boolean enabled = true;
    @Column(name = "reward_type", nullable = false)
    private String rewardType = "LOYALTY_POINTS";
    @Column(name = "referrer_reward_amount", nullable = false)
    private int referrerRewardAmount = 100;
    @Column(name = "new_customer_reward_amount", nullable = false)
    private int newCustomerRewardAmount = 50;
    @Column(name = "minimum_purchase_amount", nullable = false, precision = 12, scale = 2)
    private BigDecimal minimumPurchaseAmount = new BigDecimal("500.00");
    @Column(name = "reward_expiry_days", nullable = false)
    private int rewardExpiryDays = 365;
    @Column(name = "maximum_rewards_per_customer", nullable = false)
    private int maximumRewardsPerCustomer = 10;
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Integer getId() { return id; }
    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean value) { enabled = value; }
    public String getRewardType() { return rewardType; }
    public void setRewardType(String value) { rewardType = value; }
    public int getReferrerRewardAmount() { return referrerRewardAmount; }
    public void setReferrerRewardAmount(int value) { referrerRewardAmount = value; }
    public int getNewCustomerRewardAmount() { return newCustomerRewardAmount; }
    public void setNewCustomerRewardAmount(int value) { newCustomerRewardAmount = value; }
    public BigDecimal getMinimumPurchaseAmount() { return minimumPurchaseAmount; }
    public void setMinimumPurchaseAmount(BigDecimal value) { minimumPurchaseAmount = value; }
    public int getRewardExpiryDays() { return rewardExpiryDays; }
    public void setRewardExpiryDays(int value) { rewardExpiryDays = value; }
    public int getMaximumRewardsPerCustomer() { return maximumRewardsPerCustomer; }
    public void setMaximumRewardsPerCustomer(int value) { maximumRewardsPerCustomer = value; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
