package com.dreamspex.delivery;

import com.dreamspex.order.Order;
import com.dreamspex.returns.ReturnRequest;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Version;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "delivery_batch_orders")
public class DeliveryBatchOrder {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "batch_id", nullable = false)
    private DeliveryBatch batch;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "order_id")
    private Order order;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "return_request_id")
    private ReturnRequest returnRequest;

    @Column(name = "active_order_id", unique = true)
    private String activeOrderId;

    @Column(name = "active_return_request_id", unique = true)
    private String activeReturnRequestId;

    @Column(nullable = false, length = 24)
    private String status = "PENDING";

    @Column(name = "delivery_otp_hash", nullable = false, length = 64)
    private String deliveryOtpHash;

    @Column(name = "otp_attempts", nullable = false)
    private int otpAttempts;

    @Column(name = "otp_expires_at", nullable = false)
    private Instant otpExpiresAt;

    @Column(name = "otp_consumed_at")
    private Instant otpConsumedAt;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt = Instant.now();

    @Version
    @Column(nullable = false)
    private long version;

    public String getId() { return id; }
    public DeliveryBatch getBatch() { return batch; }
    public void setBatch(DeliveryBatch value) { batch = value; }
    public Order getOrder() { return order; }
    public void setOrder(Order value) { order = value; }
    public ReturnRequest getReturnRequest() { return returnRequest; }
    public void setReturnRequest(ReturnRequest value) { returnRequest = value; }
    public String getActiveOrderId() { return activeOrderId; }
    public void setActiveOrderId(String value) { activeOrderId = value; }
    public String getActiveReturnRequestId() { return activeReturnRequestId; }
    public void setActiveReturnRequestId(String value) { activeReturnRequestId = value; }
    public String getStatus() { return status; }
    public void setStatus(String value) { status = value; }
    public String getDeliveryOtpHash() { return deliveryOtpHash; }
    public void setDeliveryOtpHash(String value) { deliveryOtpHash = value; }
    public int getOtpAttempts() { return otpAttempts; }
    public void setOtpAttempts(int value) { otpAttempts = value; }
    public void incrementOtpAttempts() { otpAttempts++; }
    public Instant getOtpExpiresAt() { return otpExpiresAt; }
    public void setOtpExpiresAt(Instant value) { otpExpiresAt = value; }
    public Instant getOtpConsumedAt() { return otpConsumedAt; }
    public void setOtpConsumedAt(Instant value) { otpConsumedAt = value; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(Instant value) { updatedAt = value; }
}
