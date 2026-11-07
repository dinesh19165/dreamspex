package com.dreamspex.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "otp_challenges")
public class OtpChallenge {
    @Id
    private String id = UUID.randomUUID().toString();
    @Column(name = "user_id")
    private String userId;
    @Column(nullable = false)
    private String identifier;
    @Column(nullable = false)
    private String purpose;
    @Column(name = "delivery_channel")
    private String deliveryChannel;
    @Column(name = "code_hash", nullable = false)
    private String codeHash;
    @Column(nullable = false)
    private int attempts;
    @Column(name = "resend_count", nullable = false)
    private int resendCount;
    @Column(name = "last_sent_at")
    private Instant lastSentAt;
    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;
    @Column(name = "verified_at")
    private Instant verifiedAt;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getUserId() { return userId; }
    public void setUserId(String userId) { this.userId = userId; }
    public String getIdentifier() { return identifier; }
    public void setIdentifier(String identifier) { this.identifier = identifier; }
    public String getPurpose() { return purpose; }
    public void setPurpose(String purpose) { this.purpose = purpose; }
    public String getDeliveryChannel() { return deliveryChannel; }
    public void setDeliveryChannel(String value) { deliveryChannel = value; }
    public String getCodeHash() { return codeHash; }
    public void setCodeHash(String codeHash) { this.codeHash = codeHash; }
    public int getAttempts() { return attempts; }
    public void setAttempts(int attempts) { this.attempts = attempts; }
    public int getResendCount() { return resendCount; }
    public void setResendCount(int value) { resendCount = value; }
    public Instant getLastSentAt() { return lastSentAt; }
    public void setLastSentAt(Instant value) { lastSentAt = value; }
    public Instant getExpiresAt() { return expiresAt; }
    public void setExpiresAt(Instant expiresAt) { this.expiresAt = expiresAt; }
    public Instant getVerifiedAt() { return verifiedAt; }
    public void setVerifiedAt(Instant verifiedAt) { this.verifiedAt = verifiedAt; }
}
