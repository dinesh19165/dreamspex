package com.dreamspex.maintenance;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface MaintenanceSettingsRepository extends JpaRepository<MaintenanceSettings, Long> {
    Optional<MaintenanceSettings> findByConfigKey(String configKey);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select settings from MaintenanceSettings settings where settings.configKey = :configKey")
    Optional<MaintenanceSettings> findByConfigKeyForUpdate(@Param("configKey") String configKey);
}
