package com.dreamspex.delivery;

import com.dreamspex.common.ApiException;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import static com.dreamspex.delivery.DeliveryBatchDtos.*;

@RestController
@RequestMapping("/api/v1/delivery/batches")
public class DeliveryBatchLinkController {
    private final DeliveryBatchService service;

    public DeliveryBatchLinkController(DeliveryBatchService service) {
        this.service = service;
    }

    @GetMapping("/{token}")
    ResponseEntity<DriverBatch> get(@PathVariable String token) {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(service.getDriverBatch(token));
    }

    @PostMapping("/{token}/orders/{orderId}/status")
    ResponseEntity<DeliveryStatusResponse> update(@PathVariable String token, @PathVariable String orderId,
                                                  @Valid @RequestBody StatusRequest request) {
        StatusUpdateResult result = service.updateStatus(token, orderId, request);
        if (result.rejected()) {
            throw new ApiException(HttpStatus.CONFLICT, result.rejectionCode(), result.rejectionMessage());
        }
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(result.response());
    }
}
