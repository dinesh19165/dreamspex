package com.dreamspex.gst;

import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

import static com.dreamspex.gst.GstDtos.*;

@RestController
@RequestMapping("/api/v1/admin/gst")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class GstConfigurationController {
    private final GstConfigurationService service;

    public GstConfigurationController(GstConfigurationService service) {
        this.service = service;
    }

    @GetMapping("/settings")
    public GstSettingsResponse settings() {
        return service.current();
    }

    @PutMapping("/settings")
    public GstSettingsResponse update(Authentication authentication,
                                      @Valid @RequestBody GstSettingsRequest request) {
        return service.update(authentication, request);
    }

    @GetMapping("/history")
    public List<GstHistoryResponse> history() {
        return service.history();
    }
}
