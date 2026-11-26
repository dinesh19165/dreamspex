package com.dreamspex.audit;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;

public interface AdminActivityLogRepository extends JpaRepository<AdminActivityLog, String>,
        JpaSpecificationExecutor<AdminActivityLog> {
    @Query("""
            select count(log) from AdminActivityLog log
            where log.activityType = 'LOGIN_SUCCESS' and log.status = 'SUCCESS'
            """)
    long countSuccessfulLogins();

    @Query("""
            select count(log) from AdminActivityLog log
            where log.activityType = 'LOGIN_FAILED' and log.status = 'FAILED'
            """)
    long countFailedLogins();

    @Query("""
            select count(log) from AdminActivityLog log
            where log.module = 'Products'
              and log.activityType in ('CREATE', 'UPDATE', 'DELETE', 'BULK_IMPORT', 'BULK_EXPORT')
            """)
    long countProductChanges();

    void deleteAllByIdInBatch(Iterable<String> ids);
}
