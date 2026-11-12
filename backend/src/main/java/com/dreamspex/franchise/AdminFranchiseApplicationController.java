package com.dreamspex.franchise;

import com.dreamspex.franchise.FranchiseApplicationDtos.AdminResponse;
import com.dreamspex.franchise.FranchiseApplicationDtos.AdminUpdateRequest;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin/franchise-applications")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminFranchiseApplicationController {
    private final FranchiseApplicationService service;

    public AdminFranchiseApplicationController(FranchiseApplicationService service) {
        this.service = service;
    }

    @GetMapping
    public List<AdminResponse> list() {
        return service.adminList();
    }

    @GetMapping("/{id}")
    public AdminResponse get(@PathVariable String id) {
        return service.adminGet(id);
    }

    @PatchMapping("/{id}")
    public AdminResponse update(Authentication authentication, @PathVariable String id,
                                @Valid @RequestBody AdminUpdateRequest request) {
        return service.adminUpdate(id, request, authentication.getName());
    }
}
