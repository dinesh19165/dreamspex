package com.dreamspex.audit;

import com.dreamspex.auth.entity.User;
import com.dreamspex.common.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import java.nio.charset.StandardCharsets;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.Instant;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.regex.Pattern;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.context.request.RequestAttributes;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import static com.dreamspex.audit.AdminActivityLogDtos.*;

@Service
public class AdminActivityLogService {
    private static final int EXPORT_LIMIT = 10_000;
    private static final ZoneId IST = ZoneId.of("Asia/Kolkata");
    private static final DateTimeFormatter EXPORT_DATE_TIME =
            DateTimeFormatter.ofPattern("dd MMM yyyy, hh:mm:ss a", Locale.ENGLISH).withZone(IST);
    private static final String[] EXPORT_HEADERS = {
            "Admin Name", "Admin Email", "Activity Type", "Module", "Description",
            "IP Address", "User Agent", "Details", "Status", "Date & Time"
    };
    private static final Pattern EMAIL_PATTERN = Pattern.compile("^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$");
    private final AdminActivityLogRepository repository;

    public AdminActivityLogService(AdminActivityLogRepository repository) {
        this.repository = repository;
    }

    @Transactional(readOnly = true)
    public PageResponse search(String query, String activityType, String module, Instant from, Instant toExclusive,
                               String status, Pageable pageable) {
        Page<AdminActivityLog> result = repository.findAll(specification(query, activityType, module, from,
                toExclusive, status), pageable);
        return new PageResponse(result.getContent().stream().map(this::response).toList(),
                result.getNumber(), result.getSize(), result.getTotalElements(), result.getTotalPages(), summary());
    }

