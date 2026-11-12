package com.dreamspex.franchise;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.dreamspex.franchise.FranchiseDtos.*;

@RestController
@RequestMapping("/api/v1/admin/franchises")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminFranchiseController {
    private final FranchiseService service;

    public AdminFranchiseController(FranchiseService service) { this.service = service; }

    @GetMapping
    List<FranchiseResponse> list() { return service.adminList(); }

    @GetMapping("/{id}")
    FranchiseResponse get(@PathVariable String id) { return service.adminGet(id); }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    FranchiseCreateResponse create(Authentication authentication, @Valid @RequestBody FranchiseRequest request) {
        return service.create(authentication, request);
    }

    @PatchMapping("/{id}")
    FranchiseResponse update(Authentication authentication, @PathVariable String id,
                             @Valid @RequestBody FranchiseRequest request) {
        return service.update(authentication, id, request);
    }

    @GetMapping("/{id}/users")
    List<FranchiseUserResponse> users(@PathVariable String id) { return service.adminUsers(id); }

    @PostMapping("/{id}/products")
    @ResponseStatus(HttpStatus.CREATED)
    List<AssignmentResponse> assignProduct(Authentication authentication, @PathVariable String id,
                                           @Valid @RequestBody AssignmentRequest request) {
        return service.assignProduct(authentication, id, request);
    }

    @GetMapping("/{id}/products")
    List<AssignmentResponse> products(@PathVariable String id) { return service.productAssignments(id); }

    @PatchMapping("/{id}/inventory/{inventoryId}")
    InventoryResponse adjustInventory(Authentication authentication, @PathVariable String id,
                                      @PathVariable String inventoryId,
                                      @Valid @RequestBody InventoryAdjustmentRequest request) {
        return service.adjustInventory(authentication, id, inventoryId, request);
    }

    @GetMapping("/{id}/orders")
    List<OrderResponse> orders(@PathVariable String id) {
        return service.franchiseOrdersForAdmin(id);
    }

    @GetMapping("/{id}/returns")
    List<ReturnResponse> returns(@PathVariable String id) {
        return service.adminReturns(id);
    }

    @GetMapping("/reports")
    List<ReportResponse> reports(@RequestParam Instant from, @RequestParam Instant to) {
        return service.adminReports(from, to);
    }

    @GetMapping("/inventory-movements")
    List<InventoryMovementResponse> inventoryMovements() { return service.inventoryMovements(); }
}
