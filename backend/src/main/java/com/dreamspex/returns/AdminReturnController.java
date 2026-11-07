package com.dreamspex.returns;

import com.dreamspex.returns.ReturnDtos.AdminReturnResponse;
import com.dreamspex.returns.ReturnDtos.PolicyRequest;
import com.dreamspex.returns.ReturnDtos.PolicyResponse;
import com.dreamspex.returns.ReturnDtos.ProductEligibilityRequest;
import com.dreamspex.returns.ReturnDtos.ProductEligibilityResponse;
import com.dreamspex.returns.ReturnDtos.StatusRequest;
import com.dreamspex.security.CurrentUser;
import jakarta.validation.Valid;
import java.io.IOException;
import java.time.LocalDate;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RestController;
import static com.dreamspex.returns.ReturnDtos.*;

@RestController
@RequestMapping("/api/v1/admin/returns")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminReturnController {
    private final ReturnService returns;
    private final CurrentUser current;

    public AdminReturnController(ReturnService returns, CurrentUser current) {
        this.returns = returns;
        this.current = current;
    }

    @GetMapping("/policy")
    PolicyResponse policy() { return returns.adminPolicy(); }

    @PutMapping("/policy")
    PolicyResponse updatePolicy(Authentication authentication, @Valid @RequestBody PolicyRequest request) {
        return returns.updatePolicy(current.require(authentication), request);
    }

    @GetMapping("/products")
    List<ProductEligibilityResponse> products(@RequestParam(required = false) String q) {
        return returns.adminProducts(q);
    }

    @PutMapping("/products/{productId}")
    ProductEligibilityResponse updateProduct(Authentication authentication, @PathVariable String productId,
                                              @Valid @RequestBody ProductEligibilityRequest request) {
        return returns.setProductEligibility(current.require(authentication), productId, request);
    }

    @GetMapping
    List<AdminReturnResponse> list(@RequestParam(required = false) String status,
                                   @RequestParam(required = false) LocalDate from,
                                   @RequestParam(required = false) LocalDate to,
                                   @RequestParam(required = false) String orderId) {
        return returns.adminList(status, from, to, orderId);
    }

    @GetMapping("/{id}")
    AdminReturnResponse get(@PathVariable String id) { return returns.adminGet(id); }

    @PatchMapping("/{id}/status")
    AdminReturnResponse updateStatus(Authentication authentication, @PathVariable String id,
                                     @Valid @RequestBody StatusRequest request) {
        return returns.updateStatus(current.require(authentication), id, request);
    }

    @PostMapping("/{id}/refunds")
    AdminReturnResponse processRefund(Authentication authentication, @PathVariable String id) {
        return returns.processRefund(current.require(authentication), id);
    }

    @PostMapping("/{id}/refunds/refresh")
    AdminReturnResponse refreshRefund(Authentication authentication, @PathVariable String id) {
        return returns.processRefund(current.require(authentication), id);
    }

    @GetMapping("/{id}/evidence/{evidenceId}")
    ResponseEntity<InputStreamResource> evidence(@PathVariable String id, @PathVariable String evidenceId)
            throws IOException {
        return ReturnController.privateImage(returns.adminEvidence(id, evidenceId));
    }
}
