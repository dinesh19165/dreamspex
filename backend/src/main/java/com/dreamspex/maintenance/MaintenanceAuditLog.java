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
import jakarta.persistence.Table;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.Instant;

@Entity
@Table(name = "maintenance_audit_logs")
public class MaintenanceAuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "maintenance_id")
    private MaintenanceSettings maintenance;

    @Column(nullable = false, length = 30)
    private String action;

    @Column(name = "previous_values", columnDefinition = "JSON")
    private String previousValues;

    @Column(name = "new_values", columnDefinition = "JSON")
    private String newValues;

    @ManyToOne(fetch = FetchType.LAZY)
    @JdbcTypeCode(SqlTypes.CHAR)
    @JoinColumn(name = "performed_by", columnDefinition = "CHAR(36)")
    private User performedBy;

    @Column(name = "performed_at", nullable = false)
    private Instant performedAt = Instant.now();

    @Column(length = 500)
    private String remarks;

    public Long getId() { return id; }
    public MaintenanceSettings getMaintenance() { return maintenance; }
    public void setMaintenance(MaintenanceSettings maintenance) { this.maintenance = maintenance; }
    public String getAction() { return action; }
    public void setAction(String action) { this.action = action; }
    public String getPreviousValues() { return previousValues; }
    public void setPreviousValues(String previousValues) { this.previousValues = previousValues; }
    public String getNewValues() { return newValues; }
    public void setNewValues(String newValues) { this.newValues = newValues; }
    public User getPerformedBy() { return performedBy; }
    public void setPerformedBy(User performedBy) { this.performedBy = performedBy; }
    public Instant getPerformedAt() { return performedAt; }
    public String getRemarks() { return remarks; }
    public void setRemarks(String remarks) { this.remarks = remarks; }
}
