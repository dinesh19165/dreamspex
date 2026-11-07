package com.dreamspex.prescription;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "lens_options")
public class LensOption {
    @Id private String id = UUID.randomUUID().toString();
    @Column(nullable = false, unique = true, length = 64) private String code;
    @Column(nullable = false, length = 120) private String name;
    @Column(nullable = false, length = 32) private String category;
    @Column(nullable = false, length = 1000) private String benefits;
    @Column(name = "additional_cost", precision = 12, scale = 2) private BigDecimal additionalCost;
    @Column(name = "preparation_days") private Integer preparationDays;
    @Column(nullable = false) private boolean available;
    @Column(name = "display_order", nullable = false) private int displayOrder;
    @Column(name = "created_at", nullable = false) private Instant createdAt = Instant.now();
    @Column(name = "updated_at", nullable = false) private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getCode() { return code; } public void setCode(String value) { code = value; }
    public String getName() { return name; } public void setName(String value) { name = value; }
    public String getCategory() { return category; } public void setCategory(String value) { category = value; }
    public String getBenefits() { return benefits; } public void setBenefits(String value) { benefits = value; }
    public BigDecimal getAdditionalCost() { return additionalCost; } public void setAdditionalCost(BigDecimal value) { additionalCost = value; }
    public Integer getPreparationDays() { return preparationDays; } public void setPreparationDays(Integer value) { preparationDays = value; }
    public boolean isAvailable() { return available; } public void setAvailable(boolean value) { available = value; }
    public int getDisplayOrder() { return displayOrder; } public void setDisplayOrder(int value) { displayOrder = value; }

    @PreUpdate
    void updateTimestamp() { updatedAt = Instant.now(); }
}
