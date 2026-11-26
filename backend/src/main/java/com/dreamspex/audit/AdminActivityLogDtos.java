package com.dreamspex.audit;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.util.List;

public final class AdminActivityLogDtos {
    private AdminActivityLogDtos() {}

    public record ActivityResponse(
            String id,
            String adminId,
            String adminName,
            String adminEmail,
            String activityType,
            String module,
            String description,
            String ipAddress,
            String userAgent,
            String details,
            String status,
            Instant createdAt) {}

    public record SummaryResponse(
            long totalActivities,
            long successfulLogins,
            long failedLogins,
            long productChanges) {}

    public record PageResponse(
            List<ActivityResponse> items,
            int page,
            int size,
            long totalElements,
            int totalPages,
            SummaryResponse summary) {}

    public record DeleteRequest(
            @NotEmpty @Size(max = 100) List<@NotBlank @Size(max = 36) String> ids) {}
}
