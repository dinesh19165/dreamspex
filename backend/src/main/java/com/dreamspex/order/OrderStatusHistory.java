package com.dreamspex.order;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.User; import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="order_status_history")
public class OrderStatusHistory {
 @Id private String id=UUID.randomUUID().toString(); @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="order_id",nullable=false) private Order order;
 @Column(nullable=false) private String status; private String note; @ManyToOne(fetch=FetchType.LAZY) @JoinColumn(name="changed_by") private User changedBy;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 public void setOrder(Order v){order=v;} public String getStatus(){return status;} public void setStatus(String v){status=v;} public String getNote(){return note;} public void setNote(String v){note=v;} public void setChangedBy(User v){changedBy=v;} public Instant getCreatedAt(){return createdAt;}
}
