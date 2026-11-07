package com.dreamspex.shopping.entity;
import com.dreamspex.auth.entity.User;
import jakarta.persistence.*;
import java.time.Instant; import java.util.*;
@Entity @Table(name="carts")
public class Cart {
 @Id private String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
 @Column(nullable=false) private String status="ACTIVE";
 @OneToMany(mappedBy="cart",cascade=CascadeType.ALL,orphanRemoval=true) private List<CartItem> items=new ArrayList<>();
 @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 @Column(name="updated_at",nullable=false) private Instant updatedAt=Instant.now();
 public String getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;} public List<CartItem> getItems(){return items;}
}
