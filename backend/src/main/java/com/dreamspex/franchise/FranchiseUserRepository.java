package com.dreamspex.franchise;

import java.util.List;
import java.util.Optional;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface FranchiseUserRepository extends JpaRepository<FranchiseUser, String> {
    Optional<FranchiseUser> findByUserId(String userId);
    List<FranchiseUser> findByStoreId(String storeId);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select link from FranchiseUser link where link.invitationTokenHash = :tokenHash")
    Optional<FranchiseUser> findByInvitationTokenHashForUpdate(@Param("tokenHash") String tokenHash);
}
