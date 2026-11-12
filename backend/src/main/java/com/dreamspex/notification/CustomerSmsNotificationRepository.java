package com.dreamspex.notification;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CustomerSmsNotificationRepository extends JpaRepository<CustomerSmsNotification, String> {
    boolean existsByEventKey(String eventKey);

    List<CustomerSmsNotification> findTop500ByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            select notification from CustomerSmsNotification notification
            where ((notification.status in ('PENDING', 'FAILED')
                    and notification.attempts < :maxAttempts
                    and notification.nextAttemptAt <= :now)
                or (notification.status = 'PROCESSING' and notification.attempts < :maxAttempts
                    and notification.nextAttemptAt <= :now))
            order by notification.createdAt asc
            """)
    List<CustomerSmsNotification> findReadyForDelivery(@Param("now") Instant now,
                                                        @Param("maxAttempts") int maxAttempts,
                                                        Pageable pageable);

    Optional<CustomerSmsNotification> findByIdAndStatus(String id, String status);
}