    @Transactional(readOnly = true)
    public ActivityResponse get(String id) {
        return repository.findById(id).map(this::response)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ACTIVITY_LOG_NOT_FOUND",
                        "Activity log entry was not found."));
    }

    @Transactional(readOnly = true)
    public byte[] exportCsv(String query, String activityType, String module, Instant from, Instant toExclusive,
                            String status) {
        StringBuilder csv = new StringBuilder("\uFEFF");
        csv.append(String.join(",", EXPORT_HEADERS)).append("\r\n");
        for (AdminActivityLog log : exportRows(query, activityType, module, from, toExclusive, status)) {
            csv.append(csvCell(log.getAdminName())).append(',')
                    .append(csvCell(log.getAdminEmail())).append(',')
                    .append(csvCell(log.getActivityType())).append(',')
                    .append(csvCell(log.getModule())).append(',')
                    .append(csvCell(log.getDescription())).append(',')
                    .append(csvCell(log.getIpAddress())).append(',')
                    .append(csvCell(log.getUserAgent())).append(',')
                    .append(csvCell(log.getDetails())).append(',')
                    .append(csvCell(log.getStatus())).append(',')
                    .append(csvCell(log.getCreatedAt() == null ? null : EXPORT_DATE_TIME.format(log.getCreatedAt())))
                    .append("\r\n");
        }
        return csv.toString().getBytes(StandardCharsets.UTF_8);
    }

    @Transactional(readOnly = true)
    public byte[] exportExcel(String query, String activityType, String module, Instant from, Instant toExclusive,
                              String status) {
        try (XSSFWorkbook workbook = new XSSFWorkbook(); ByteArrayOutputStream output = new ByteArrayOutputStream()) {
            Sheet sheet = workbook.createSheet("Activity logs");
            Row header = sheet.createRow(0);
            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);
            for (int column = 0; column < EXPORT_HEADERS.length; column++) {
                header.createCell(column).setCellValue(EXPORT_HEADERS[column]);
                header.getCell(column).setCellStyle(headerStyle);
            }

            int rowNumber = 1;
            for (AdminActivityLog log : exportRows(query, activityType, module, from, toExclusive, status)) {
                Row row = sheet.createRow(rowNumber++);
                String[] values = {
                        log.getAdminName(), log.getAdminEmail(), log.getActivityType(), log.getModule(),
                        log.getDescription(), log.getIpAddress(), log.getUserAgent(), log.getDetails(),
                        log.getStatus(), log.getCreatedAt() == null ? null : EXPORT_DATE_TIME.format(log.getCreatedAt())
                };
                for (int column = 0; column < values.length; column++) {
                    row.createCell(column).setCellValue(values[column] == null ? "" : values[column]);
                }
            }
            sheet.createFreezePane(0, 1);
            sheet.setAutoFilter(new org.apache.poi.ss.util.CellRangeAddress(0, Math.max(0, rowNumber - 1),
                    0, EXPORT_HEADERS.length - 1));
            int[] widths = {24, 32, 18, 22, 56, 20, 42, 48, 14, 28};
            for (int column = 0; column < widths.length; column++) sheet.setColumnWidth(column, widths[column] * 256);
            workbook.write(output);
            return output.toByteArray();
        } catch (IOException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "EXPORT_FAILED",
                    "The activity log export could not be generated.", exception);
        }
    }

    private List<AdminActivityLog> exportRows(String query, String activityType, String module, Instant from,
                                               Instant toExclusive, String status) {
        Specification<AdminActivityLog> filter = specification(query, activityType, module, from, toExclusive, status);
        Page<AdminActivityLog> result = repository.findAll(filter,
                PageRequest.of(0, EXPORT_LIMIT + 1, Sort.by(Sort.Direction.DESC, "createdAt")));
        if (result.getTotalElements() > EXPORT_LIMIT) {
            throw new ApiException(HttpStatus.PAYLOAD_TOO_LARGE, "EXPORT_TOO_LARGE",
                    "Narrow the filters to export no more than 10,000 entries.");
        }
        return result.getContent();
    }

    @Transactional
    public void deleteSelected(List<String> ids) {
        repository.deleteAllByIdInBatch(ids.stream().filter(Objects::nonNull).distinct().toList());
    }

    @Transactional
    public void clearAll() {
        repository.deleteAllInBatch();
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginSuccess(User admin) {
        record(actor(admin), "LOGIN_SUCCESS", "Authentication", "Admin signed in successfully.",
                "SUCCESS", currentRequest(), "POST /api/v1/auth/admin/login");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLoginFailure(String identifier, User matchedAdmin) {
        ActorSnapshot actor = isSuperAdmin(matchedAdmin) ? actor(matchedAdmin) : null;
        String email = actor == null ? normalizedEmail(identifier) : actor.email();
        record(new ActorSnapshot(actor == null ? null : actor.id(),
                        actor == null ? null : actor.name(), email),
                "LOGIN_FAILED", "Authentication", "Admin sign-in failed.", "FAILED",
                currentRequest(), "POST /api/v1/auth/admin/login");
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordLogout(User admin) {
        if (isSuperAdmin(admin)) {
            record(actor(admin), "LOGOUT", "Authentication", "Admin signed out.",
                    "SUCCESS", currentRequest(), "POST /api/v1/auth/logout");
        }
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void recordRequest(ActorSnapshot actor, String activityType, String module, String description,
                              String status, HttpServletRequest request) {
        record(actor, activityType, module, description, status, request,
                request.getMethod() + " " + request.getRequestURI());
    }

    public static ActorSnapshot actor(User user) {
        return new ActorSnapshot(user.getId(), user.getDisplayName(), user.getEmail());
    }

    private void record(ActorSnapshot actor, String activityType, String module, String description,
                        String status, HttpServletRequest request, String details) {
        AdminActivityLog log = new AdminActivityLog();
        if (actor != null) {
            log.setAdminId(actor.id());
            log.setAdminName(limit(actor.name(), 160));
            log.setAdminEmail(limit(actor.email(), 254));
        }
        log.setActivityType(activityType);
        log.setModule(module);
        log.setDescription(limit(description, 1000));
        log.setStatus(status);
        log.setDetails(limit(details, 1000));
        if (request != null) {
            log.setIpAddress(limit(request.getRemoteAddr(), 64));
            log.setUserAgent(limit(request.getHeader("User-Agent"), 512));
        }
        repository.save(log);
    }

    private SummaryResponse summary() {
        return new SummaryResponse(repository.count(), repository.countSuccessfulLogins(),
                repository.countFailedLogins(), repository.countProductChanges());
    }

    private ActivityResponse response(AdminActivityLog log) {
        return new ActivityResponse(log.getId(), log.getAdminId(), log.getAdminName(), log.getAdminEmail(),
                log.getActivityType(), log.getModule(), log.getDescription(), log.getIpAddress(),
                log.getUserAgent(), log.getDetails(), log.getStatus(), log.getCreatedAt());
    }

    private Specification<AdminActivityLog> specification(String query, String activityType, String module,
                                                           Instant from, Instant toExclusive, String status) {
        Specification<AdminActivityLog> filter = (root, criteriaQuery, builder) -> builder.conjunction();
        if (query != null && !query.isBlank()) {
            String pattern = "%" + query.trim().toLowerCase(Locale.ROOT) + "%";
            filter = filter.and((root, criteriaQuery, builder) -> builder.or(
                    builder.like(builder.lower(root.get("adminName")), pattern),
                    builder.like(builder.lower(root.get("adminEmail")), pattern)));
        }
        if (activityType != null && !activityType.isBlank()) {
            filter = filter.and((root, criteriaQuery, builder) ->
                    builder.equal(root.get("activityType"), activityType));
        }
        if (module != null && !module.isBlank()) {
            filter = filter.and((root, criteriaQuery, builder) -> builder.equal(root.get("module"), module));
        }
        if (from != null) {
            filter = filter.and((root, criteriaQuery, builder) ->
                    builder.greaterThanOrEqualTo(root.get("createdAt"), from));
        }
        if (toExclusive != null) {
            filter = filter.and((root, criteriaQuery, builder) -> builder.lessThan(root.get("createdAt"), toExclusive));
        }
        if (status != null && !status.isBlank()) {
            filter = filter.and((root, criteriaQuery, builder) -> builder.equal(root.get("status"), status));
        }
        return filter;
    }

    private boolean isSuperAdmin(User user) {
        return user != null && user.getRoles().stream().anyMatch(role -> "SUPER_ADMIN".equals(role.getCode()));
    }

    private String normalizedEmail(String identifier) {
        if (identifier == null) return null;
        String candidate = identifier.trim().toLowerCase(Locale.ROOT);
        return candidate.length() <= 254 && EMAIL_PATTERN.matcher(candidate).matches() ? candidate : null;
    }

    private HttpServletRequest currentRequest() {
        RequestAttributes attributes = RequestContextHolder.getRequestAttributes();
        return attributes instanceof ServletRequestAttributes servletAttributes ? servletAttributes.getRequest() : null;
    }

    private String limit(String value, int length) {
        return value == null ? null : value.substring(0, Math.min(value.length(), length));
    }

    private String csvCell(String value) {
        String safe = value == null ? "" : value;
        if (!safe.isEmpty() && "=+-@\t\r".indexOf(safe.charAt(0)) >= 0) safe = "'" + safe;
        return "\"" + safe.replace("\"", "\"\"") + "\"";
    }

    public record ActorSnapshot(String id, String name, String email) {}
}
