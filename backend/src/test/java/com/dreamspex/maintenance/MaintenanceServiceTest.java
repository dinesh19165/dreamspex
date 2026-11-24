package com.dreamspex.maintenance;

import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.time.Instant;
import java.util.Optional;
import java.lang.reflect.RecordComponent;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.never;
import org.mockito.ArgumentCaptor;

import static com.dreamspex.maintenance.MaintenanceDtos.*;

class MaintenanceServiceTest {
    private MaintenanceSettingsRepository settingsRepository;
    private MaintenanceAuditLogRepository auditRepository;
    private CurrentUser currentUser;
    private MaintenanceService service;
    private Authentication authentication;
    private User actor;
    private MaintenanceSettings settings;

    @BeforeEach
    void setUp() {
        settingsRepository = mock(MaintenanceSettingsRepository.class);
        auditRepository = mock(MaintenanceAuditLogRepository.class);
        currentUser = mock(CurrentUser.class);
        service = new MaintenanceService(settingsRepository, auditRepository, currentUser,
                new ObjectMapper().findAndRegisterModules());
        authentication = mock(Authentication.class);
        actor = new User();
        actor.setDisplayName("Maintenance Admin");
        settings = new MaintenanceSettings();
        settings.setCreatedBy(actor);
        when(currentUser.require(authentication)).thenReturn(actor);
        when(settingsRepository.findByConfigKey("GLOBAL")).thenReturn(Optional.of(settings));
        when(settingsRepository.findByConfigKeyForUpdate("GLOBAL")).thenReturn(Optional.of(settings));
        when(settingsRepository.save(any(MaintenanceSettings.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        when(auditRepository.save(any(MaintenanceAuditLog.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
    }

    @Test
    void defaultConfigurationIsInactive() {
        MaintenanceStatusResponse status = service.publicStatus();

        assertFalse(status.maintenanceActive());
        assertEquals("FULL_SYSTEM", status.maintenanceType());
        assertEquals("ALL", status.targetScope());
    }

    @Test
    void activationCreatesAuditAndMakesStatusActive() {
        MaintenanceSettingsResponse response = service.activate(authentication,
                new MaintenanceActionRequest("Scheduled change"));

        assertTrue(response.isActive());
        assertTrue(response.maintenanceActive());
        assertTrue(settings.isActive());
        verify(auditRepository).save(any(MaintenanceAuditLog.class));
    }

    @Test
    void deactivationCreatesAuditAndStopsMaintenance() {
        service.activate(authentication, new MaintenanceActionRequest("Start"));
        MaintenanceSettingsResponse response = service.deactivate(authentication,
                new MaintenanceActionRequest("Stop"));

        assertFalse(response.isActive());
        assertFalse(response.maintenanceActive());
        assertFalse(settings.isActive());
        verify(auditRepository, times(2)).save(any(MaintenanceAuditLog.class));
    }

    @Test
    void rejectsEndTimeAtOrBeforeStartTime() {
        Instant start = Instant.parse("2026-11-24T18:00:00Z");
        MaintenanceUpdateRequest request = new MaintenanceUpdateRequest(
                true, "PAYMENT", "WEB", "Payment Maintenance", "Payments are paused",
                start, start, true, "Schedule update");

        ApiException exception = assertThrows(ApiException.class,
                () -> service.update(authentication, request));

        assertEquals("INVALID_MAINTENANCE_SCHEDULE", exception.code());
    }

    @Test
    void expiredMaintenanceIsAutomaticallyInactive() {
        Instant now = Instant.now();
        settings.setActive(true);
        settings.setStartAt(now.minusSeconds(3600));
        settings.setEndAt(now.minusSeconds(60));

        MaintenanceStatusResponse status = service.publicStatus();

        assertFalse(status.maintenanceActive());
    }

    @Test
    void reconcileSchedulesPersistsExpiryAndCreatesSystemAudit() {
        Instant now = Instant.now();
        settings.setActive(true);
        settings.setStartAt(now.minusSeconds(7200));
        settings.setEndAt(now.minusSeconds(60));

        service.reconcileSchedules();

        assertFalse(settings.isActive());
        verify(settingsRepository).save(settings);
        ArgumentCaptor<MaintenanceAuditLog> auditCaptor =
                ArgumentCaptor.forClass(MaintenanceAuditLog.class);
        verify(auditRepository).save(auditCaptor.capture());
        MaintenanceAuditLog audit = auditCaptor.getValue();
        assertEquals("SYSTEM_EXPIRE", audit.getAction());
        assertTrue(audit.getPreviousValues().contains("\"isActive\":true"));
        assertTrue(audit.getNewValues().contains("\"isActive\":false"));
    }

    @Test
    void reconcileSchedulesUsesPessimisticLockLookup() {
        settings.setActive(false);

        service.reconcileSchedules();

        verify(settingsRepository).findByConfigKeyForUpdate("GLOBAL");
    }

    @Test
    void configurationReadDoesNotPersistOrMutateState() {
        settings.setActive(true);
        settings.setEndAt(Instant.now().minusSeconds(60));

        MaintenanceSettingsResponse response = service.getConfiguration(authentication);

        assertTrue(response.isActive());
        assertFalse(response.maintenanceActive());
        verify(settingsRepository, never()).save(any(MaintenanceSettings.class));
        assertTrue(settings.isActive());
    }

    @Test
    void publicStatusExposesOnlyPublicFields() {
        MaintenanceStatusResponse status = service.publicStatus();

        for (RecordComponent component : MaintenanceStatusResponse.class.getRecordComponents()) {
            assertTrue(java.util.Set.of(
                    "maintenanceActive", "maintenanceType", "targetScope",
                    "title", "message", "startAt", "endAt").contains(component.getName()));
        }
        assertEquals(7, MaintenanceStatusResponse.class.getRecordComponents().length);
    }

    @Test
    void scheduledFutureMaintenanceIsNotYetActive() {
        settings.setActive(true);
        settings.setStartAt(Instant.now().plusSeconds(3600));
        settings.setEndAt(Instant.now().plusSeconds(7200));

        MaintenanceStatusResponse status = service.publicStatus();

        assertFalse(status.maintenanceActive());
    }

    @Test
    void activeWindowIsEffectiveBetweenStartAndBeforeEnd() {
        Instant now = Instant.now();
        settings.setActive(true);
        settings.setStartAt(now.minusSeconds(60));
        settings.setEndAt(now.plusSeconds(3600));

        MaintenanceStatusResponse status = service.publicStatus();

        assertTrue(status.maintenanceActive());
    }

    @Test
    void updateRecordsPreviousAndNewJsonValues() {
        MaintenanceUpdateRequest request = new MaintenanceUpdateRequest(
                true, "AUTH", "WEB", "Login Maintenance", "Login is temporarily unavailable",
                Instant.parse("2026-11-24T18:00:00Z"),
                Instant.parse("2026-11-24T20:00:00Z"),
                true, "Auth maintenance");

        MaintenanceSettingsResponse response = service.update(authentication, request);

        assertTrue(response.isActive());
        assertEquals("AUTH", response.maintenanceType());
        assertEquals("WEB", response.targetScope());
        verify(auditRepository).save(any(MaintenanceAuditLog.class));
    }

    @Test
    void auditLogsReturnNewestFirstFromRepository() {
        settings.setActive(false);

        service.auditLogs(authentication);

        verify(auditRepository).findAllByOrderByPerformedAtDesc();
    }
}
