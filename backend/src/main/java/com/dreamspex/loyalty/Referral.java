package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "referrals")
public class Referral {
    @Id
    private String id = UUID.randomUUID().toString();
    @Column(name = "referrer_id", nullable = false)
    private String referrerId;
    @Column(name = "referred_user_id", nullable = false, unique = true)
    private String referredUserId;
    @Column(name = "referral_code", nullable = false)
    private String referralCode;
    @Column(nullable = false)
    private String status = "PENDING";
    @Column(name = "qualifying_order_id", unique = true)
    private String qualifyingOrderId;
    @Column(name = "reward_type")
    private String rewardType;
    @Column(name = "referrer_reward_amount")
    private Integer referrerRewardAmount;
    @Column(name = "new_customer_reward_amount")
    private Integer newCustomerRewardAmount;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "qualified_at")
    private Instant qualifiedAt;

    public String getId() { return id; }
    public String getReferrerId() { return referrerId; }
    public void setReferrerId(String value) { referrerId = value; }
    public String getReferredUserId() { return referredUserId; }
    public void setReferredUserId(String value) { referredUserId = value; }
    public String getReferralCode() { return referralCode; }
    public void setReferralCode(String value) { referralCode = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public String getQualifyingOrderId() { return qualifyingOrderId; }
    public void setQualifyingOrderId(String value) { qualifyingOrderId = value; }
    public String getRewardType() { return rewardType; }
    public void setRewardType(String value) { rewardType = value; }
    public Integer getReferrerRewardAmount() { return referrerRewardAmount; }
    public void setReferrerRewardAmount(Integer value) { referrerRewardAmount = value; }
    public Integer getNewCustomerRewardAmount() { return newCustomerRewardAmount; }
    public void setNewCustomerRewardAmount(Integer value) { newCustomerRewardAmount = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getQualifiedAt() { return qualifiedAt; }
    public void setQualifiedAt(Instant value) { qualifiedAt = value; }
}
