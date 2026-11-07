package com.dreamspex.notification;

import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.User; import jakarta.persistence.*;
import java.time.Instant; import java.util.UUID;
@Entity @Table(name="notifications")
public class Notification {
 @Id private String id=UUID.randomUUID().toString();
 @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="user_id",nullable=false) private User user;
 @Column(nullable=false) private String type; @Column(nullable=false) private String title; @Column(nullable=false) private String message;
 @Column(name="read_at") private Instant readAt; @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
 public String getId(){return id;} public User getUser(){return user;} public void setUser(User v){user=v;} public String getType(){return type;} public void setType(String v){type=v;}
 public String getTitle(){return title;} public void setTitle(String v){title=v;} public String getMessage(){return message;} public void setMessage(String v){message=v;}
 public Instant getReadAt(){return readAt;} public void setReadAt(Instant v){readAt=v;} public Instant getCreatedAt(){return createdAt;}
}
