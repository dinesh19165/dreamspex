package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.auth.entity.User;
import jakarta.persistence.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name = "franchise_users")
public class FranchiseUser {
    @Id
    private String id = UUID.randomUUID().toString();

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "store_id", nullable = false)
    private Store store;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt = Instant.now();

    @JdbcTypeCode(SqlTypes.CHAR)
    @Column(name = "invitation_token_hash", length = 64, unique = true)
    private String invitationTokenHash;

    @Column(name = "invitation_expires_at")
    private Instant invitationExpiresAt;

    public String getId() { return id; }
    public Store getStore() { return store; }
    public void setStore(Store value) { store = value; }
    public User getUser() { return user; }
    public void setUser(User value) { user = value; }
    public String getInvitationTokenHash() { return invitationTokenHash; }
    public void setInvitationTokenHash(String value) { invitationTokenHash = value; }
    public Instant getInvitationExpiresAt() { return invitationExpiresAt; }
    public void setInvitationExpiresAt(Instant value) { invitationExpiresAt = value; }
}
