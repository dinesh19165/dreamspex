package com.dreamspex.notification;

import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import java.time.Instant;
import java.time.Duration;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import static com.dreamspex.notification.AdminAlertDtos.AlertResponse;

@Service
public class AdminAlertService {
    private static final Logger log = LoggerFactory.getLogger(AdminAlertService.class);
    private static final Duration SCAN_OVERLAP = Duration.ofMinutes(5);

    private final AdminAlertRepository alerts;
    private final AdminAlertScanStateRepository scanStates;
    private final OrderRepository orders;
    private final ReturnRequestRepository returnRequests;

    public AdminAlertService(AdminAlertRepository alerts, AdminAlertScanStateRepository scanStates,
                             OrderRepository orders, ReturnRequestRepository returnRequests) {
        this.alerts = alerts;
        this.scanStates = scanStates;
        this.orders = orders;
        this.returnRequests = returnRequests;
    }

    @Transactional
    public List<AlertResponse> list() {
        synchronizeNewEvents();
        resolveCompletedEvents();
        Map<String, AdminAlert> visible = new LinkedHashMap<>();
        alerts.findByAcknowledgedAtIsNullAndResolvedAtIsNullOrderByEventAtDesc()
                .forEach(alert -> visible.put(alert.getId(), alert));
        alerts.findTop100ByOrderByEventAtDesc().forEach(alert -> visible.putIfAbsent(alert.getId(), alert));
        return visible.values().stream().sorted((first, second) -> second.getEventAt().compareTo(first.getEventAt()))
                .map(this::response).toList();
    }

    @Transactional
    public AlertResponse acknowledge(String id) {
        AdminAlert alert = alerts.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Admin alert was not found."));
        if (alert.getAcknowledgedAt() == null) alert.setAcknowledgedAt(Instant.now());
        return response(alert);
    }

    @Transactional
    public void acknowledgeAll() {
        Instant now = Instant.now();
        for (AdminAlert alert : alerts.findByAcknowledgedAtIsNullAndResolvedAtIsNull()) {
            alert.setAcknowledgedAt(now);
        }
    }

    private void synchronizeNewEvents() {
        AdminAlertScanState state = scanStates.findForUpdate()
                .orElseThrow(() -> new IllegalStateException("Admin alert scan cursor was not initialized by the database migration."));
        Instant until = Instant.now();
        Instant cursor = state.getLastScannedAt();
        if (cursor.isAfter(until)) {
            log.warn("Admin alert scan cursor {} is ahead of application time {}; resetting it", cursor, until);
            state.setLastScannedAt(until);
            cursor = until;
        }
        Instant from = cursor.minus(SCAN_OVERLAP);

        List<Order> newOrders = orders.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(from, until);
        Set<String> existingOrderIds = sourceIds("ORDER", newOrders.stream().map(Order::getId).toList());
        for (Order order : newOrders) {
            if (existingOrderIds.contains(order.getId())) continue;
            AdminAlert alert = newAlert("ORDER", order.getId(), "New customer order",
                    customerName(order.getUser().getDisplayName()), order.getId(), order.getOrderNumber(),
                    order.getCreatedAt());
            alerts.save(alert);
        }

        List<ReturnRequest> newRequests = returnRequests
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(from, until);
        List<ReturnRequest> refunds = newRequests.stream()
                .filter(request -> !"REPLACEMENT".equals(request.getResolution())).toList();
        List<ReturnRequest> replacements = newRequests.stream()
                .filter(request -> "REPLACEMENT".equals(request.getResolution())).toList();
        Set<String> existingRefundIds = sourceIds("REFUND", refunds.stream().map(ReturnRequest::getId).toList());
        Set<String> existingReplacementIds = sourceIds("REPLACEMENT",
                replacements.stream().map(ReturnRequest::getId).toList());
        for (ReturnRequest request : newRequests) {
            String type = "REPLACEMENT".equals(request.getResolution()) ? "REPLACEMENT" : "REFUND";
            if (("REPLACEMENT".equals(type) ? existingReplacementIds : existingRefundIds).contains(request.getId())) continue;
            String title = "REPLACEMENT".equals(type) ? "New replacement request" : "New refund request";
            alerts.save(newAlert(type, request.getId(), title,
                    customerName(request.getUser().getDisplayName()), request.getOrder().getId(),
                    request.getOrder().getOrderNumber(), request.getCreatedAt()));
        }
        state.setLastScannedAt(until);
    }

    private void resolveCompletedEvents() {
        List<AdminAlert> active = alerts.findByAcknowledgedAtIsNullAndResolvedAtIsNull();
        List<String> orderIds = active.stream().filter(alert -> "ORDER".equals(alert.getSourceType()))
                .map(AdminAlert::getSourceId).distinct().toList();
        List<String> requestIds = active.stream().filter(alert -> !"ORDER".equals(alert.getSourceType()))
                .map(AdminAlert::getSourceId).distinct().toList();
        Map<String, Order> currentOrders = new HashMap<>();
        orders.findAllById(orderIds).forEach(order -> currentOrders.put(order.getId(), order));
        Map<String, ReturnRequest> currentRequests = new HashMap<>();
        returnRequests.findAllById(requestIds).forEach(request -> currentRequests.put(request.getId(), request));
        for (AdminAlert alert : active) {
            boolean resolved;
            if ("ORDER".equals(alert.getSourceType())) {
                Order order = currentOrders.get(alert.getSourceId());
                resolved = order == null || "CANCELLED".equals(order.getStatus())
                        || "DELIVERED".equals(order.getStatus());
            } else {
                ReturnRequest request = currentRequests.get(alert.getSourceId());
                resolved = request == null || switch (request.getStatus()) {
                    case "REJECTED", "CANCELLED", "REPLACED", "REFUNDED" -> true;
                    default -> false;
                };
            }
            if (resolved) alert.setResolvedAt(Instant.now());
        }
    }

    private Set<String> sourceIds(String type, Collection<String> sourceIds) {
        if (sourceIds.isEmpty()) return Set.of();
        return alerts.findBySourceTypeAndSourceIdIn(type, sourceIds).stream()
                .map(AdminAlert::getSourceId).collect(Collectors.toSet());
    }

    private AdminAlert newAlert(String type, String sourceId, String title, String customerName,
                                String orderId, String orderNumber, Instant eventAt) {
        AdminAlert alert = new AdminAlert();
        alert.setSourceType(type);
        alert.setSourceId(sourceId);
        alert.setTitle(title);
        alert.setCustomerName(customerName);
        alert.setOrderId(orderId);
        alert.setOrderNumber(orderNumber);
        alert.setEventAt(eventAt);
        return alert;
    }

    private AlertResponse response(AdminAlert alert) {
        return new AlertResponse(alert.getId(), alert.getSourceType(), alert.getTitle(), alert.getSourceId(),
                alert.getCustomerName(), alert.getOrderId(), alert.getOrderNumber(), alert.getEventAt(),
                alert.getAcknowledgedAt(), alert.getResolvedAt());
    }

    private String customerName(String value) {
        return value == null || value.isBlank() ? "Customer" : value;
    }
}
