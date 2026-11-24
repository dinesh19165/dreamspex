package com.dreamspex.maintenance;

import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface MaintenanceAuditLogRepository extends JpaRepository<MaintenanceAuditLog, Long> {
    List<MaintenanceAuditLog> findAllByOrderByPerformedAtDesc();

    List<MaintenanceAuditLog> findByMaintenanceIdOrderByPerformedAtDesc(Long maintenanceId);
}
