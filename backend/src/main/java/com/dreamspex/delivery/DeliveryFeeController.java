package com.dreamspex.delivery;

import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.dreamspex.delivery.DeliveryFeeDtos.*;

@RestController
@RequestMapping("/api/v1/admin/delivery-fee")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class DeliveryFeeController {
    private final DeliveryFeeService service;

    public DeliveryFeeController(DeliveryFeeService service) {
        this.service = service;
    }

    @GetMapping("/policies")
    public List<PolicyResponse> policies() {
        return service.listPolicies();
    }

    @GetMapping("/slabs")
    public List<SlabResponse> slabs(@RequestParam String policyId) {
        return service.listSlabs(policyId);
    }

    @PostMapping("/policies")
    @ResponseStatus(HttpStatus.CREATED)
    public PolicyResponse createPolicy(Authentication authentication, @Valid @RequestBody PolicyRequest request) {
        return service.savePolicy(authentication, request);
    }

    @PatchMapping("/policies/{id}")
    public PolicyResponse updatePolicy(Authentication authentication, @PathVariable String id, @Valid @RequestBody PolicyRequest request) {
        return service.updatePolicy(authentication, id, request);
    }

    @DeleteMapping("/policies/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deletePolicy(Authentication authentication, @PathVariable String id) {
        service.deletePolicy(authentication, id);
    }

    @PostMapping("/slabs")
    @ResponseStatus(HttpStatus.CREATED)
    public SlabResponse createSlab(Authentication authentication, @Valid @RequestBody SlabRequest request) {
        return service.saveSlab(authentication, request);
    }

    @PatchMapping("/slabs/{id}")
    public SlabResponse updateSlab(Authentication authentication, @PathVariable String id, @Valid @RequestBody SlabRequest request) {
        return service.updateSlab(authentication, id, request);
    }

    @DeleteMapping("/slabs/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteSlab(Authentication authentication, @PathVariable String id) {
        service.deleteSlab(authentication, id);
    }
}
