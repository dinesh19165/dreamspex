package com.dreamspex.franchise;

import com.dreamspex.order.Order;
import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "franchise_inventory_reservations",
        uniqueConstraints = @UniqueConstraint(name = "uk_franchise_reservation_order_inventory", columnNames = {"order_id", "inventory_id"}))
public class FranchiseInventoryReservation {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "order_id", nullable = false)
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "inventory_id", nullable = false)
    private FranchiseInventory inventory;

    @Column(nullable = false)
    private int quantity;

    @Column(nullable = false)
    private String status;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public Order getOrder() { return order; }
    public void setOrder(Order value) { order = value; }
    public FranchiseInventory getInventory() { return inventory; }
    public void setInventory(FranchiseInventory value) { inventory = value; }
    public int getQuantity() { return quantity; }
    public void setQuantity(int value) { quantity = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; updatedAt = Instant.now(); }
}
