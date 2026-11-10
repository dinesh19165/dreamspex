package com.dreamspex.gst;

import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface GstConfigurationRepository extends JpaRepository<GstConfiguration, String> {
    Optional<GstConfiguration> findFirstByActiveTrueOrderByUpdatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select configuration from GstConfiguration configuration where configuration.active = true")
    Optional<GstConfiguration> findActiveForUpdate();

    List<GstConfiguration> findAllByOrderByUpdatedAtDesc();
}
