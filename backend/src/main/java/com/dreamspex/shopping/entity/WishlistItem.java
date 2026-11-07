package com.dreamspex.shopping.entity;

import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.auth.entity.User; import com.dreamspex.catalog.entity.ProductVariant;
import jakarta.persistence.*; import java.time.Instant; import java.util.UUID;
@Entity @Table(name="wishlist_items")
public class WishlistItem {
 @Id private String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="variant_id",nullable=false) private ProductVariant variant;
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 public String getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;} public ProductVariant getVariant(){return variant;} public void setVariant(ProductVariant v){variant=v;}
}
