package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.OtpChallenge;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Optional;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, String> {
    Optional<OtpChallenge> findByIdAndPurpose(String id, String purpose);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select challenge from OtpChallenge challenge where challenge.id = :id and challenge.purpose = :purpose")
    Optional<OtpChallenge> findByIdAndPurposeForUpdate(@Param("id") String id,
                                                       @Param("purpose") String purpose);
    Optional<OtpChallenge> findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(String identifier, String purpose);
    Optional<OtpChallenge> findFirstByUserIdAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
            String userId, String purpose);
    Optional<OtpChallenge> findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
            String identifier, String purpose, Instant now);
    Optional<OtpChallenge> findFirstByIdentifierAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
            String identifier, String purpose);
    Optional<OtpChallenge> findFirstByIdentifierAndPurposeAndLockedUntilAfterOrderByCreatedAtDesc(
            String identifier, String purpose, Instant now);
    long countByIdentifierAndPurposeAndCreatedAtAfter(String identifier, String purpose, Instant after);
    boolean existsByIdAndVerifiedAtIsNotNull(String id);

    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("update OtpChallenge challenge set challenge.attempts = challenge.attempts + 1 " +
            "where challenge.id = :id and challenge.verifiedAt is null and challenge.expiresAt > :now and challenge.attempts < 5")
    int incrementAttempts(@Param("id") String id, @Param("now") Instant now);

    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("update OtpChallenge challenge set challenge.attempts = challenge.attempts + 1, " +
            "challenge.lockedUntil = case when challenge.attempts + 1 >= 5 then :blockedUntil else challenge.lockedUntil end " +
            "where challenge.id = :id and challenge.purpose = 'PASSWORD_RESET' " +
            "and challenge.verifiedAt is null and challenge.expiresAt > :now and challenge.attempts < 5")
    int incrementPasswordResetAttempts(@Param("id") String id, @Param("now") Instant now,
                                       @Param("blockedUntil") Instant blockedUntil);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.verifiedAt = :now " +
            "where challenge.id = :id and challenge.codeHash = :codeHash and challenge.verifiedAt is null " +
            "and challenge.expiresAt > :now and challenge.attempts < 5")
    int consumeIfValid(@Param("id") String id, @Param("codeHash") String codeHash, @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.verifiedAt = coalesce(challenge.verifiedAt, :now), " +
            "challenge.codeHash = null, challenge.expiresAt = :now, challenge.updatedAt = :now " +
            "where challenge.id = :id and challenge.purpose = 'PASSWORD_RESET' " +
            "and challenge.codeHash = :codeHash and challenge.expiresAt > :now")
    int consumeResetToken(@Param("id") String id, @Param("codeHash") String codeHash, @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.verifiedAt = :now " +
            "where challenge.id = :id and challenge.userId = :userId and challenge.purpose = 'REGISTRATION' " +
            "and challenge.deliveryChannel = 'SMS' and challenge.providerRequestId = :requestId " +
            "and challenge.verifiedAt is null and challenge.expiresAt > :now and challenge.attempts < 5")
    int consumeWidgetIfValid(@Param("id") String id, @Param("userId") String userId,
                             @Param("requestId") String requestId, @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.verifiedAt = :now " +
            "where challenge.id = :id and challenge.purpose = 'PASSWORD_RESET' " +
            "and challenge.deliveryChannel = 'SMS' and challenge.providerRequestId = :requestId " +
            "and challenge.verifiedAt is null and challenge.expiresAt > :now and challenge.attempts < 5")
    int consumeResetWidgetIfValid(@Param("id") String id, @Param("requestId") String requestId,
                                 @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.expiresAt = :now, challenge.updatedAt = :now " +
            "where challenge.identifier = :identifier and challenge.purpose = :purpose " +
            "and challenge.verifiedAt is null and challenge.expiresAt > :now")
    int expirePendingByIdentifierAndPurpose(@Param("identifier") String identifier,
                                            @Param("purpose") String purpose,
                                            @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.expiresAt = :now, " +
            "challenge.verifiedAt = coalesce(challenge.verifiedAt, :now), challenge.updatedAt = :now " +
            "where challenge.userId = :userId and challenge.purpose = 'PASSWORD_RESET'")
    int expireAllPasswordResetChallenges(@Param("userId") String userId, @Param("now") Instant now);
}
