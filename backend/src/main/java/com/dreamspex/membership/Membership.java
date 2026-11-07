package com.dreamspex.membership;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.User; import jakarta.persistence.*;
import java.time.Instant; import java.util.UUID;
@Entity @Table(name="memberships")
public class Membership {
 @Id private String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="plan_id",nullable=false) private MembershipPlan plan;
 @Column(nullable=false) private String status="ACTIVE";
 @Column(name="starts_at",nullable=false) private Instant startsAt;
 @Column(name="expires_at",nullable=false) private Instant expiresAt;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;}
 public MembershipPlan getPlan(){return plan;} public void setPlan(MembershipPlan v){plan=v;}
 public String getStatus(){return status;} public void setStatus(String v){status=v;}
 public Instant getStartsAt(){return startsAt;} public void setStartsAt(Instant v){startsAt=v;}
 public Instant getExpiresAt(){return expiresAt;} public void setExpiresAt(Instant v){expiresAt=v;}
 public Instant getCreatedAt(){return createdAt;}
}
