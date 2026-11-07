package com.dreamspex.delivery;
import com.dreamspex.auth.entity.User;
import jakarta.persistence.Column;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Entity
@Table(name = "delivery_batches")
public class DeliveryBatch {
    @Id
    private String id = UUID.randomUUID().toString();

    @Column(name = "route_name", nullable = false, length = 120)
    private String routeName;

    @Column(nullable = false, length = 24)
    private String status = "OPEN";

    @Column(name = "operation_type", nullable = false, length = 32)
    private String operationType = "NORMAL_DELIVERY";

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private User createdBy;

    @OneToMany(mappedBy = "batch", cascade = {CascadeType.PERSIST, CascadeType.MERGE}, orphanRemoval = true)
    @OrderBy("createdAt ASC")
    private List<DeliveryBatchOrder> orders = new ArrayList<>();

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    public String getId() { return id; }
    public String getRouteName() { return routeName; }
    public void setRouteName(String value) { routeName = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public String getOperationType() { return operationType; }
    public void setOperationType(String value) { operationType = value; }
    public User getCreatedBy() { return createdBy; }
    public void setCreatedBy(User value) { createdBy = value; }
    public List<DeliveryBatchOrder> getOrders() { return orders; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
