package com.dreamspex.maintenance;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public final class MaintenanceDtos {
    private MaintenanceDtos() {}

    public record MaintenanceUpdateRequest(
            @NotNull Boolean isActive,
            @NotBlank @Pattern(regexp = "FULL_SYSTEM|PAYMENT|AUTH|CATALOG|API")
            String maintenanceType,
            @NotBlank @Pattern(regexp = "ALL|WEB|API")
            String targetScope,
            @Size(max = 200) String title,
            @Size(max = 10000) String message,
            Instant startAt,
            Instant endAt,
            @NotNull Boolean adminBypass,
            @Size(max = 500) String remarks) {}

    public record MaintenanceActionRequest(
            @Size(max = 500) String remarks) {}

    public record MaintenanceStatusResponse(
            boolean maintenanceActive,
            String maintenanceType,
            String targetScope,
            String title,
            String message,
            Instant startAt,
            Instant endAt) {}

    public record MaintenanceSettingsResponse(
            Long id,
            boolean isActive,
            boolean maintenanceActive,
            String maintenanceType,
            String targetScope,
            String title,
            String message,
            Instant startAt,
            Instant endAt,
            boolean adminBypass,
            Instant createdAt,
            Instant updatedAt,
            String createdById,
            String updatedById) {}

    public record MaintenanceAuditResponse(
            Long id,
            Long maintenanceId,
            String action,
            String previousValues,
            String newValues,
            String performedById,
            String performedByName,
            Instant performedAt,
            String remarks) {}
}
