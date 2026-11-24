package com.dreamspex.maintenance;

import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.dreamspex.maintenance.MaintenanceDtos.*;

@Service
public class MaintenanceService {
    private static final String GLOBAL = "GLOBAL";

    private final MaintenanceSettingsRepository settingsRepository;
    private final MaintenanceAuditLogRepository auditRepository;
    private final CurrentUser currentUser;
    private final ObjectMapper objectMapper;

    public MaintenanceService(MaintenanceSettingsRepository settingsRepository,
                              MaintenanceAuditLogRepository auditRepository,
                              CurrentUser currentUser,
                              ObjectMapper objectMapper) {
        this.settingsRepository = settingsRepository;
        this.auditRepository = auditRepository;
        this.currentUser = currentUser;
        this.objectMapper = objectMapper;
    }

    @Transactional(readOnly = true)
    public MaintenanceSettingsResponse getConfiguration(Authentication authentication) {
        currentUser.require(authentication);
        MaintenanceSettings settings = settingsRepository.findByConfigKey(GLOBAL)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "MAINTENANCE_CONFIGURATION_MISSING",
                        "Maintenance configuration is unavailable."));
        return settingsResponse(settings);
    }

    @Transactional(readOnly = true)
    public MaintenanceStatusResponse publicStatus() {
        MaintenanceSettings settings = settingsRepository.findByConfigKey(GLOBAL)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "MAINTENANCE_CONFIGURATION_MISSING",
                        "Maintenance configuration is unavailable."));
        boolean active = effectiveActive(settings, Instant.now());
        return new MaintenanceStatusResponse(
                active,
                settings.getMaintenanceType(),
                normalizeScope(settings.getTargetScope()),
                settings.getTitle(),
                settings.getMessage(),
                settings.getStartAt(),
                settings.getEndAt());
    }

    @Transactional
    public MaintenanceSettingsResponse update(Authentication authentication, MaintenanceUpdateRequest request) {
        User actor = currentUser.require(authentication);
        MaintenanceSettings settings = lockedSettings();
        validateSchedule(request.startAt(), request.endAt());
        Map<String, Object> previous = snapshot(settings);

        settings.setMaintenanceType(request.maintenanceType());
        settings.setTargetScope(request.targetScope());
        settings.setTitle(blankToDefault(request.title(), "DreamSpex Maintenance"));
        settings.setMessage(blankToDefault(request.message(),
                "We are currently performing maintenance. Please try again later."));
        settings.setStartAt(request.startAt());
        settings.setEndAt(request.endAt());
        settings.setAdminBypass(Boolean.TRUE.equals(request.adminBypass()));
        settings.setActive(Boolean.TRUE.equals(request.isActive()));
        settings.setUpdatedBy(actor);
        settingsRepository.save(settings);
        recordAudit(settings, actor, "UPDATE", previous, snapshot(settings), request.remarks());
        return settingsResponse(settings);
    }

    @Transactional
    public MaintenanceSettingsResponse activate(Authentication authentication, MaintenanceActionRequest request) {
        User actor = currentUser.require(authentication);
        MaintenanceSettings settings = lockedSettings();
        Map<String, Object> previous = snapshot(settings);
        Instant now = Instant.now();

        settings.setActive(true);
        settings.setStartAt(now);
        if (settings.getEndAt() != null && !settings.getEndAt().isAfter(now)) {
            settings.setEndAt(null);
        }
        settings.setUpdatedBy(actor);
        settingsRepository.save(settings);
        recordAudit(settings, actor, "ACTIVATE", previous, snapshot(settings), request == null ? null : request.remarks());
        return settingsResponse(settings);
    }

    @Transactional
    public MaintenanceSettingsResponse deactivate(Authentication authentication, MaintenanceActionRequest request) {
        User actor = currentUser.require(authentication);
        MaintenanceSettings settings = lockedSettings();
        Map<String, Object> previous = snapshot(settings);

        settings.setActive(false);
        settings.setStartAt(null);
        settings.setEndAt(null);
        settings.setUpdatedBy(actor);
        settingsRepository.save(settings);
        recordAudit(settings, actor, "DEACTIVATE", previous, snapshot(settings),
                request == null ? null : request.remarks());
        return settingsResponse(settings);
    }

    @Transactional(readOnly = true)
    public List<MaintenanceAuditResponse> auditLogs(Authentication authentication) {
        currentUser.require(authentication);
        MaintenanceSettings settings = settingsRepository.findByConfigKey(GLOBAL).orElse(null);
        Long maintenanceId = settings == null ? null : settings.getId();
        List<MaintenanceAuditLog> logs = maintenanceId == null
                ? auditRepository.findAllByOrderByPerformedAtDesc()
                : auditRepository.findByMaintenanceIdOrderByPerformedAtDesc(maintenanceId);
        return logs.stream().map(this::auditResponse).toList();
    }

    @Scheduled(fixedDelayString = "${dreamspex.maintenance.reconcile-delay-ms:30000}")
    @Transactional
    public void reconcileSchedules() {
        settingsRepository.findByConfigKeyForUpdate(GLOBAL).ifPresent(settings -> {
            Instant now = Instant.now();
            if (settings.isActive() && settings.getEndAt() != null && !now.isBefore(settings.getEndAt())) {
                Map<String, Object> previous = snapshot(settings);
                settings.setActive(false);
                settings.setUpdatedAt(now);
                settingsRepository.save(settings);
                recordAudit(settings, null, "SYSTEM_EXPIRE", previous, snapshot(settings),
                        "Automatically expired by the maintenance schedule.");
            }
        });
    }

    private MaintenanceSettings lockedSettings() {
        return settingsRepository.findByConfigKeyForUpdate(GLOBAL)
                .orElseThrow(() -> new ApiException(HttpStatus.SERVICE_UNAVAILABLE,
                        "MAINTENANCE_CONFIGURATION_MISSING",
                        "Maintenance configuration is unavailable."));
    }

    private boolean effectiveActive(MaintenanceSettings settings, Instant now) {
        if (!settings.isActive()) return false;
        if (settings.getStartAt() != null && now.isBefore(settings.getStartAt())) return false;
        if (settings.getEndAt() != null && !now.isBefore(settings.getEndAt())) return false;
        return true;
    }

    private void validateSchedule(Instant startAt, Instant endAt) {
        if (startAt != null && endAt != null && !endAt.isAfter(startAt)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,
                    "INVALID_MAINTENANCE_SCHEDULE",
                    "Maintenance end time must be after the start time.");
        }
    }

    private MaintenanceSettingsResponse settingsResponse(MaintenanceSettings settings) {
        Instant now = Instant.now();
        boolean effective = effectiveActive(settings, now);
        User createdBy = settings.getCreatedBy();
        User updatedBy = settings.getUpdatedBy();
        return new MaintenanceSettingsResponse(
                settings.getId(),
                settings.isActive(),
                effective,
                settings.getMaintenanceType(),
                normalizeScope(settings.getTargetScope()),
                settings.getTitle(),
                settings.getMessage(),
                settings.getStartAt(),
                settings.getEndAt(),
                settings.isAdminBypass(),
                settings.getCreatedAt(),
                settings.getUpdatedAt(),
                createdBy == null ? null : createdBy.getId(),
                updatedBy == null ? null : updatedBy.getId());
    }

    private MaintenanceAuditResponse auditResponse(MaintenanceAuditLog audit) {
        User actor = audit.getPerformedBy();
        return new MaintenanceAuditResponse(
                audit.getId(),
                audit.getMaintenance() == null ? null : audit.getMaintenance().getId(),
                audit.getAction(),
                audit.getPreviousValues(),
                audit.getNewValues(),
                actor == null ? null : actor.getId(),
                actor == null ? null : actor.getDisplayName(),
                audit.getPerformedAt(),
                audit.getRemarks());
    }

    private void recordAudit(MaintenanceSettings settings, User actor, String action,
                             Map<String, Object> previous, Map<String, Object> current,
                             String remarks) {
        MaintenanceAuditLog audit = new MaintenanceAuditLog();
        audit.setMaintenance(settings);
        audit.setAction(action);
        audit.setPreviousValues(toJson(previous));
        audit.setNewValues(toJson(current));
        audit.setPerformedBy(actor);
        audit.setRemarks(remarks);
        auditRepository.save(audit);
    }

    private Map<String, Object> snapshot(MaintenanceSettings settings) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("isActive", settings.isActive());
        values.put("maintenanceType", settings.getMaintenanceType());
        values.put("targetScope", settings.getTargetScope());
        values.put("title", settings.getTitle());
        values.put("message", settings.getMessage());
        values.put("startAt", settings.getStartAt());
        values.put("endAt", settings.getEndAt());
        values.put("adminBypass", settings.isAdminBypass());
        return values;
    }

    private String toJson(Map<String, Object> values) {
        try {
            return objectMapper.writeValueAsString(values);
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,
                    "MAINTENANCE_AUDIT_SERIALIZATION_FAILED",
                    "Maintenance audit data could not be recorded.");
        }
    }

    private static String blankToDefault(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }

    private static String normalizeScope(String scope) {
        return "APP".equals(scope) ? "WEB" : scope;
    }
}
