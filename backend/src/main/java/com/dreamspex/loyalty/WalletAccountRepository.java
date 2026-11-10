package com.dreamspex.loyalty;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface WalletAccountRepository extends JpaRepository<WalletAccount, String> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select a from WalletAccount a where a.userId = :userId")
    Optional<WalletAccount> findByUserIdForUpdate(@Param("userId") String userId);
}
