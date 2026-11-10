package com.dreamspex.notification;

import java.util.List;
import java.util.Collection;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface AdminAlertRepository extends JpaRepository<AdminAlert, String> {
    Optional<AdminAlert> findBySourceTypeAndSourceId(String sourceType, String sourceId);
    List<AdminAlert> findBySourceTypeAndSourceIdIn(String sourceType, Collection<String> sourceIds);
    List<AdminAlert> findTop100ByOrderByEventAtDesc();
    List<AdminAlert> findByAcknowledgedAtIsNullAndResolvedAtIsNull();
    List<AdminAlert> findByAcknowledgedAtIsNullAndResolvedAtIsNullOrderByEventAtDesc();
}
