package com.dreamspex.auth.entity;

import jakarta.persistence.*;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

@Entity
@Table(name = "customer_profiles")
public class CustomerProfile {
    @Id
    private String id = UUID.randomUUID().toString();
    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;
    @Column(name = "first_name")
    private String firstName;
    @Column(name = "last_name")
    private String lastName;
    @Column(name = "date_of_birth")
    private LocalDate dateOfBirth;
    private String gender;
    @Column(name = "marketing_opt_in", nullable = false)
    private boolean marketingOptIn;
    @Column(name = "whatsapp_marketing_opt_in", nullable = false)
    private boolean whatsappMarketingOptIn;
    @Column(name = "whatsapp_marketing_opt_out", nullable = false)
    private boolean whatsappMarketingOptOut;
    @Column(name = "whatsapp_consent_at")
    private Instant whatsappConsentAt;
    @Column(name = "whatsapp_consent_source", length = 80)
    private String whatsappConsentSource;
    @Column(name = "membership_status", nullable = false)
    private String membershipStatus = "NONE";
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }
    public String getFirstName() { return firstName; }
    public void setFirstName(String firstName) { this.firstName = firstName; }
    public String getLastName() { return lastName; }
    public void setLastName(String lastName) { this.lastName = lastName; }
    public LocalDate getDateOfBirth() { return dateOfBirth; }
    public void setDateOfBirth(LocalDate dateOfBirth) { this.dateOfBirth = dateOfBirth; }
    public String getGender() { return gender; }
    public void setGender(String gender) { this.gender = gender; }
    public boolean isMarketingOptIn() { return marketingOptIn; }
    public void setMarketingOptIn(boolean marketingOptIn) { this.marketingOptIn = marketingOptIn; }
    public boolean isWhatsappMarketingOptIn() { return whatsappMarketingOptIn && !whatsappMarketingOptOut; }
    public boolean isWhatsappMarketingOptOut() { return whatsappMarketingOptOut; }
    public void setWhatsappMarketingOptIn(boolean value) {
        if (value && whatsappMarketingOptIn && !whatsappMarketingOptOut) return;
        if (!value && !whatsappMarketingOptIn && whatsappMarketingOptOut) return;
        whatsappMarketingOptIn = value;
        whatsappMarketingOptOut = !value;
        whatsappConsentAt = Instant.now();
        whatsappConsentSource = "CUSTOMER_ACCOUNT";
    }
    public Instant getWhatsappConsentAt() { return whatsappConsentAt; }
    public String getWhatsappConsentSource() { return whatsappConsentSource; }
    public String getMembershipStatus() { return membershipStatus; }
}
