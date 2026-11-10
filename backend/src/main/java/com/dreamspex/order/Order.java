package com.dreamspex.order;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.User; import com.dreamspex.admin.Store; import jakarta.persistence.*; import java.math.BigDecimal; import java.time.Instant; import java.util.*;
@Entity @Table(name="orders",uniqueConstraints=@UniqueConstraint(name="uk_orders_user_idempotency",columnNames={"user_id","idempotency_key"}))
public class Order {
 @Id private String id=UUID.randomUUID().toString(); @Column(name="order_number",nullable=false,unique=true) private String orderNumber;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
 @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="fulfillment_store_id") private Store fulfillmentStore;
 @Column(name="address_id",nullable=false) private String addressId; @Column(name="address_snapshot",nullable=false,columnDefinition="json") private String addressSnapshot;
 @Column(nullable=false) private String status="PENDING_PAYMENT"; @Column(name="payment_status",nullable=false) private String paymentStatus="PENDING";
 @Column(nullable=false,precision=12,scale=2) private BigDecimal subtotal; @Column(name="discount_amount",nullable=false,precision=12,scale=2) private BigDecimal discountAmount;
 @Column(name="membership_discount_amount",nullable=false,precision=12,scale=2) private BigDecimal membershipDiscountAmount=BigDecimal.ZERO;
 @Column(name="loyalty_discount_amount",nullable=false,precision=12,scale=2) private BigDecimal loyaltyDiscountAmount=BigDecimal.ZERO;
 @Column(name="loyalty_points_redeemed",nullable=false) private int loyaltyPointsRedeemed;
 @Column(name="shipping_amount",nullable=false,precision=12,scale=2) private BigDecimal shippingAmount; @Column(name="total_amount",nullable=false,precision=12,scale=2) private BigDecimal totalAmount;
 @Column(name="gst_snapshot",columnDefinition="json") private String gstSnapshot;
 @Column(name="coupon_code") private String couponCode; @Column(name="idempotency_key",nullable=false) private String idempotencyKey;
 @OneToMany(mappedBy="order",cascade=CascadeType.ALL,orphanRemoval=true) private List<OrderItem> items=new ArrayList<>();
 @OneToMany(mappedBy="order",cascade=CascadeType.ALL,orphanRemoval=true) @OrderBy("createdAt ASC") private List<OrderStatusHistory> history=new ArrayList<>();
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now(); @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public String getOrderNumber(){return orderNumber;} public void setOrderNumber(String v){orderNumber=v;} public User getUser(){return user;} public void setUser(User v){user=v;}
 public Store getFulfillmentStore(){return fulfillmentStore;} public void setFulfillmentStore(Store value){fulfillmentStore=value;}
 public String getAddressId(){return addressId;} public void setAddressId(String v){addressId=v;} public String getAddressSnapshot(){return addressSnapshot;} public void setAddressSnapshot(String v){addressSnapshot=v;}
 public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getPaymentStatus(){return paymentStatus;} public void setPaymentStatus(String v){paymentStatus=v;}
 public BigDecimal getSubtotal(){return subtotal;} public void setSubtotal(BigDecimal v){subtotal=v;} public BigDecimal getDiscountAmount(){return discountAmount;} public void setDiscountAmount(BigDecimal v){discountAmount=v;}
 public BigDecimal getMembershipDiscountAmount(){return membershipDiscountAmount;} public void setMembershipDiscountAmount(BigDecimal v){membershipDiscountAmount=v;}
 public BigDecimal getLoyaltyDiscountAmount(){return loyaltyDiscountAmount;} public void setLoyaltyDiscountAmount(BigDecimal v){loyaltyDiscountAmount=v;}
 public int getLoyaltyPointsRedeemed(){return loyaltyPointsRedeemed;} public void setLoyaltyPointsRedeemed(int v){loyaltyPointsRedeemed=v;}
 public String getGstSnapshot(){return gstSnapshot;} public void setGstSnapshot(String value){gstSnapshot=value;}
 public BigDecimal getShippingAmount(){return shippingAmount;} public void setShippingAmount(BigDecimal v){shippingAmount=v;} public BigDecimal getTotalAmount(){return totalAmount;} public void setTotalAmount(BigDecimal v){totalAmount=v;}
 public String getCouponCode(){return couponCode;} public void setCouponCode(String v){couponCode=v;} public String getIdempotencyKey(){return idempotencyKey;} public void setIdempotencyKey(String v){idempotencyKey=v;}
 public List<OrderItem> getItems(){return items;} public List<OrderStatusHistory> getHistory(){return history;} public Instant getCreatedAt(){return createdAt;}
}
