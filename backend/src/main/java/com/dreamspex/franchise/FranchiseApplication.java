package com.dreamspex.franchise;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "franchise_applications")
public class FranchiseApplication {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "reference_id", nullable = false, unique = true, length = 32)
    private String referenceId;

    @Column(name = "full_name", nullable = false, length = 160)
    private String fullName;

    @Column(name = "mobile_number", nullable = false, length = 32)
    private String mobileNumber;

    @Column(nullable = false, length = 255)
    private String email;

    @Column(name = "preferred_city", nullable = false, length = 100)
    private String preferredCity;

    @Column(nullable = false, length = 100)
    private String state;

    @Column(name = "full_address", nullable = false, columnDefinition = "TEXT")
    private String fullAddress;

    @Column(name = "investment_budget", nullable = false, precision = 14, scale = 2)
    private BigDecimal investmentBudget;

    @Column(name = "preferred_store_format", nullable = false, length = 100)
    private String preferredStoreFormat;

    @Column(name = "additional_message", columnDefinition = "TEXT")
    private String additionalMessage;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 24)
    private FranchiseApplicationStatus status = FranchiseApplicationStatus.PENDING;

    @Column(name = "internal_notes", columnDefinition = "TEXT")
    private String internalNotes;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String value) { referenceId = value; }
    public String getFullName() { return fullName; }
    public void setFullName(String value) { fullName = value; }
    public String getMobileNumber() { return mobileNumber; }
    public void setMobileNumber(String value) { mobileNumber = value; }
    public String getEmail() { return email; }
    public void setEmail(String value) { email = value; }
    public String getPreferredCity() { return preferredCity; }
    public void setPreferredCity(String value) { preferredCity = value; }
    public String getState() { return state; }
    public void setState(String value) { state = value; }
    public String getFullAddress() { return fullAddress; }
    public void setFullAddress(String value) { fullAddress = value; }
    public BigDecimal getInvestmentBudget() { return investmentBudget; }
    public void setInvestmentBudget(BigDecimal value) { investmentBudget = value; }
    public String getPreferredStoreFormat() { return preferredStoreFormat; }
    public void setPreferredStoreFormat(String value) { preferredStoreFormat = value; }
    public String getAdditionalMessage() { return additionalMessage; }
    public void setAdditionalMessage(String value) { additionalMessage = value; }
    public FranchiseApplicationStatus getStatus() { return status; }
    public void setStatus(FranchiseApplicationStatus value) { status = value; }
    public String getInternalNotes() { return internalNotes; }
    public void setInternalNotes(String value) { internalNotes = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
