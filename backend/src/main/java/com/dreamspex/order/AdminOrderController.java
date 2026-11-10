package com.dreamspex.order;

import com.dreamspex.audit.AuditLogService;
import com.dreamspex.prescription.PrescriptionFile;
import com.dreamspex.loyalty.LoyaltyService;
import com.dreamspex.payment.Payment;
import com.dreamspex.payment.PaymentRepository;
import com.dreamspex.security.CurrentUser;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Map;

import static com.dreamspex.order.OrderDtos.*;

@RestController
@RequestMapping("/api/v1/admin/orders")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminOrderController {
    @Autowired private OrderRepository orderRepository;
    @Autowired private LoyaltyService loyaltyService;
    private final OrderService service;
    private final CurrentUser current;
    private final AuditLogService audit;
    private final PaymentRepository payments;

    public AdminOrderController(OrderService service, CurrentUser current, AuditLogService audit, PaymentRepository payments) {
        this.service = service;
        this.current = current;
        this.audit = audit;
        this.payments = payments;
    }

    public record AdminOrderReport(AdminOrderResponse order, String paymentMethod) {}

    @GetMapping("/report")
    List<AdminOrderReport> report() {
        Map<String, String> paymentMethods = new LinkedHashMap<>();
        for (Payment payment : payments.findAllByOrderByCreatedAtDesc()) {
            paymentMethods.putIfAbsent(payment.getOrder().getId(), payment.getProvider());
        }
        return service.adminOrders().stream()
                .map(order -> new AdminOrderReport(order, paymentMethods.get(order.id())))
                .toList();
    }

    @GetMapping
    List<AdminOrderResponse> list() {
        return service.adminOrders();
    }

    @GetMapping("/{id}")
    AdminOrderResponse get(@PathVariable String id) {
        return service.adminOrder(id);
    }

    @PatchMapping("/{orderId}/items/{itemId}/lens-preparation")
    LensPreparationDetails updateLensPreparation(Authentication authentication, @PathVariable String orderId,
                                                  @PathVariable String itemId,
                                                  @Valid @RequestBody LensPreparationRequest request) {
        LensPreparationDetails result = service.updateLensPreparation(authentication, orderId, itemId, request);
        audit.record(current.require(authentication), "LENS_PREPARATION_UPDATED", "ORDER_ITEM", itemId);
        return result;
    }

    @GetMapping("/{orderId}/items/{itemId}/prescription-files/{fileId}")
    ResponseEntity<InputStreamResource> prescriptionFile(@PathVariable String orderId, @PathVariable String itemId,
                                                          @PathVariable String fileId,
                                                          @RequestParam(defaultValue = "false") boolean download)
            throws IOException {
        PrescriptionFile file = service.adminPrescriptionFile(orderId, itemId, fileId);
        ContentDisposition disposition = download
                ? ContentDisposition.attachment().filename(file.getOriginalName(), StandardCharsets.UTF_8).build()
                : ContentDisposition.inline().filename(file.getOriginalName(), StandardCharsets.UTF_8).build();
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.getContentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION, disposition.toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(service.downloadAdminPrescription(orderId, itemId, fileId)));
    }

    @GetMapping(value = "/{orderId}/items/{itemId}/prescription-summary.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    ResponseEntity<byte[]> prescriptionSummary(@PathVariable String orderId, @PathVariable String itemId) {
        OrderService.PrescriptionSummaryPdfFile file = service.adminPrescriptionSummary(orderId, itemId);
        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_PDF)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename("prescription-" + file.orderNumber() + ".pdf",
                                StandardCharsets.UTF_8).build().toString())
                .header(HttpHeaders.CACHE_CONTROL, "private, no-store")
                .header("X-Content-Type-Options", "nosniff")
                .body(file.content());
    }

    @PatchMapping({"/{id}", "/{id}/status"})
    @Transactional
    OrderResponse status(Authentication authentication, @PathVariable String id,
                         @Valid @RequestBody StatusRequest request) {
        OrderResponse result = service.adminStatus(authentication, id, request);
        if ("DELIVERED".equals(request.status())) {
            orderRepository.findByIdForUpdate(id).ifPresent(loyaltyService::processDeliveredOrder);
        } else if ("CANCELLED".equals(request.status())) {
            orderRepository.findByIdForUpdate(id).ifPresent(order -> loyaltyService.restoreRedemption(order,
                    "ORDER:" + id + ":ADMIN_CANCEL_REDEMPTION_REVERSAL", order.getTotalAmount()));
        }
        audit.record(current.require(authentication), "ORDER_STATUS_CHANGED", "ORDER", id);
        return result;
    }
}
