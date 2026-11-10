package com.dreamspex.notification;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "admin_alerts", uniqueConstraints = {
        @UniqueConstraint(name = "uk_admin_alert_source", columnNames = {"source_type", "source_id"})
})
public class AdminAlert {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "source_type", nullable = false, length = 24)
    private String sourceType;

    @Column(name = "source_id", nullable = false)
    private String sourceId;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(name = "customer_name", nullable = false)
    private String customerName;

    @Column(name = "order_id", nullable = false)
    private String orderId;

    @Column(name = "order_number", nullable = false, length = 40)
    private String orderNumber;

    @Column(name = "event_at", nullable = false)
    private Instant eventAt;

    @Column(name = "acknowledged_at")
    private Instant acknowledgedAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public String getSourceType() { return sourceType; }
    public void setSourceType(String value) { sourceType = value; }
    public String getSourceId() { return sourceId; }
    public void setSourceId(String value) { sourceId = value; }
    public String getTitle() { return title; }
    public void setTitle(String value) { title = value; }
    public String getCustomerName() { return customerName; }
    public void setCustomerName(String value) { customerName = value; }
    public String getOrderId() { return orderId; }
    public void setOrderId(String value) { orderId = value; }
    public String getOrderNumber() { return orderNumber; }
    public void setOrderNumber(String value) { orderNumber = value; }
    public Instant getEventAt() { return eventAt; }
    public void setEventAt(Instant value) { eventAt = value; }
    public Instant getAcknowledgedAt() { return acknowledgedAt; }
    public void setAcknowledgedAt(Instant value) { acknowledgedAt = value; }
    public Instant getResolvedAt() { return resolvedAt; }
    public void setResolvedAt(Instant value) { resolvedAt = value; }
    public Instant getCreatedAt() { return createdAt; }
}
