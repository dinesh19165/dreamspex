package com.dreamspex.audit;

import com.dreamspex.common.ApiException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.dreamspex.audit.AdminActivityLogDtos.*;

@RestController
@RequestMapping("/api/v1/admin/activity-logs")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@Validated
public class AdminActivityLogController {
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private final AdminActivityLogService service;

    public AdminActivityLogController(AdminActivityLogService service) {
        this.service = service;
    }

    @GetMapping
    public PageResponse list(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Pattern(regexp = "^(LOGIN_SUCCESS|LOGIN_FAILED|LOGOUT|CREATE|UPDATE|DELETE|BULK_IMPORT|BULK_EXPORT|ACTION)$") String activityType,
            @RequestParam(required = false) @Size(max = 80) String module,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) @Pattern(regexp = "^(SUCCESS|FAILED)$") String status,
            @RequestParam(defaultValue = "0") @Min(0) int page,
            @RequestParam(defaultValue = "25") @Min(1) @Max(100) int size) {
        validateDateRange(from, to);
        return service.search(q, activityType, module, fromInstant(from), toExclusive(to), status,
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")));
    }

    @GetMapping("/{id}")
    public ActivityResponse get(@PathVariable @Size(max = 36) String id) {
        return service.get(id);
    }

    @GetMapping("/export.csv")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Pattern(regexp = "^(LOGIN_SUCCESS|LOGIN_FAILED|LOGOUT|CREATE|UPDATE|DELETE|BULK_IMPORT|BULK_EXPORT|ACTION)$") String activityType,
            @RequestParam(required = false) @Size(max = 80) String module,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) @Pattern(regexp = "^(SUCCESS|FAILED)$") String status) {
        validateDateRange(from, to);
        byte[] content = service.exportCsv(q, activityType, module, fromInstant(from), toExclusive(to), status);
        String filename = "admin-activity-logs-" + DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(IST).format(Instant.now()) + ".csv";
        return ResponseEntity.ok()
                .contentType(new MediaType("text", "csv", java.nio.charset.StandardCharsets.UTF_8))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(content);
    }

    @GetMapping("/export.xlsx")
    public ResponseEntity<byte[]> exportExcel(
            @RequestParam(required = false) @Size(max = 100) String q,
            @RequestParam(required = false) @Pattern(regexp = "^(LOGIN_SUCCESS|LOGIN_FAILED|LOGOUT|CREATE|UPDATE|DELETE|BULK_IMPORT|BULK_EXPORT|ACTION)$") String activityType,
            @RequestParam(required = false) @Size(max = 80) String module,
            @RequestParam(required = false) LocalDate from,
            @RequestParam(required = false) LocalDate to,
            @RequestParam(required = false) @Pattern(regexp = "^(SUCCESS|FAILED)$") String status) {
        validateDateRange(from, to);
        byte[] content = service.exportExcel(q, activityType, module, fromInstant(from), toExclusive(to), status);
        String filename = "admin-activity-logs-" + DateTimeFormatter.ofPattern("yyyyMMdd-HHmmss")
                .withZone(IST).format(Instant.now()) + ".xlsx";
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"))
                .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(filename).build().toString())
                .body(content);
    }

    @DeleteMapping("/selected")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSelected(@Valid @RequestBody DeleteRequest request) {
        service.deleteSelected(request.ids());
    }

    @DeleteMapping("/all")
    @org.springframework.web.bind.annotation.ResponseStatus(HttpStatus.NO_CONTENT)
    public void clearAll() {
        service.clearAll();
    }

    private Instant fromInstant(LocalDate value) {
        return value == null ? null : value.atStartOfDay(IST).toInstant();
    }

    private Instant toExclusive(LocalDate value) {
        return value == null ? null : value.plusDays(1).atStartOfDay(IST).toInstant();
    }

    private void validateDateRange(LocalDate from, LocalDate to) {
        if (from != null && to != null && from.isAfter(to)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_DATE_RANGE",
                    "The start date must be on or before the end date.");
        }
    }
}
