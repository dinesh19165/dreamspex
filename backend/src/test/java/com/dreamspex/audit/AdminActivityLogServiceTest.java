package com.dreamspex.audit;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.test.util.ReflectionTestUtils;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminActivityLogServiceTest {
    @Mock AdminActivityLogRepository repository;

    private AdminActivityLogService service;

    @BeforeEach
    void setUp() {
        service = new AdminActivityLogService(repository);
    }

    @Test
    void csvExportEscapesFormulaCellsAndFormatsTimestampInIst() {
        AdminActivityLog log = activityLog();
        log.setAdminName("=HYPERLINK(\"https://example.test\")");
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(log)));

        String csv = new String(service.exportCsv(null, null, null, null, null, null),
                java.nio.charset.StandardCharsets.UTF_8);

        assertTrue(csv.contains("\"'=HYPERLINK(\"\"https://example.test\"\")\""));
        assertTrue(csv.contains("\"26 Nov 2026, 08:45:00 PM\""));
    }

    @Test
    void excelExportProducesAnOpenXmlWorkbook() {
        when(repository.findAll(any(Specification.class), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(activityLog())));

        byte[] workbook = service.exportExcel(null, null, null, null, null, null);

        assertEquals('P', workbook[0]);
        assertEquals('K', workbook[1]);
    }

    private AdminActivityLog activityLog() {
        AdminActivityLog log = new AdminActivityLog();
        log.setAdminName("Administrator");
        log.setAdminEmail("admin@example.test");
        log.setActivityType("LOGIN_SUCCESS");
        log.setModule("Authentication");
        log.setDescription("Admin signed in successfully.");
        log.setStatus("SUCCESS");
        ReflectionTestUtils.setField(log, "createdAt", Instant.parse("2026-11-26T15:15:00Z"));
        return log;
    }
}
