package com.dreamspex.notification;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import jakarta.persistence.LockModeType;

public interface AdminAlertScanStateRepository extends JpaRepository<AdminAlertScanState, Integer> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select state from AdminAlertScanState state where state.id = 1")
    Optional<AdminAlertScanState> findForUpdate();
}
