package com.dreamspex.delivery;
import com.dreamspex.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_batch_order_history")
public class DeliveryBatchOrderHistory {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_order_id", nullable = false)
    private DeliveryBatchOrder batchOrder;

    @Column(name = "previous_status", length = 24)
    private String previousStatus;

    @Column(name = "new_status", nullable = false, length = 24)
    private String newStatus;

    @Column(length = 500)
    private String note;

    @Column(nullable = false, length = 24)
    private String source;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "changed_by")
    private User changedBy;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public void setBatchOrder(DeliveryBatchOrder value) { batchOrder = value; }
    public void setPreviousStatus(String value) { previousStatus = value; }
    public void setNewStatus(String value) { newStatus = value; }
    public void setNote(String value) { note = value; }
    public void setSource(String value) { source = value; }
    public void setChangedBy(User value) { changedBy = value; }
    public String getPreviousStatus() { return previousStatus; }
    public String getNewStatus() { return newStatus; }
    public String getNote() { return note; }
    public String getSource() { return source; }
    public Instant getCreatedAt() { return createdAt; }
}
