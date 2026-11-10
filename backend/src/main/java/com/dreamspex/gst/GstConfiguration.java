package com.dreamspex.gst;

import com.dreamspex.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "gst_configurations")
public class GstConfiguration {
    @Id
    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(nullable = false, length = 36)
    private String id = UUID.randomUUID().toString();

    @Column(name = "default_rate", nullable = false, precision = 5, scale = 2)
    private BigDecimal defaultRate;

    @Column(name = "price_treatment", nullable = false, length = 16)
    @Enumerated(EnumType.STRING)
    private GstPriceTreatment priceTreatment;

    @Column(nullable = false)
    private boolean enabled = true;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    @Column(name = "active_guard", unique = true)
    @JdbcTypeCode(SqlTypes.TINYINT)
    private Byte activeGuard = 1;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @ManyToOne(fetch = FetchType.LAZY)
    @JdbcTypeCode(SqlTypes.CHAR)
    @JoinColumn(name = "updated_by", columnDefinition = "CHAR(36)")
    private User updatedBy;

    protected GstConfiguration() {}

    public GstConfiguration(BigDecimal defaultRate, GstPriceTreatment priceTreatment, boolean enabled, User updatedBy) {
        this.defaultRate = defaultRate;
        this.priceTreatment = priceTreatment;
        this.enabled = enabled;
        this.updatedBy = updatedBy;
        this.createdAt = Instant.now();
        this.updatedAt = this.createdAt;
    }

    public String getId() { return id; }
    public BigDecimal getDefaultRate() { return defaultRate; }
    public GstPriceTreatment getPriceTreatment() { return priceTreatment; }
    public boolean isEnabled() { return enabled; }
    public boolean isActive() { return active; }
    public void deactivate() { active = false; activeGuard = null; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public User getUpdatedBy() { return updatedBy; }
}
