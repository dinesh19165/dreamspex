package com.dreamspex.notification;

import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.bind.annotation.ResponseStatus;

import static com.dreamspex.notification.AdminAlertDtos.AlertResponse;

@RestController
@RequestMapping("/api/v1/admin/alerts")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminAlertController {
    private final AdminAlertService alerts;

    public AdminAlertController(AdminAlertService alerts) {
        this.alerts = alerts;
    }

    @GetMapping
    public List<AlertResponse> list() {
        return alerts.list();
    }

    @PostMapping("/{id}/acknowledge")
    public AlertResponse acknowledge(@PathVariable String id) {
        return alerts.acknowledge(id);
    }

    @PostMapping("/acknowledge-all")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void acknowledgeAll() {
        alerts.acknowledgeAll();
    }
}
