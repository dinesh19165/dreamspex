package com.dreamspex.membership;
import jakarta.persistence.*;
import java.math.BigDecimal; import java.time.Instant; import java.util.*;
@Entity @Table(name="membership_plans")
public class MembershipPlan {
 @Id private String id=UUID.randomUUID().toString();
 @Column(nullable=false) private String name; @Column(nullable=false) private String description;
 @Column(nullable=false,precision=12,scale=2) private BigDecimal price;
 @Column(name="discount_percentage",precision=5,scale=2) private BigDecimal discountPercentage;
 @Column(nullable=false) private boolean recommended;
 @Column(name="duration_days",nullable=false) private int durationDays;
 @Column(columnDefinition="json") private String perks="[]";
 @Column(nullable=false) private String status="ACTIVE";
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public String getName(){return name;} public void setName(String v){name=v;}
 public String getDescription(){return description;} public void setDescription(String v){description=v;}
 public BigDecimal getPrice(){return price;} public void setPrice(BigDecimal v){price=v;}
 public BigDecimal getDiscountPercentage(){return discountPercentage;} public void setDiscountPercentage(BigDecimal v){discountPercentage=v;}
 public boolean isRecommended(){return recommended;} public void setRecommended(boolean v){recommended=v;}
 public int getDurationDays(){return durationDays;} public void setDurationDays(int v){durationDays=v;}
 public String getPerks(){return perks;} public void setPerks(String v){perks=v;}
 public String getStatus(){return status;} public void setStatus(String v){status=v;}
}
