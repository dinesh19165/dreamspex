package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.RefreshToken;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.time.Instant;
import java.util.Optional;

public interface RefreshTokenRepository extends JpaRepository<RefreshToken, String> {
    Optional<RefreshToken> findByTokenHash(String tokenHash);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :revokedAt, token.replacedById = :replacedById " +
            "where token.id = :id and token.revokedAt is null")
    int revokeIfActive(@Param("id") String id, @Param("revokedAt") Instant revokedAt,
                       @Param("replacedById") String replacedById);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :revokedAt " +
            "where token.familyId = :familyId and token.revokedAt is null")
    int revokeFamily(@Param("familyId") String familyId, @Param("revokedAt") Instant revokedAt);

    @Modifying
    @Query("update RefreshToken token set token.revokedAt = :revokedAt " +
            "where token.user.id = :userId and token.revokedAt is null")
    int revokeUserTokens(@Param("userId") String userId, @Param("revokedAt") Instant revokedAt);
}
