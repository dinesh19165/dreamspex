package com.dreamspex.loyalty;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.Instant;

@Entity
@Table(name = "referral_codes")
public class ReferralCode {
    @Id
    @Column(name = "user_id")
    private String userId;
    @Column(nullable = false, unique = true)
    private String code;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    protected ReferralCode() {}
    public ReferralCode(String userId, String code) { this.userId = userId; this.code = code; }
    public String getUserId() { return userId; }
    public String getCode() { return code; }
}
