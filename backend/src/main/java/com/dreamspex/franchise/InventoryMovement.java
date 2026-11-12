package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.ProductVariant;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "inventory_movements")
public class InventoryMovement {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "variant_id", nullable = false)
    private ProductVariant variant;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    @Column(name = "movement_type", nullable = false)
    private String movementType;

    @Column(name = "quantity_change", nullable = false)
    private int quantityChange;

    @Column(name = "reference_id")
    private String referenceId;

    @Column(length = 500)
    private String note;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    public String getId() { return id; }
    public Store getStore() { return store; }
    public void setStore(Store value) { store = value; }
    public ProductVariant getVariant() { return variant; }
    public void setVariant(ProductVariant value) { variant = value; }
    public User getPerformedBy() { return performedBy; }
    public void setPerformedBy(User value) { performedBy = value; }
    public String getMovementType() { return movementType; }
    public void setMovementType(String value) { movementType = value; }
    public int getQuantityChange() { return quantityChange; }
    public void setQuantityChange(int value) { quantityChange = value; }
    public String getReferenceId() { return referenceId; }
    public void setReferenceId(String value) { referenceId = value; }
    public String getNote() { return note; }
    public void setNote(String value) { note = value; }
    public Instant getCreatedAt() { return createdAt; }
}
