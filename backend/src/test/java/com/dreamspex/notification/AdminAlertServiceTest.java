package com.dreamspex.notification;

import com.dreamspex.auth.entity.User;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import java.time.Instant;
import java.time.Duration;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.ArgumentCaptor;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AdminAlertServiceTest {
    @Mock AdminAlertRepository alerts;
    @Mock AdminAlertScanStateRepository scanStates;
    @Mock OrderRepository orders;
    @Mock ReturnRequestRepository returnRequests;

    private AdminAlertService service;
    private final List<AdminAlert> savedAlerts = new ArrayList<>();

    @BeforeEach
    void setUp() {
        service = new AdminAlertService(alerts, scanStates, orders, returnRequests);
    }

    private void stubAlertStorage() {
        when(alerts.save(any(AdminAlert.class))).thenAnswer(invocation -> {
            AdminAlert alert = invocation.getArgument(0);
            savedAlerts.add(alert);
            return alert;
        });
        when(alerts.findBySourceTypeAndSourceIdIn(anyString(), any()))
                .thenAnswer(invocation -> savedAlerts.stream()
                        .filter(alert -> alert.getSourceType().equals(invocation.getArgument(0))
                                && ((java.util.Collection<?>) invocation.getArgument(1)).contains(alert.getSourceId()))
                        .toList());
        when(alerts.findByAcknowledgedAtIsNullAndResolvedAtIsNull()).thenReturn(List.of());
        when(alerts.findByAcknowledgedAtIsNullAndResolvedAtIsNullOrderByEventAtDesc())
                .thenAnswer(invocation -> List.copyOf(savedAlerts));
        when(alerts.findTop100ByOrderByEventAtDesc()).thenAnswer(invocation -> List.copyOf(savedAlerts));
    }

    @Test
    void createsDistinctOrderRefundAndReplacementAlertsFromNewEvents() {
        stubAlertStorage();
        Instant now = Instant.now();
        AdminAlertScanState cursor = new AdminAlertScanState(now.minusSeconds(60));
        when(scanStates.findForUpdate()).thenReturn(Optional.of(cursor));

        User orderCustomer = customer("Order customer");
        Order order = order("order-id", "DS-100", orderCustomer);
        User returnCustomer = customer("Return customer");
        ReturnRequest refund = returnRequest("refund-id", "REFUND", order("refund-order", "DS-101", returnCustomer), returnCustomer);
        ReturnRequest replacement = returnRequest("replacement-id", "REPLACEMENT",
                order("replacement-order", "DS-102", returnCustomer), returnCustomer);
        when(orders.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(any(), any()))
                .thenReturn(List.of(order));
        when(returnRequests.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(any(), any()))
                .thenReturn(List.of(refund, replacement));

        List<AdminAlertDtos.AlertResponse> response = service.list();
        service.list();

        assertEquals(3, response.size());
        assertEquals(3, savedAlerts.size());
        assertEquals(List.of("ORDER", "REFUND", "REPLACEMENT"),
                savedAlerts.stream().map(AdminAlert::getSourceType).toList());
        assertEquals("Order customer", savedAlerts.getFirst().getCustomerName());
        assertEquals("DS-101", savedAlerts.get(1).getOrderNumber());
        assertEquals("DS-102", savedAlerts.get(2).getOrderNumber());
        assertTrue(cursor.getLastScannedAt().isAfter(now));
    }

    @Test
    void rescansOverlapWindowToFindRowsCommittedBehindTheCursorWithoutDuplicates() {
        stubAlertStorage();
        Instant cursorTime = Instant.now().minusSeconds(30);
        AdminAlertScanState cursor = new AdminAlertScanState(cursorTime);
        when(scanStates.findForUpdate()).thenReturn(Optional.of(cursor));

        Order lateCommittedOrder = order("order-id", "DS-200", customer("Late customer"));
        User returnCustomer = customer("Late return customer");
        ReturnRequest lateRefund = returnRequest("refund-id", "REFUND",
                order("refund-order", "DS-201", returnCustomer), returnCustomer);
        ReturnRequest lateReplacement = returnRequest("replacement-id", "REPLACEMENT",
                order("replacement-order", "DS-202", returnCustomer), returnCustomer);
        when(orders.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(any(), any()))
                .thenReturn(List.of(lateCommittedOrder));
        when(returnRequests.findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(any(), any()))
                .thenReturn(List.of(lateRefund, lateReplacement));

        service.list();
        service.list();

        ArgumentCaptor<Instant> from = ArgumentCaptor.forClass(Instant.class);
        ArgumentCaptor<Instant> until = ArgumentCaptor.forClass(Instant.class);
        verify(orders, org.mockito.Mockito.times(2))
                .findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(from.capture(), until.capture());
        assertTrue(Duration.between(from.getAllValues().getFirst(), cursorTime).compareTo(Duration.ofMinutes(4)) >= 0);
        assertTrue(Duration.between(from.getAllValues().getFirst(), cursorTime).compareTo(Duration.ofMinutes(6)) <= 0);
        assertEquals(List.of("ORDER", "REFUND", "REPLACEMENT"),
                savedAlerts.stream().map(AdminAlert::getSourceType).toList());
        assertEquals(3, savedAlerts.size());
    }

    @Test
    void acknowledgementIsPersistentAndIdempotent() {
        AdminAlert alert = new AdminAlert();
        alert.setSourceType("ORDER");
        alert.setSourceId("order-id");
        alert.setTitle("New customer order");
        alert.setCustomerName("Customer");
        alert.setOrderId("order-id");
        alert.setOrderNumber("DS-100");
        alert.setEventAt(Instant.now());
        when(alerts.findById(alert.getId())).thenReturn(Optional.of(alert));

        AdminAlertDtos.AlertResponse first = service.acknowledge(alert.getId());
        Instant acknowledgedAt = first.acknowledgedAt();
        AdminAlertDtos.AlertResponse second = service.acknowledge(alert.getId());

        assertNotNull(acknowledgedAt);
        assertEquals(acknowledgedAt, second.acknowledgedAt());
    }

    private User customer(String name) {
        User user = new User();
        user.setDisplayName(name);
        return user;
    }

    private Order order(String id, String orderNumber, User customer) {
        Order order = new Order();
        order.setUser(customer);
        order.setOrderNumber(orderNumber);
        order.setStatus("PENDING_PAYMENT");
        return order;
    }

    private ReturnRequest returnRequest(String id, String resolution, Order order, User customer) {
        ReturnRequest request = new ReturnRequest();
        request.setResolution(resolution);
        request.setOrder(order);
        request.setUser(customer);
        return request;
    }
}
