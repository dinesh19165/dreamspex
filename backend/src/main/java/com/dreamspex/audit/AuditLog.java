package com.dreamspex.audit;
import com.dreamspex.auth.entity.User;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "audit_logs")
public class AuditLog {
    @Id
    private String id = UUID.randomUUID().toString();
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_user_id")
    private User actor;
    @Column(nullable = false)
    private String action;
    @Column(name = "resource_type")
    private String resourceType;
    @Column(name = "resource_id")
    private String resourceId;
    @Column(name = "request_id")
    private String requestId;
    @Column(name = "ip_address")
    private String ipAddress;
    @Column(name = "user_agent")
    private String userAgent;
    @Column(columnDefinition = "json")
    private String details;
    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public void setActor(User actor) { this.actor = actor; }
    public void setAction(String action) { this.action = action; }
    public void setResourceType(String value) { resourceType = value; }
    public void setResourceId(String value) { resourceId = value; }
    public void setRequestId(String value) { requestId = value; }
    public void setIpAddress(String value) { ipAddress = value; }
    public void setUserAgent(String value) { userAgent = value; }
    public void setDetails(String value) { details = value; }
    public String getId() { return id; }
    public String getAction() { return action; }
    public String getResourceType() { return resourceType; }
    public String getResourceId() { return resourceId; }
    public String getRequestId() { return requestId; }
    public String getIpAddress() { return ipAddress; }
    public Instant getCreatedAt() { return createdAt; }
}
