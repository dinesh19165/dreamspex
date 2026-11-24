package com.dreamspex.maintenance;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.dreamspex.maintenance.MaintenanceDtos.MaintenanceStatusResponse;

@RestController
@RequestMapping("/api/v1/maintenance")
public class MaintenancePublicController {
    private final MaintenanceService service;

    public MaintenancePublicController(MaintenanceService service) {
        this.service = service;
    }

    @GetMapping("/status")
    public MaintenanceStatusResponse status() {
        return service.publicStatus();
    }
}
