package com.dreamspex.maintenance;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.dreamspex.maintenance.MaintenanceDtos.*;

@RestController
@RequestMapping("/api/v1/admin/maintenance")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class MaintenanceAdminController {
    private final MaintenanceService service;

    public MaintenanceAdminController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping
    public MaintenanceSettingsResponse get(Authentication authentication) {
        return service.getConfiguration(authentication);
    }

    @PutMapping
    public MaintenanceSettingsResponse update(Authentication authentication,
                                               @Valid @RequestBody MaintenanceUpdateRequest request) {
        return service.update(authentication, request);
    }

    @PostMapping("/activate")
    public MaintenanceSettingsResponse activate(Authentication authentication,
                                                @Valid @RequestBody(required = false) MaintenanceActionRequest request) {
        return service.activate(authentication, request);
    }

    @PostMapping("/deactivate")
    public MaintenanceSettingsResponse deactivate(Authentication authentication,
                                                  @Valid @RequestBody(required = false) MaintenanceActionRequest request) {
        return service.deactivate(authentication, request);
    }

    @GetMapping("/audit-logs")
    public List<MaintenanceAuditResponse> auditLogs(Authentication authentication) {
        return service.auditLogs(authentication);
    }
}
