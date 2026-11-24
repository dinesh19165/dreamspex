package com.dreamspex.maintenance;

import com.dreamspex.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "maintenance_settings")
public class MaintenanceSettings {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "config_key", nullable = false, unique = true, length = 50)
    private String configKey = "GLOBAL";

    @Column(name = "is_active", nullable = false)
    private boolean active;

    @Column(name = "maintenance_type", nullable = false, length = 40)
    private String maintenanceType = "FULL_SYSTEM";

    @Column(name = "target_scope", nullable = false, length = 20)
    private String targetScope = "ALL";

    @Column(length = 200)
    private String title = "DreamSpex Maintenance";

    @Column(columnDefinition = "TEXT")
    private String message = "We are currently performing maintenance. Please try again later.";

    @Column(name = "start_at")
    private Instant startAt;

    @Column(name = "end_at")
    private Instant endAt;

    @Column(name = "admin_bypass", nullable = false)
    private boolean adminBypass = true;

    @ManyToOne(fetch = FetchType.LAZY)
    @JdbcTypeCode(SqlTypes.CHAR)
    @JoinColumn(name = "created_by", columnDefinition = "CHAR(36)")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JdbcTypeCode(SqlTypes.CHAR)
    @JoinColumn(name = "updated_by", columnDefinition = "CHAR(36)")
    private User updatedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public Long getId() { return id; }
    public String getConfigKey() { return configKey; }
    public void setConfigKey(String configKey) { this.configKey = configKey; }
    public boolean isActive() { return active; }
    public void setActive(boolean active) { this.active = active; }
    public String getMaintenanceType() { return maintenanceType; }
    public void setMaintenanceType(String maintenanceType) { this.maintenanceType = maintenanceType; }
    public String getTargetScope() { return targetScope; }
    public void setTargetScope(String targetScope) { this.targetScope = targetScope; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getMessage() { return message; }
    public void setMessage(String message) { this.message = message; }
    public Instant getStartAt() { return startAt; }
    public void setStartAt(Instant startAt) { this.startAt = startAt; }
    public Instant getEndAt() { return endAt; }
    public void setEndAt(Instant endAt) { this.endAt = endAt; }
    public boolean isAdminBypass() { return adminBypass; }
    public void setAdminBypass(boolean adminBypass) { this.adminBypass = adminBypass; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User createdBy) { this.createdBy = createdBy; }
    public User getUpdatedBy() { return updatedBy; }
    public void setUpdatedBy(User updatedBy) { this.updatedBy = updatedBy; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant updatedAt) { this.updatedAt = updatedAt; }

    @PrePersist
    void initializeTimestamps() {
        Instant now = Instant.now();
        if (createdAt == null) createdAt = now;
        if (updatedAt == null) updatedAt = now;
    }

    @PreUpdate
    void updateTimestamp() {
        updatedAt = Instant.now();
    }
}
