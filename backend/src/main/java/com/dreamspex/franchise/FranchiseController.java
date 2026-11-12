package com.dreamspex.franchise;

import jakarta.validation.Valid;
import java.time.Instant;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.dreamspex.franchise.FranchiseDtos.*;

@RestController
@RequestMapping("/api/v1/franchise")
@PreAuthorize("hasRole('FRANCHISE_ADMIN')")
public class FranchiseController {
    private final FranchiseService service;

    public FranchiseController(FranchiseService service) { this.service = service; }

    @GetMapping("/me")
    FranchiseResponse me(Authentication authentication) { return service.me(authentication); }

    @GetMapping("/dashboard")
    DashboardResponse dashboard(Authentication authentication) { return service.dashboard(authentication); }

    @GetMapping("/products")
    List<AssignmentResponse> products(Authentication authentication) {
        return service.productAssignmentsForUser(authentication);
    }

    @GetMapping("/inventory")
    List<InventoryResponse> inventory(Authentication authentication) {
        return service.franchiseInventory(authentication);
    }

    @PatchMapping("/inventory/{inventoryId}")
    InventoryResponse adjustInventory(Authentication authentication, @PathVariable String inventoryId,
                                      @Valid @RequestBody InventoryAdjustmentRequest request) {
        return service.adjustOwnInventory(authentication, inventoryId, request);
    }

    @GetMapping("/inventory/movements")
    List<InventoryMovementResponse> movements(Authentication authentication) {
        return service.franchiseMovements(authentication);
    }

    @GetMapping("/orders")
    List<OrderResponse> orders(Authentication authentication) {
        return service.franchiseOrders(authentication);
    }

    @GetMapping("/returns")
    List<ReturnResponse> returns(Authentication authentication) {
        return service.franchiseReturns(authentication);
    }

    @GetMapping("/orders/{id}")
    OrderResponse order(Authentication authentication, @PathVariable String id) {
        return service.franchiseOrder(authentication, id);
    }

    @PatchMapping("/orders/{id}/status")
    OrderResponse orderStatus(Authentication authentication, @PathVariable String id,
                              @Valid @RequestBody OrderStatusRequest request) {
        return service.updateOrderStatus(authentication, id, request);
    }

    @GetMapping("/reports")
    ReportResponse report(Authentication authentication, @RequestParam Instant from, @RequestParam Instant to) {
        return service.franchiseReport(authentication, from, to);
    }
}
