package com.dreamspex.delivery;

import com.dreamspex.audit.AuditLogService;
import com.dreamspex.security.CurrentUser;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import static com.dreamspex.delivery.DeliveryBatchDtos.*;

@RestController
@RequestMapping("/api/v1/admin/delivery/batches")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminDeliveryBatchController {
    private final DeliveryBatchService service;
    private final CurrentUser current;
    private final AuditLogService audit;

    public AdminDeliveryBatchController(DeliveryBatchService service, CurrentUser current, AuditLogService audit) {
        this.service = service;
        this.current = current;
        this.audit = audit;
    }

    @GetMapping("/eligible-orders")
    List<EligibleOrder> eligibleOrders(@RequestParam(required = false) String postalCode,
                                       @RequestParam(required = false) String city,
                                       @RequestParam(defaultValue = "false") boolean includeAssigned) {
        return service.eligibleOrders(postalCode, city, includeAssigned);
    }

    @GetMapping
    List<BatchSummary> batches() {
        return service.listBatches();
    }

    @GetMapping("/{batchId}")
    BatchDetails details(@PathVariable String batchId) {
        return service.getBatchDetails(batchId);
    }

    @GetMapping("/{batchId}/active-link")
    ActiveBatchLink activeLink(@PathVariable String batchId) {
        return service.getActiveLink(batchId);
    }

    @PostMapping
    CreatedBatch create(Authentication authentication, @Valid @RequestBody CreateBatchRequest request) {
        CreatedBatch result = service.create(current.require(authentication), request);
        audit.record(current.require(authentication), "DELIVERY_BATCH_CREATED", "DELIVERY_BATCH", result.batch().id());
        return result;
    }

    @PostMapping("/{batchId}/link")
    CreatedBatch regenerateLink(Authentication authentication, @PathVariable String batchId) {
        CreatedBatch result = service.regenerateLink(current.require(authentication), batchId);
        audit.record(current.require(authentication), "DELIVERY_BATCH_LINK_REGENERATED", "DELIVERY_BATCH", batchId);
        return result;
    }

    @PostMapping("/{batchId}/orders/{orderId}/otp")
    OneTimeOtp regenerateOrderOtp(Authentication authentication, @PathVariable String batchId,
                                  @PathVariable String orderId) {
        OneTimeOtp result = service.regenerateOrderOtp(batchId, orderId);
        audit.record(current.require(authentication), "DELIVERY_ORDER_OTP_REGENERATED",
                "DELIVERY_BATCH_ORDER", result.orderId());
        return result;
    }

    @PostMapping("/{batchId}/link/revoke")
    LinkRevocation revokeLink(Authentication authentication, @PathVariable String batchId) {
        LinkRevocation result = service.revokeLink(batchId);
        audit.record(current.require(authentication), "DELIVERY_BATCH_LINK_REVOKED", "DELIVERY_BATCH", batchId);
        return result;
    }

    @PostMapping("/{batchId}/revoke")
    BatchSummary revoke(Authentication authentication, @PathVariable String batchId) {
        BatchSummary result = service.revokeBatch(current.require(authentication), batchId);
        audit.record(current.require(authentication), "DELIVERY_BATCH_REVOKED", "DELIVERY_BATCH", batchId);
        return result;
    }
}
