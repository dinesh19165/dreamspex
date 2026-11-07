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
@RequestMapping("/api/v1/admin/returns/delivery-batches/{operationType}")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminReturnDeliveryBatchController {
    private final DeliveryBatchService service;
    private final CurrentUser current;
    private final AuditLogService audit;

    public AdminReturnDeliveryBatchController(DeliveryBatchService service, CurrentUser current,
                                              AuditLogService audit) {
        this.service = service;
        this.current = current;
        this.audit = audit;
    }

    @GetMapping("/eligible-requests")
    List<DeliveryBatchService.EligibleReturnRequest> eligible(
            @PathVariable String operationType,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String state,
            @RequestParam(required = false) String postalCode) {
        return service.eligibleReturnRequests(operationType, city, state, postalCode);
    }

    @GetMapping
    List<BatchSummary> batches(@PathVariable String operationType) {
        return service.listReturnBatches(operationType);
    }

    @GetMapping("/{batchId}")
    BatchDetails details(@PathVariable String operationType, @PathVariable String batchId) {
        return service.getReturnBatchDetails(operationType, batchId);
    }

    @GetMapping("/{batchId}/active-link")
    ActiveBatchLink activeLink(@PathVariable String operationType, @PathVariable String batchId) {
        return service.getReturnBatchActiveLink(operationType, batchId);
    }

    @PostMapping
    CreatedBatch create(Authentication authentication, @PathVariable String operationType,
                        @Valid @RequestBody CreateReturnBatchRequest request) {
        CreatedBatch result = service.createReturnBatch(current.require(authentication), operationType, request);
        audit.record(current.require(authentication), "RETURN_DELIVERY_BATCH_CREATED",
                "DELIVERY_BATCH", result.batch().id());
        return result;
    }

    @PostMapping("/{batchId}/link")
    CreatedBatch regenerateLink(Authentication authentication, @PathVariable String operationType,
                                @PathVariable String batchId) {
        CreatedBatch result = service.regenerateReturnBatchLink(
                current.require(authentication), operationType, batchId);
        audit.record(current.require(authentication), "RETURN_DELIVERY_BATCH_LINK_REGENERATED",
                "DELIVERY_BATCH", batchId);
        return result;
    }

    @PostMapping("/{batchId}/link/revoke")
    LinkRevocation revokeLink(Authentication authentication, @PathVariable String operationType,
                              @PathVariable String batchId) {
        LinkRevocation result = service.revokeReturnBatchLink(operationType, batchId);
        audit.record(current.require(authentication), "RETURN_DELIVERY_BATCH_LINK_REVOKED",
                "DELIVERY_BATCH", batchId);
        return result;
    }
}
