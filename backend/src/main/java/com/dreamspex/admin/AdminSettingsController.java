package com.dreamspex.admin;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.dreamspex.admin.AdminSettingsDtos.*;

@RestController
@RequestMapping("/api/v1/admin/settings")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminSettingsController {
    private final AdminSettingsService service;
    public AdminSettingsController(AdminSettingsService service) { this.service = service; }
    @GetMapping SettingsResponse get(Authentication authentication) { return service.get(authentication); }
    @PutMapping SettingsResponse save(Authentication authentication, @Valid @RequestBody SettingsRequest request) { return service.save(authentication, request); }
    @PostMapping("/password") @ResponseStatus(HttpStatus.NO_CONTENT)
    void password(Authentication authentication, @Valid @RequestBody PasswordChangeRequest request) { service.changePassword(authentication, request); }
    @PostMapping("/test/{integration}") ConnectionResponse test(@PathVariable String integration) { return service.test(integration); }
    @PostMapping("/smtp/test-connection") ConnectionResponse testSmtp() { return service.testSmtp(); }
    @PostMapping("/smtp/test-email") @ResponseStatus(HttpStatus.NO_CONTENT)
    void testEmail(@Valid @RequestBody TestEmailRequest request) { service.sendTestEmail(request.recipient()); }
}
