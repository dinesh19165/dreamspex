package com.dreamspex.franchise;

import java.util.List;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import static com.dreamspex.franchise.FranchiseDtos.*;

@RestController
@RequestMapping("/api/v1/franchises")
public class PublicFranchiseController {
    private final FranchiseService service;

    public PublicFranchiseController(FranchiseService service) {
        this.service = service;
    }

    @GetMapping
    List<StorefrontFranchiseResponse> list() {
        return service.storefrontFranchises();
    }

    @org.springframework.security.access.prepost.PreAuthorize("hasRole('CUSTOMER')")
    @org.springframework.web.bind.annotation.PostMapping("/availability")
    List<StorefrontAvailabilityResponse> availability(
            @Valid @org.springframework.web.bind.annotation.RequestBody StorefrontAvailabilityRequest request) {
        return service.storefrontAvailability(request);
    }
}
