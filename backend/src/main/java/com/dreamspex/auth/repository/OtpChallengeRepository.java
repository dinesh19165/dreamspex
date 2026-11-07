package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.OtpChallenge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import java.time.Instant;
import java.util.Optional;

public interface OtpChallengeRepository extends JpaRepository<OtpChallenge, String> {
    Optional<OtpChallenge> findByIdAndPurpose(String id, String purpose);
    Optional<OtpChallenge> findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(String identifier, String purpose);

    @Modifying
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    @Query("update OtpChallenge challenge set challenge.attempts = challenge.attempts + 1 " +
            "where challenge.id = :id and challenge.verifiedAt is null and challenge.expiresAt > :now and challenge.attempts < 5")
    int incrementAttempts(@Param("id") String id, @Param("now") Instant now);

    @Modifying
    @Query("update OtpChallenge challenge set challenge.verifiedAt = :now " +
            "where challenge.id = :id and challenge.codeHash = :codeHash and challenge.verifiedAt is null " +
            "and challenge.expiresAt > :now and challenge.attempts < 5")
    int consumeIfValid(@Param("id") String id, @Param("codeHash") String codeHash, @Param("now") Instant now);
}
