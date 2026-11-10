package com.dreamspex.delivery;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.returns.ReturnService;
import com.dreamspex.returns.ReturnStatusHistoryRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.transaction.annotation.Transactional;

import static com.dreamspex.delivery.DeliveryBatchDtos.*;
import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@Transactional
class DeliveryBatchServiceIntegrationTest {
    @Autowired DeliveryBatchService service;
    @Autowired DeliveryBatchRepository batches;
    @Autowired UserRepository users;
    @Autowired OrderRepository orders;
    @Autowired DeliveryBatchOrderRepository batchOrders;
    @Autowired DeliveryBatchLinkRepository batchLinks;
    @Autowired ObjectMapper mapper;
    @Autowired ReturnRequestRepository returnRequests;
    @Autowired ReturnStatusHistoryRepository returnHistory;
    @Autowired ReturnService returnService;

    @Test
    void tracksEachOrderAndRequiresItsOwnOtpBeforeChangingOrderDeliveryStatus() {
        User admin = user("admin");
        Order first = order(user("customer-one"), "500001");
        Order second = order(user("customer-two"), "500001");
        setCoordinates(first);

        CreatedBatch created = service.create(admin,
                new CreateBatchRequest("Madhapur route", List.of(first.getId(), second.getId()), false));
        assertEquals(2, created.batch().total());
        assertEquals(2, created.deliveryOtps().stream().map(OneTimeOtp::otp).distinct().count());

        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        DriverBatch driverView = service.getDriverBatch(token);
        assertEquals(2, driverView.orders().size());
        DriverOrder firstDelivery = driverView.orders().stream()
                .filter(item -> item.id().equals(first.getId())).findFirst().orElseThrow();
        DriverOrder secondDelivery = driverView.orders().stream()
                .filter(item -> item.id().equals(second.getId())).findFirst().orElseThrow();
        assertEquals("IN", firstDelivery.countryCode());
        assertEquals(new BigDecimal("17.385"), firstDelivery.latitude());
        assertEquals(new BigDecimal("78.4867"), firstDelivery.longitude());
        assertNull(secondDelivery.latitude());
        assertNull(secondDelivery.longitude());

        String firstOtp = created.deliveryOtps().stream().filter(otp -> otp.orderId().equals(first.getId()))
                .findFirst().orElseThrow().otp();
        String secondOtp = created.deliveryOtps().stream().filter(otp -> otp.orderId().equals(second.getId()))
                .findFirst().orElseThrow().otp();

        advanceToOutForDelivery(token, first);
        StatusUpdateResult wrongOrderOtp = service.updateStatus(token, first.getId(),
                new StatusRequest("DELIVERED", null, secondOtp));
        assertTrue(wrongOrderOtp.rejected());
        assertEquals("SHIPPED", orders.findById(first.getId()).orElseThrow().getStatus());
        DeliveryBatchOrder firstAssignment = batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id())
                .stream().filter(item -> item.getOrder().getId().equals(first.getId())).findFirst().orElseThrow();
        DeliveryBatchOrder secondAssignment = batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id())
                .stream().filter(item -> item.getOrder().getId().equals(second.getId())).findFirst().orElseThrow();
        assertEquals(1, firstAssignment.getOtpAttempts());
        assertEquals(0, secondAssignment.getOtpAttempts());

        StatusUpdateResult firstDelivered = service.updateStatus(token, first.getId(),
                new StatusRequest("DELIVERED", null, firstOtp));
        assertFalse(firstDelivered.rejected());
        assertEquals("DELIVERED", orders.findById(first.getId()).orElseThrow().getStatus());
        assertEquals("PROCESSING", orders.findById(second.getId()).orElseThrow().getStatus());
        assertEquals(List.of("SHIPPED", "DELIVERED"), orders.findById(first.getId()).orElseThrow()
                .getHistory().stream().map(entry -> entry.getStatus()).toList());

        DriverBatch partial = service.getDriverBatch(token);
        assertEquals(2, partial.total());
        assertEquals(1, partial.delivered());
        assertEquals(1, partial.pending());
        assertEquals(1, service.listBatches().size());

        advanceToOutForDelivery(token, second);
        assertFalse(service.updateStatus(token, second.getId(),
                new StatusRequest("FAILED_ATTEMPT", "Customer unavailable.", null)).rejected());
        BatchSummary failedBatch = service.listBatches().getFirst();
        assertEquals(0, failedBatch.pending());
        assertEquals(1, failedBatch.failed());

        service.updateStatus(token, second.getId(), new StatusRequest("OUT_FOR_DELIVERY", null, null));
        assertFalse(service.updateStatus(token, second.getId(),
                new StatusRequest("DELIVERED", null, secondOtp)).rejected());
        assertTrue(service.listBatches().isEmpty());
        assertTrue(batches.findById(created.batch().id()).isPresent());
    }

    @Test
    void rejectsOrdersFromDifferentRoutesAndPreventsActiveDuplicateAssignment() {
        User admin = user("admin");
        Order first = order(user("customer-one"), "500001");
        Order otherPin = order(user("customer-two"), "500032");

        assertThrows(RuntimeException.class, () -> service.create(admin,
                new CreateBatchRequest("Madhapur route", List.of(first.getId(), otherPin.getId()), false)));
        assertTrue(batchOrders.findAll().isEmpty());

        CreatedBatch original = service.create(admin,
                new CreateBatchRequest("Madhapur route", List.of(first.getId()), false));
        RuntimeException duplicate = assertThrows(RuntimeException.class, () -> service.create(admin,
                new CreateBatchRequest("Another route", List.of(first.getId()), false)));
        assertTrue(duplicate.getMessage().contains("already assigned"));

        CreatedBatch reassigned = service.create(admin,
                new CreateBatchRequest("Another route", List.of(first.getId()), true));
        assertEquals("REASSIGNED", batchOrders.findByBatchIdOrderByCreatedAtAsc(original.batch().id())
                .getFirst().getStatus());
        assertEquals(first.getId(), batchOrders.findByBatchIdOrderByCreatedAtAsc(reassigned.batch().id())
                .getFirst().getActiveOrderId());
    }

    @Test
    void revokedLinksStopWorkingAndCanBeRegeneratedWithoutClosingBatch() {
        User admin = user("admin");
        Order order = order(user("customer"), "500001");
        CreatedBatch created = service.create(admin, new CreateBatchRequest("Central", List.of(order.getId()), false));
        String oldToken = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);

        service.revokeLink(created.batch().id());
        assertThrows(RuntimeException.class, () -> service.getDriverBatch(oldToken));

        CreatedBatch regenerated = service.regenerateLink(admin, created.batch().id());
        String newToken = regenerated.linkPath().substring(regenerated.linkPath().lastIndexOf('/') + 1);
        assertNotEquals(oldToken, newToken);
        assertEquals(1, service.getDriverBatch(newToken).orders().size());
    }

    @Test
    void viewingBatchDetailsDoesNotRotateTheLinkOrDeliveryOtps() {
        User admin = user("admin");
        Order order = order(user("customer"), "500001");
        CreatedBatch created = service.create(admin, new CreateBatchRequest("Central", List.of(order.getId()), false));
        DeliveryBatchOrder assignment = batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id())
                .getFirst();
        String originalOtpHash = assignment.getDeliveryOtpHash();
        long originalLinkCount = batchLinks.count();

        BatchDetails details = service.getBatchDetails(created.batch().id());
        ActiveBatchLink activeLink = service.getActiveLink(created.batch().id());

        assertEquals(1, details.orders().size());
        assertEquals("PENDING", details.orders().getFirst().status());
        assertEquals(1, details.orders().getFirst().history().size());
        assertTrue(details.activeLinkAvailable());
        assertTrue(details.activeLinkRecoverable());
        assertTrue(activeLink.available());
        assertEquals(created.linkPath(), activeLink.linkPath());
        assertEquals(originalOtpHash, assignment.getDeliveryOtpHash());
        assertEquals(originalLinkCount, batchLinks.count());
    }

    @Test
    void detailsReportRevokedLinkWithoutRegeneratingIt() {
        User admin = user("admin");
        Order order = order(user("customer"), "500001");
        CreatedBatch created = service.create(admin, new CreateBatchRequest("Central", List.of(order.getId()), false));
        service.revokeLink(created.batch().id());

        BatchDetails details = service.getBatchDetails(created.batch().id());

        assertFalse(details.activeLinkAvailable());
        assertFalse(service.getActiveLink(created.batch().id()).available());
    }

    @Test
    void regeneratingOneOrderOtpInvalidatesThePreviousCodeAndKeepsTheBatchLink() {
        User admin = user("admin");
        Order order = order(user("customer"), "500001");
        Order otherOrder = order(user("other-customer"), "500001");
        CreatedBatch created = service.create(admin,
                new CreateBatchRequest("Central", List.of(order.getId(), otherOrder.getId()), false));
        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        String originalOtp = created.deliveryOtps().stream()
                .filter(entry -> entry.orderId().equals(order.getId())).findFirst().orElseThrow().otp();
        String otherOtp = created.deliveryOtps().stream()
                .filter(entry -> entry.orderId().equals(otherOrder.getId())).findFirst().orElseThrow().otp();
        DeliveryBatchOrder assignment = batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id()).stream()
                .filter(item -> item.getOrder().getId().equals(order.getId())).findFirst().orElseThrow();
        String originalHash = assignment.getDeliveryOtpHash();

        advanceToOutForDelivery(token, order);
        String wrongOtp = "999999".equals(originalOtp) ? "888888" : "999999";
        assertTrue(service.updateStatus(token, order.getId(),
                new StatusRequest("DELIVERED", null, wrongOtp)).rejected());
        assertEquals(1, assignment.getOtpAttempts());

        OneTimeOtp replacement = service.regenerateOrderOtp(created.batch().id(), order.getId());

        assertEquals(order.getId(), replacement.orderId());
        assertEquals("Recipient", replacement.recipientName());
        assertEquals("+919900000000", replacement.phone());
        assertEquals(6, replacement.otp().length());
        assertNotEquals(originalOtp, replacement.otp());
        assertNotEquals(otherOtp, replacement.otp());
        assertNotEquals(originalHash, assignment.getDeliveryOtpHash());
        assertEquals(0, assignment.getOtpAttempts());
        assertNull(assignment.getOtpConsumedAt());
        assertEquals(created.linkPath(), service.getActiveLink(created.batch().id()).linkPath());
        assertTrue(service.updateStatus(token, order.getId(),
                new StatusRequest("DELIVERED", null, originalOtp)).rejected());
        assertFalse(service.updateStatus(token, order.getId(),
                new StatusRequest("DELIVERED", null, replacement.otp())).rejected());
    }

    @Test
    void completedOrderCannotReceiveAnotherOtpAndGetViewsNeverExposeOtps() throws Exception {
        User admin = user("admin");
        Order order = order(user("customer"), "500001");
        CreatedBatch created = service.create(admin, new CreateBatchRequest("Central", List.of(order.getId()), false));
        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        String otp = created.deliveryOtps().getFirst().otp();
        advanceToOutForDelivery(token, order);
        assertFalse(service.updateStatus(token, order.getId(), new StatusRequest("DELIVERED", null, otp)).rejected());

        DeliveryBatchOrder assignment = batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id()).getFirst();
        String completedHash = assignment.getDeliveryOtpHash();
        assertThrows(RuntimeException.class,
                () -> service.regenerateOrderOtp(created.batch().id(), order.getId()));

        String adminDetails = mapper.writeValueAsString(service.getBatchDetails(created.batch().id()));
        String driverDetails = mapper.writeValueAsString(service.getDriverBatch(token));
        assertFalse(adminDetails.contains("\"otp\""));
        assertFalse(driverDetails.contains("\"otp\""));
        assertFalse(adminDetails.contains("deliveryOtpHash"));
        assertFalse(driverDetails.contains("deliveryOtpHash"));
        assertEquals(completedHash, assignment.getDeliveryOtpHash());
    }

    @Test
    void regeneratingBatchLinkReturnsOtpsOnlyForUnfinishedOrders() {
        User admin = user("admin");
        Order deliveredOrder = order(user("customer-one"), "500001");
        Order pendingOrder = order(user("customer-two"), "500001");
        CreatedBatch created = service.create(admin, new CreateBatchRequest(
                "Central", List.of(deliveredOrder.getId(), pendingOrder.getId()), false));
        String deliveredOtp = created.deliveryOtps().stream()
                .filter(entry -> entry.orderId().equals(deliveredOrder.getId())).findFirst().orElseThrow().otp();
        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        advanceToOutForDelivery(token, deliveredOrder);
        assertFalse(service.updateStatus(token, deliveredOrder.getId(),
                new StatusRequest("DELIVERED", null, deliveredOtp)).rejected());

        CreatedBatch regenerated = service.regenerateLink(admin, created.batch().id());

        assertEquals(List.of(pendingOrder.getId()),
                regenerated.deliveryOtps().stream().map(OneTimeOtp::orderId).toList());
        assertNotEquals(deliveredOtp, regenerated.deliveryOtps().getFirst().otp());
    }

    @Test
    void returnPickupBatchVerifiesPerRequestOtpWithoutChangingReturnOrOrderWorkflow() {
        User admin = user("admin");
        Order order = order(user("return-customer"), "500001");
        setCoordinates(order);
        Order otherOrder = order(user("other-return-customer"), "500001");
        ReturnRequest request = returnRequest(order, "REFUND", "PICKUP_SCHEDULED");
        ReturnRequest otherRequest = returnRequest(otherOrder, "REFUND", "APPROVED");
        var eligible = service.eligibleReturnRequests("RETURN_PICKUP", "Hyderabad", "Telangana", "500001");
        assertTrue(eligible.stream().anyMatch(item -> item.id().equals(request.getId())));

        CreatedBatch created = service.createReturnBatch(admin, "RETURN_PICKUP",
                new CreateReturnBatchRequest("Hyderabad return route", List.of(request.getId(), otherRequest.getId())));
        OneTimeOtp otp = created.deliveryOtps().stream()
                .filter(item -> item.orderId().equals(request.getId())).findFirst().orElseThrow();
        OneTimeOtp otherOtp = created.deliveryOtps().stream()
                .filter(item -> item.orderId().equals(otherRequest.getId())).findFirst().orElseThrow();
        assertNotEquals(otp.otp(), otherOtp.otp());
        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        DriverBatch driver = service.getDriverBatch(token);
        assertEquals("RETURN_PICKUP", driver.operationType());
        assertEquals(2, driver.orders().size());
        DriverOrder pickup = driver.orders().stream().filter(item -> item.id().equals(request.getId()))
                .findFirst().orElseThrow();
        assertEquals(new BigDecimal("17.385"), pickup.latitude());
        assertEquals(new BigDecimal("78.4867"), pickup.longitude());
        assertFalse(mapper.valueToTree(driver).toString().contains(otp.otp()));
        assertFalse(mapper.valueToTree(service.getReturnBatchDetails("RETURN_PICKUP", created.batch().id()))
                .toString().contains(otp.otp()));

        StatusUpdateResult wrongCode = service.updateStatus(token, request.getId(),
                new StatusRequest("PICKED_UP", null, "000000".equals(otp.otp()) ? "000001" : "000000"));
        assertTrue(wrongCode.rejected());
        assertEquals(1, batchOrders.findByBatchIdOrderByCreatedAtAsc(created.batch().id()).stream()
                .filter(item -> item.getReturnRequest().getId().equals(request.getId()))
                .findFirst().orElseThrow().getOtpAttempts());
        StatusUpdateResult pickedUp = service.updateStatus(token, request.getId(),
                new StatusRequest("PICKED_UP", null, otp.otp()));
        assertFalse(pickedUp.rejected());
        assertEquals("PICKED_UP", returnRequests.findById(request.getId()).orElseThrow().getStatus());
        assertEquals(List.of("PICKED_UP"), returnHistory
                .findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                .map(event -> event.getStatus()).toList());
        var customerReturns = returnService.customerList(
                new UsernamePasswordAuthenticationToken(order.getUser().getId(), null, List.of()));
        var customerView = customerReturns.stream().filter(item -> item.id().equals(request.getId()))
                .findFirst().orElseThrow();
        assertEquals("PICKED_UP", customerView.status());
        assertEquals(List.of("PICKED_UP"), customerView.history().stream()
                .map(event -> event.status()).toList());
        var adminView = returnService.adminGet(request.getId());
        assertEquals("PICKED_UP", adminView.status());
        assertEquals(List.of("PICKED_UP"), adminView.history().stream()
                .map(event -> event.status()).toList());
        assertThrows(RuntimeException.class, () -> service.updateStatus(token, request.getId(),
                new StatusRequest("PICKED_UP", null, otp.otp())));
        assertEquals("DELIVERED", order.getStatus());
        assertEquals("APPROVED", returnRequests.findById(otherRequest.getId()).orElseThrow().getStatus());
        assertFalse(service.updateStatus(token, otherRequest.getId(),
                new StatusRequest("FAILED_ATTEMPT", "Pickup could not be completed.", null)).rejected());
        assertEquals("PICKED_UP", service.getDriverBatch(token).orders().stream()
                .filter(item -> item.id().equals(request.getId())).findFirst().orElseThrow().status());
        assertTrue(service.getDriverBatch(token).orders().stream()
                .filter(item -> item.id().equals(request.getId())).findFirst().orElseThrow().history().stream()
                .anyMatch(event -> "PICKED_UP".equals(event.status())
                        && "RETURN_REQUEST".equals(event.source())));
        assertEquals(1, service.getDriverBatch(token).completed());
        assertEquals(0, service.getDriverBatch(token).pending());
        assertEquals(1, service.getDriverBatch(token).failed());
        assertEquals("OPEN", service.listReturnBatches("RETURN_PICKUP").getFirst().status());
        assertEquals(1, service.listReturnBatches("RETURN_PICKUP").getFirst().failed());

        assertFalse(service.updateStatus(token, otherRequest.getId(),
                new StatusRequest("PICKED_UP", null, otherOtp.otp())).rejected());
        assertTrue(service.listReturnBatches("RETURN_PICKUP").isEmpty());
        assertTrue(batches.findById(created.batch().id()).isPresent());
    }

    @Test
    void replacementDeliveryUsesIndependentOtpAndDoesNotMutateReplacementProcessing() {
        User admin = user("admin");
        Order order = order(user("replacement-customer"), "500001");
        setCoordinates(order);
        ReturnRequest request = returnRequest(order, "REPLACEMENT", "REPLACEMENT_PROCESSING");
        assertTrue(service.eligibleReturnRequests("REPLACEMENT_DELIVERY", null, null, null).stream()
                .anyMatch(item -> item.id().equals(request.getId())));
        CreatedBatch created = service.createReturnBatch(admin, "REPLACEMENT_DELIVERY",
                new CreateReturnBatchRequest("Replacement route", List.of(request.getId())));
        OneTimeOtp otp = created.deliveryOtps().getFirst();
        String token = created.linkPath().substring(created.linkPath().lastIndexOf('/') + 1);
        assertEquals(new BigDecimal("17.385"), service.getDriverBatch(token).orders().getFirst().latitude());
        assertEquals(new BigDecimal("78.4867"), service.getDriverBatch(token).orders().getFirst().longitude());

        service.updateStatus(token, request.getId(), new StatusRequest("PACKED", null, null));
        service.updateStatus(token, request.getId(), new StatusRequest("PICKED_UP", null, null));
        service.updateStatus(token, request.getId(), new StatusRequest("OUT_FOR_DELIVERY", null, null));
        assertTrue(service.updateStatus(token, request.getId(),
                new StatusRequest("DELIVERED", null, "000000".equals(otp.otp()) ? "000001" : "000000")).rejected());
        assertFalse(service.updateStatus(token, request.getId(),
                new StatusRequest("DELIVERED", null, otp.otp())).rejected());

        assertEquals("REPLACEMENT_PROCESSING", returnRequests.findById(request.getId()).orElseThrow().getStatus());
        assertEquals("DELIVERED", orders.findById(order.getId()).orElseThrow().getStatus());
        assertEquals(1, service.getDriverBatch(token).completed());
    }

    @Test
    void routeFilteringAndAssignmentsAreIndependentByReturnRequest() {
        User admin = user("admin");
        ReturnRequest target = returnRequest(order(user("target"), "500001"), "REFUND", "PICKUP_SCHEDULED");
        ReturnRequest otherPin = returnRequest(order(user("other"), "500032"), "REFUND", "APPROVED");
        assertEquals(List.of(target.getId()), service.eligibleReturnRequests(
                "RETURN_PICKUP", "Hyderabad", "Telangana", "500001").stream().map(
                DeliveryBatchService.EligibleReturnRequest::id).toList());

        service.createReturnBatch(admin, "RETURN_PICKUP",
                new CreateReturnBatchRequest("Central", List.of(target.getId())));
        assertFalse(service.eligibleReturnRequests("RETURN_PICKUP", null, null, null).stream()
                .anyMatch(item -> item.id().equals(target.getId())));
        assertTrue(service.eligibleReturnRequests("RETURN_PICKUP", null, null, null).stream()
                .anyMatch(item -> item.id().equals(otherPin.getId())));
        assertThrows(RuntimeException.class, () -> service.createReturnBatch(admin, "RETURN_PICKUP",
                new CreateReturnBatchRequest("Duplicate", List.of(target.getId()))));
    }

    private void advanceToOutForDelivery(String token, Order order) {
        service.updateStatus(token, order.getId(), new StatusRequest("PACKED", null, null));
        service.updateStatus(token, order.getId(), new StatusRequest("PICKED_UP", null, null));
        service.updateStatus(token, order.getId(), new StatusRequest("OUT_FOR_DELIVERY", null, null));
        assertEquals("SHIPPED", orders.findById(order.getId()).orElseThrow().getStatus());
    }

    private User user(String label) {
        User user = new User();
        user.setEmail(label + "-" + UUID.randomUUID() + "@example.test");
        user.setPasswordHash("test-hash");
        user.setDisplayName(label);
        user.setStatus("ACTIVE");
        return users.saveAndFlush(user);
    }

    private Order order(User customer, String postalCode) {
        Order order = new Order();
        order.setUser(customer);
        order.setOrderNumber("DS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16));
        order.setAddressId(UUID.randomUUID().toString());
        order.setAddressSnapshot("""
                {"recipientName":"Recipient","phone":"+919900000000","line1":"1 Test Road","line2":"","city":"Hyderabad","state":"Telangana","postalCode":"%s","countryCode":"IN"}
                """.formatted(postalCode));
        order.setStatus("PROCESSING");
        order.setPaymentStatus("PAID");
        order.setSubtotal(BigDecimal.TEN);
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setShippingAmount(BigDecimal.ZERO);
        order.setTotalAmount(BigDecimal.TEN);
        order.setIdempotencyKey(UUID.randomUUID().toString());
        return orders.saveAndFlush(order);
    }

    private void setCoordinates(Order order) {
        order.setAddressSnapshot("""
                {"recipientName":"Recipient","phone":"+919900000000","line1":"1 Test Road","line2":"","city":"Hyderabad","state":"Telangana","postalCode":"500001","countryCode":"IN","latitude":17.385,"longitude":78.4867}
                """);
        orders.saveAndFlush(order);
    }

    private ReturnRequest returnRequest(Order order, String resolution, String status) {
        order.setStatus("DELIVERED");
        orders.saveAndFlush(order);
        ReturnRequest request = new ReturnRequest();
        request.setRequestNumber("DSR-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        request.setOrder(order);
        request.setUser(order.getUser());
        request.setResolution(resolution);
        request.setReasonCode("OTHER");
        request.setStatus(status);
        request.setRefundAmount(BigDecimal.ZERO);
        return returnRequests.saveAndFlush(request);
    }
}
