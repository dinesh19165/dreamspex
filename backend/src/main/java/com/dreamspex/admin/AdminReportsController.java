package com.dreamspex.admin;

import com.dreamspex.admin.AdminReportsDtos.Report;
import java.time.LocalDate;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/reports")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminReportsController {
    private final AdminReportsService reports;

    public AdminReportsController(AdminReportsService reports) {
        this.reports = reports;
    }

    @GetMapping
    public Report report(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate
    ) {
        return reports.report(startDate, endDate);
    }
}
