package com.dreamspex.delivery;
import com.dreamspex.auth.entity.User;
import com.dreamspex.loyalty.LoyaltyService;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.SecurityProperties;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderStatusHistory;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.returns.ReturnStatusHistory;
import com.dreamspex.returns.ReturnStatusHistoryRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import javax.crypto.Cipher;
import javax.crypto.Mac;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import static com.dreamspex.delivery.DeliveryBatchDtos.*;

@Service
public class DeliveryBatchService {
    @Autowired private LoyaltyService loyaltyService;
    private static final Duration LINK_LIFETIME = Duration.ofHours(72);
    private static final int MAX_OTP_ATTEMPTS = 5;
    private static final Set<String> DRIVER_STATUSES =
            Set.of("PACKED", "PICKED_UP", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT", "DELIVERED");

    private final DeliveryBatchRepository batches;
    private final DeliveryBatchOrderRepository batchOrders;
    private final DeliveryBatchLinkRepository links;
    private final DeliveryBatchOrderHistoryRepository history;
    private final OrderRepository orders;
    private final ReturnRequestRepository returnRequests;
    private final ReturnStatusHistoryRepository returnHistory;
    private final ObjectMapper mapper;
    private final SecurityProperties security;
    private final SecureRandom random = new SecureRandom();

    public DeliveryBatchService(DeliveryBatchRepository batches, DeliveryBatchOrderRepository batchOrders,
                                DeliveryBatchLinkRepository links, DeliveryBatchOrderHistoryRepository history,
                                OrderRepository orders, ReturnRequestRepository returnRequests,
                                ReturnStatusHistoryRepository returnHistory, ObjectMapper mapper,
                                SecurityProperties security) {
        this.batches = batches;
        this.batchOrders = batchOrders;
        this.links = links;
        this.history = history;
        this.orders = orders;
        this.returnRequests = returnRequests;
        this.returnHistory = returnHistory;
        this.mapper = mapper;
        this.security = security;
    }

    @Transactional(readOnly = true)
    public List<EligibleOrder> eligibleOrders(String postalCode, String city, boolean includeAssigned) {
        Set<String> activeOrderIds = batchOrders.findByActiveOrderIdIsNotNull().stream()
                .map(DeliveryBatchOrder::getActiveOrderId).collect(java.util.stream.Collectors.toSet());
        return orders.findAllByOrderByCreatedAtDesc().stream()
                .filter(order -> "PROCESSING".equals(order.getStatus()) && "PAID".equals(order.getPaymentStatus()))
                .filter(order -> includeAssigned || !activeOrderIds.contains(order.getId()))
                .map(order -> eligibleOrder(order, postalCode, city))
                .filter(java.util.Objects::nonNull)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<BatchSummary> listBatches() {
        return listBatchesRequiringAttention("NORMAL_DELIVERY");
    }

    @Transactional(readOnly = true)
    public BatchDetails getBatchDetails(String batchId) {
        DeliveryBatch batch = batches.findById(batchId)
                .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        if (!"NORMAL_DELIVERY".equals(batch.getOperationType())) {
            throw notFound("DELIVERY_BATCH_NOT_FOUND", "Normal delivery batch was not found.");
        }
        List<DriverOrder> batchItems = batchOrders.findByBatchIdOrderByCreatedAtAsc(batchId).stream()
                .map(this::driverOrder).toList();
        BatchSummary batchSummary = summary(batch);
        ActiveBatchLink link = activeLink(batchId);
        return new BatchDetails(batchSummary, batchItems, link.available(),
                link.available() && link.linkPath() != null, link.expiresAt());
    }

    @Transactional(readOnly = true)
    public ActiveBatchLink getActiveLink(String batchId) {
        if (!batches.findById(batchId).filter(batch -> "NORMAL_DELIVERY".equals(batch.getOperationType())).isPresent()) {
            throw notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found.");
        }
        return activeLink(batchId);
    }

    @Transactional(readOnly = true)
    public List<EligibleReturnRequest> eligibleReturnRequests(String operationType, String city,
                                                               String state, String postalCode) {
        validateReturnOperation(operationType);
        Set<String> assigned = batchOrders.findByActiveReturnRequestIdIsNotNull().stream()
                .map(DeliveryBatchOrder::getActiveReturnRequestId).collect(java.util.stream.Collectors.toSet());
        return returnRequests.findAllByOrderByCreatedAtDesc().stream()
                .filter(request -> !assigned.contains(request.getId()))
                .filter(request -> eligibleReturnStatus(request, operationType))
                .map(request -> eligibleReturn(request, operationType, city, state, postalCode))
                .filter(java.util.Objects::nonNull).toList();
    }

    @Transactional(readOnly = true)
    public List<BatchSummary> listReturnBatches(String operationType) {
        validateReturnOperation(operationType);
        return listBatchesRequiringAttention(operationType);
    }

    @Transactional
    public CreatedBatch createReturnBatch(User admin, String operationType, CreateReturnBatchRequest request) {
        validateReturnOperation(operationType);
        if (request.requestIds() == null || request.requestIds().isEmpty()) {
            throw invalid("Select at least one request for the delivery batch.");
        }
        List<String> ids = request.requestIds().stream().distinct().sorted().toList();
        if (ids.size() != request.requestIds().size()) {
            throw invalid("Duplicate requests are not allowed in a delivery batch.");
        }
        List<ReturnRequest> selected = returnRequests.findAllByIdsForUpdate(ids);
        if (selected.size() != ids.size()) {
            throw notFound("RETURN_NOT_FOUND", "A return request was not found.");
        }
        selected.sort(Comparator.comparing(ReturnRequest::getId));
        AddressRoute route = addressRoute(selected.getFirst().getOrder());
        for (ReturnRequest requestItem : selected) {
            if (!eligibleReturnStatus(requestItem, operationType)) {
                throw conflict("RETURN_NOT_ELIGIBLE", "A selected return request is no longer eligible for this delivery.");
            }
            if (!route.matches(addressRoute(requestItem.getOrder()))) {
                throw invalid("All requests in a batch must share the same city, state, and postal code.");
            }
            if (batchOrders.findByActiveReturnRequestIdForUpdate(requestItem.getId()).isPresent()) {
                throw conflict("RETURN_ALREADY_ASSIGNED", "A request is already assigned to an active delivery batch.");
            }
        }
        DeliveryBatch batch = new DeliveryBatch();
        batch.setOperationType(operationType);
        batch.setRouteName(request.routeName().trim());
        batch.setCreatedBy(admin);
        for (ReturnRequest requestItem : selected) {
            DeliveryBatchOrder item = new DeliveryBatchOrder();
            item.setBatch(batch);
            item.setReturnRequest(requestItem);
            item.setActiveReturnRequestId(requestItem.getId());
            batch.getOrders().add(item);
        }
        List<OneTimeOtp> otpCodes = rotateOtps(batch);
        batches.save(batch);
        for (DeliveryBatchOrder item : batch.getOrders()) recordInitialStatus(item, admin);
        CreatedLink link = createLink(batch, admin);
        return new CreatedBatch(summary(batch), "/delivery/batch/" + link.token(), link.expiresAt(), otpCodes);
    }

    @Transactional(readOnly = true)
    public BatchDetails getReturnBatchDetails(String operationType, String batchId) {
        DeliveryBatch batch = requireReturnBatch(operationType, batchId);
        List<DriverOrder> items = batchOrders.findByBatchIdOrderByCreatedAtAsc(batchId).stream()
                .map(this::driverOrder).toList();
        ActiveBatchLink link = activeLink(batchId);
        return new BatchDetails(summary(batch), items, link.available(),
                link.available() && link.linkPath() != null, link.expiresAt());
    }

    @Transactional(readOnly = true)
    public ActiveBatchLink getReturnBatchActiveLink(String operationType, String batchId) {
        requireReturnBatch(operationType, batchId);
        return activeLink(batchId);
    }

    @Transactional
    public CreatedBatch regenerateReturnBatchLink(User admin, String operationType, String batchId) {
        requireReturnBatch(operationType, batchId);
        return regenerateLink(admin, batchId);
    }

    @Transactional
    public LinkRevocation revokeReturnBatchLink(String operationType, String batchId) {
        requireReturnBatchForUpdate(operationType, batchId);
        return revokeLink(batchId);
    }

    @Transactional
    public CreatedBatch create(User admin, CreateBatchRequest request) {
        if (request.orderIds() == null || request.orderIds().isEmpty()) {
            throw invalid("Select at least one order for the delivery batch.");
        }
        List<String> requestedIds = request.orderIds().stream().distinct().sorted().toList();
        if (requestedIds.size() != request.orderIds().size()) {
            throw invalid("Duplicate orders are not allowed in a delivery batch.");
        }

        List<Order> selected = new ArrayList<>();
        for (String id : requestedIds) {
            selected.add(orders.findByIdForUpdate(id)
                    .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "An order was not found.")));
        }
        selected.sort(Comparator.comparing(Order::getId));

        AddressRoute route = addressRoute(selected.get(0));
        for (Order order : selected) {
            if (!"PROCESSING".equals(order.getStatus()) || !"PAID".equals(order.getPaymentStatus())) {
                throw conflict("ORDER_NOT_ELIGIBLE", "Only paid orders in PROCESSING can be added to a batch.");
            }
            AddressRoute candidate = addressRoute(order);
            if (!route.matches(candidate)) {
                throw invalid("All orders in a batch must share the same city, state, and postal code.");
            }

            DeliveryBatchOrder existing = batchOrders.findByActiveOrderIdForUpdate(order.getId()).orElse(null);
            if (existing != null) {
                if (!request.reassignActiveOrders()) {
                    throw conflict("ORDER_ALREADY_ASSIGNED", "An order is already assigned to an active delivery batch.");
                }
                if (!Set.of("PENDING", "PACKED").contains(existing.getStatus())) {
                    throw conflict("ORDER_CANNOT_BE_REASSIGNED", "An order can only be reassigned before pickup.");
                }
                existing.setActiveOrderId(null);
                changeDeliveryStatus(existing, "REASSIGNED", "Explicitly reassigned by administrator.", "ADMIN", admin);
                updateBatchStatus(existing.getBatch());
            }
        }

        DeliveryBatch batch = new DeliveryBatch();
        batch.setRouteName(request.routeName().trim());
        batch.setCreatedBy(admin);
        for (Order order : selected) {
            DeliveryBatchOrder item = new DeliveryBatchOrder();
            item.setBatch(batch);
            item.setOrder(order);
            item.setActiveOrderId(order.getId());
            batch.getOrders().add(item);
        }
        List<OneTimeOtp> otpCodes = rotateOtps(batch);
        batches.save(batch);
        for (DeliveryBatchOrder item : batch.getOrders()) {
            recordInitialStatus(item, admin);
        }
        CreatedLink link = createLink(batch, admin);
        return new CreatedBatch(summary(batch), "/delivery/batch/" + link.token(),
                link.expiresAt(), otpCodes);
    }

    @Transactional
    public CreatedBatch regenerateLink(User admin, String batchId) {
        DeliveryBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        if (!"OPEN".equals(batch.getStatus())) {
            throw conflict("DELIVERY_BATCH_CLOSED", "A closed delivery batch cannot receive a new link.");
        }
        links.revokeActiveLinks(batchId, Instant.now());
        List<OneTimeOtp> otpCodes = rotateOtps(batch);
        CreatedLink link = createLink(batch, admin);
        batch.setUpdatedAt(Instant.now());
        return new CreatedBatch(summary(batch), "/delivery/batch/" + link.token(),
                link.expiresAt(), otpCodes);
    }

    @Transactional
    public OneTimeOtp regenerateOrderOtp(String batchId, String orderId) {
        DeliveryBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        if (!"OPEN".equals(batch.getStatus())) {
            throw conflict("DELIVERY_BATCH_CLOSED", "A closed delivery batch cannot receive a new OTP.");
        }
        DeliveryBatchOrder item = batchOrders.findByBatchAndOrderForUpdate(batchId, orderId)
                .orElseThrow(() -> notFound("DELIVERY_ORDER_NOT_FOUND", "Order is not part of this batch."));
        if (item.getActiveOrderId() == null || Set.of("DELIVERED", "REASSIGNED").contains(item.getStatus())
                || "DELIVERED".equals(item.getOrder().getStatus())) {
            throw conflict("DELIVERY_OTP_NOT_REGENERATABLE",
                    "A delivery OTP can only be regenerated for an unfinished order in this active batch.");
        }
        List<DeliveryBatchOrder> batchItems = batchOrders.findByBatchIdOrderByCreatedAtAsc(batchId);
        String code = newUniqueOtpCode(batchItems);
        item.setDeliveryOtpHash(otpHash(item.getId(), code));
        item.setOtpAttempts(0);
        item.setOtpConsumedAt(null);
        item.setOtpExpiresAt(Instant.now().plus(LINK_LIFETIME));
        item.setUpdatedAt(Instant.now());
        DriverOrder order = driverOrder(item);
        return new OneTimeOtp(orderId, order.orderNumber(), order.recipientName(), order.phone(), code, null);
    }

    @Transactional
    public LinkRevocation revokeLink(String batchId) {
        DeliveryBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        Instant revokedAt = Instant.now();
        links.revokeActiveLinks(batchId, revokedAt);
        return new LinkRevocation(summary(batch), revokedAt);
    }

    @Transactional
    public BatchSummary revokeBatch(User admin, String batchId) {
        DeliveryBatch batch = batches.findByIdForUpdate(batchId)
                .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        if (!"NORMAL_DELIVERY".equals(batch.getOperationType())) {
            throw notFound("DELIVERY_BATCH_NOT_FOUND", "Normal delivery batch was not found.");
        }
        List<DeliveryBatchOrder> items = batchOrders.findByBatchIdOrderByCreatedAtAsc(batchId);
        if (items.stream().anyMatch(item -> Set.of("PICKED_UP", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT")
                .contains(item.getStatus()))) {
            throw conflict("DELIVERY_BATCH_IN_PROGRESS",
                    "A batch with orders already picked up cannot be closed.");
        }
        links.revokeActiveLinks(batchId, Instant.now());
        batch.setStatus("REVOKED");
        batch.setUpdatedAt(Instant.now());
        for (DeliveryBatchOrder item : items) {
            if (item.getActiveOrderId() != null && !Set.of("PICKED_UP", "OUT_FOR_DELIVERY", "FAILED_ATTEMPT")
                    .contains(item.getStatus())) {
                item.setActiveOrderId(null);
                changeDeliveryStatus(item, "REASSIGNED", "Batch link revoked by administrator.", "ADMIN", admin);
            }
        }
        return summary(batch);
    }

    @Transactional(readOnly = true)
    public DriverBatch getDriverBatch(String rawToken) {
        DeliveryBatch batch = requireBatchByToken(rawToken);
        List<DriverOrder> driverOrders = batchOrders.findByBatchIdOrderByCreatedAtAsc(batch.getId()).stream()
                .filter(item -> !"REASSIGNED".equals(item.getStatus()))
                .map(this::driverOrder).toList();
        return driverBatch(batch, driverOrders);
    }

    @Transactional
    public StatusUpdateResult updateStatus(String rawToken, String orderId, StatusRequest request) {
        DeliveryBatch batch = requireBatchByToken(rawToken);
        DeliveryBatchOrder item = batchOrders.findByBatchAndOrderForUpdate(batch.getId(), orderId)
                .orElseGet(() -> batchOrders.findByBatchAndReturnRequestForUpdate(batch.getId(), orderId)
                        .orElseThrow(() -> notFound("DELIVERY_ORDER_NOT_FOUND",
                                "Order or request is not part of this active batch.")));
        String next = request.status().trim().toUpperCase(Locale.ROOT);
        if (!canTransition(batch.getOperationType(), item.getStatus(), next)) {
            throw conflict("INVALID_DELIVERY_TRANSITION", "The delivery status cannot move from "
                    + item.getStatus() + " to " + next + ".");
        }
        boolean otpRequired = ("RETURN_PICKUP".equals(batch.getOperationType()) && "PICKED_UP".equals(next))
                || (!"RETURN_PICKUP".equals(batch.getOperationType()) && "DELIVERED".equals(next));
        if (otpRequired) {
            StatusUpdateResult rejection = verifyOtp(item, request.otp());
            if (rejection != null) return rejection;
        }

        if ("NORMAL_DELIVERY".equals(batch.getOperationType()) && "PICKED_UP".equals(next)) {
            transitionOrder(item.getOrder(), "PROCESSING", "SHIPPED", "Picked up for delivery.");
        } else if ("NORMAL_DELIVERY".equals(batch.getOperationType()) && "DELIVERED".equals(next)) {
            transitionOrder(item.getOrder(), "SHIPPED", "DELIVERED", "Delivery confirmed with order OTP.");
            item.setOtpConsumedAt(Instant.now());
            item.setActiveOrderId(null);
        } else if ("RETURN_PICKUP".equals(batch.getOperationType()) && "PICKED_UP".equals(next)) {
            ReturnRequest requestForPickup = returnRequests.findByIdForUpdate(item.getReturnRequest().getId())
                    .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found."));
            if (!Set.of("APPROVED", "PICKUP_SCHEDULED").contains(requestForPickup.getStatus())) {
                throw conflict("RETURN_STATUS_CONFLICT",
                        "The return request is no longer eligible for pickup confirmation.");
            }
            requestForPickup.setStatus("PICKED_UP");
            requestForPickup.setUpdatedAt(Instant.now());
            ReturnStatusHistory returnEvent = new ReturnStatusHistory();
            returnEvent.setReturnRequest(requestForPickup);
            returnEvent.setStatus("PICKED_UP");
            returnEvent.setNote(request.note() == null || request.note().isBlank()
                    ? "Return pickup confirmed after delivery OTP verification."
                    : request.note().trim());
            returnHistory.save(returnEvent);
            item.setOtpConsumedAt(Instant.now());
            item.setActiveReturnRequestId(null);
        } else if (otpRequired) {
            item.setOtpConsumedAt(Instant.now());
            if (item.getReturnRequest() != null) item.setActiveReturnRequestId(null);
        }
        changeDeliveryStatus(item, next, request.note(), "BATCH_LINK", null);
        updateBatchStatus(batch);
        String relatedStatus = item.getOrder() == null ? item.getReturnRequest().getStatus() : item.getOrder().getStatus();
        return new StatusUpdateResult(new DeliveryStatusResponse(orderId, item.getStatus(),
                relatedStatus, batch.getStatus()), null, null);
    }

    private StatusUpdateResult verifyOtp(DeliveryBatchOrder item, String otp) {
        Instant now = Instant.now();
        if (item.getOtpConsumedAt() != null || !item.getOtpExpiresAt().isAfter(now)
                || item.getOtpAttempts() >= MAX_OTP_ATTEMPTS) {
            return rejected(item, "DELIVERY_OTP_EXPIRED", "The delivery OTP is expired or has already been used.");
        }
        if (otp == null || !MessageDigest.isEqual(item.getDeliveryOtpHash().getBytes(StandardCharsets.UTF_8),
                otpHash(item.getId(), otp).getBytes(StandardCharsets.UTF_8))) {
            item.incrementOtpAttempts();
            return rejected(item, "INVALID_DELIVERY_OTP", "The delivery OTP is invalid.");
        }
        return null;
    }

    private StatusUpdateResult rejected(DeliveryBatchOrder item, String code, String message) {
        DeliveryBatch batch = item.getBatch();
        boolean returnDelivery = item.getReturnRequest() != null;
        String id = returnDelivery ? item.getReturnRequest().getId() : item.getOrder().getId();
        String relatedStatus = returnDelivery ? item.getReturnRequest().getStatus() : item.getOrder().getStatus();
        return new StatusUpdateResult(new DeliveryStatusResponse(id, item.getStatus(),
                relatedStatus, batch.getStatus()), code, message);
    }

    private void transitionOrder(Order order, String expected, String next, String note) {
        if (!expected.equals(order.getStatus())) {
            throw conflict("ORDER_STATUS_CONFLICT", "The order status no longer matches the delivery operation.");
        }
        order.setStatus(next);
        if ("DELIVERED".equals(next) && loyaltyService != null) loyaltyService.processDeliveredOrder(order);
        OrderStatusHistory entry = new OrderStatusHistory();
        entry.setOrder(order);
        entry.setStatus(next);
        entry.setNote(note);
        order.getHistory().add(entry);
    }

    private void changeDeliveryStatus(DeliveryBatchOrder item, String next, String note, String source, User actor) {
        DeliveryBatchOrderHistory entry = new DeliveryBatchOrderHistory();
        entry.setBatchOrder(item);
        entry.setPreviousStatus(item.getStatus());
        entry.setNewStatus(next);
        entry.setNote(note == null || note.isBlank() ? null : note.trim());
        entry.setSource(source);
        entry.setChangedBy(actor);
        history.save(entry);
        item.setStatus(next);
        item.setUpdatedAt(Instant.now());
    }

    private void recordInitialStatus(DeliveryBatchOrder item, User admin) {
        DeliveryBatchOrderHistory entry = new DeliveryBatchOrderHistory();
        entry.setBatchOrder(item);
        entry.setNewStatus(item.getStatus());
        entry.setSource("ADMIN");
        entry.setChangedBy(admin);
        history.save(entry);
    }

    private boolean canTransition(String operationType, String current, String next) {
        if ("RETURN_PICKUP".equals(operationType)) {
            return switch (current) {
                case "PENDING" -> Set.of("PICKED_UP", "FAILED_ATTEMPT").contains(next);
                case "FAILED_ATTEMPT" -> "PICKED_UP".equals(next);
                default -> false;
            };
        }
        if ("REPLACEMENT_DELIVERY".equals(operationType)) {
            return switch (current) {
                case "PENDING" -> "PACKED".equals(next);
                case "PACKED" -> "PICKED_UP".equals(next);
                case "PICKED_UP" -> "OUT_FOR_DELIVERY".equals(next);
                case "OUT_FOR_DELIVERY" -> Set.of("FAILED_ATTEMPT", "DELIVERED").contains(next);
                case "FAILED_ATTEMPT" -> "OUT_FOR_DELIVERY".equals(next);
                default -> false;
            };
        }
        if (!"NORMAL_DELIVERY".equals(operationType) || !DRIVER_STATUSES.contains(next)) return false;
        return switch (current) {
            case "PENDING" -> "PACKED".equals(next);
            case "PACKED" -> "PICKED_UP".equals(next);
            case "PICKED_UP" -> "OUT_FOR_DELIVERY".equals(next);
            case "OUT_FOR_DELIVERY" -> Set.of("FAILED_ATTEMPT", "DELIVERED").contains(next);
            case "FAILED_ATTEMPT" -> "OUT_FOR_DELIVERY".equals(next);
            default -> false;
        };
    }

    private List<OneTimeOtp> rotateOtps(DeliveryBatch batch) {
        Instant expiry = Instant.now().plus(LINK_LIFETIME);
        List<OneTimeOtp> codes = new ArrayList<>();
        List<DeliveryBatchOrder> batchItems = batch.getOrders().isEmpty()
                ? batchOrders.findByBatchIdOrderByCreatedAtAsc(batch.getId()) : batch.getOrders();
        for (DeliveryBatchOrder item : batchItems) {
            if (Set.of("DELIVERED", "REASSIGNED").contains(item.getStatus())
                    || ("RETURN_PICKUP".equals(batch.getOperationType()) && "PICKED_UP".equals(item.getStatus()))) {
                continue;
            }
            String code = newUniqueOtpCode(batchItems);
            item.setDeliveryOtpHash(otpHash(item.getId(), code));
            item.setOtpAttempts(0);
            item.setOtpConsumedAt(null);
            item.setOtpExpiresAt(expiry);
            DriverOrder order = driverOrder(item);
            codes.add(new OneTimeOtp(item.getOrder() == null ? item.getReturnRequest().getId() : item.getOrder().getId(),
                    item.getOrder() == null ? item.getReturnRequest().getRequestNumber() : item.getOrder().getOrderNumber(),
                    order.recipientName(), order.phone(), code,
                    item.getReturnRequest() == null ? null : item.getReturnRequest().getRequestNumber()));
        }
        return codes;
    }

    private String newOtpCode() {
        return String.format("%06d", random.nextInt(1_000_000));
    }

    private String newUniqueOtpCode(List<DeliveryBatchOrder> batchItems) {
        String code;
        boolean duplicate;
        do {
            code = newOtpCode();
            duplicate = false;
            for (DeliveryBatchOrder other : batchItems) {
                if (other.getDeliveryOtpHash() != null
                        && MessageDigest.isEqual(other.getDeliveryOtpHash().getBytes(StandardCharsets.UTF_8),
                        otpHash(other.getId(), code).getBytes(StandardCharsets.UTF_8))) {
                    duplicate = true;
                    break;
                }
            }
        } while (duplicate);
        return code;
    }

    private CreatedLink createLink(DeliveryBatch batch, User admin) {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        Instant expiresAt = Instant.now().plus(LINK_LIFETIME);
        DeliveryBatchLink link = new DeliveryBatchLink();
        link.setBatch(batch);
        link.setTokenHash(sha256(token));
        link.setTokenCiphertext(encryptToken(token));
        link.setCreatedBy(admin);
        link.setExpiresAt(expiresAt);
        links.save(link);
        return new CreatedLink(token, expiresAt);
    }

    private ActiveBatchLink activeLink(String batchId) {
        DeliveryBatchLink link = activeLinkRecord(batchId);
        if (link == null) return new ActiveBatchLink(null, null, false);
        if (link.getTokenCiphertext() == null || link.getTokenCiphertext().isBlank()) {
            return new ActiveBatchLink(null, link.getExpiresAt(), true);
        }
        return new ActiveBatchLink("/delivery/batch/" + decryptToken(link.getTokenCiphertext()),
                link.getExpiresAt(), true);
    }

    private DeliveryBatchLink activeLinkRecord(String batchId) {
        return links.findFirstByBatchIdAndRevokedAtIsNullAndExpiresAtAfterOrderByCreatedAtDesc(
                batchId, Instant.now()).orElse(null);
    }

    private String encryptToken(String token) {
        try {
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, linkEncryptionKey(), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(token.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getUrlEncoder().withoutPadding().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery link could not be encrypted.", exception);
        }
    }

    private String decryptToken(String ciphertext) {
        try {
            byte[] payload = Base64.getUrlDecoder().decode(ciphertext);
            if (payload.length <= 12) throw new IllegalArgumentException("Invalid encrypted delivery token.");
            byte[] iv = java.util.Arrays.copyOfRange(payload, 0, 12);
            byte[] encrypted = java.util.Arrays.copyOfRange(payload, 12, payload.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, linkEncryptionKey(), new GCMParameterSpec(128, iv));
            return new String(cipher.doFinal(encrypted), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery link could not be decrypted.", exception);
        }
    }

    private SecretKeySpec linkEncryptionKey() throws Exception {
        String configuredSecret = security.deliveryLinkEncryptionSecret();
        String secret = configuredSecret == null || configuredSecret.isBlank()
                ? security.jwtSecret() : configuredSecret;
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("DREAMSPEX_DELIVERY_LINK_ENCRYPTION_SECRET must contain at least 32 bytes.");
        }
        byte[] key = MessageDigest.getInstance("SHA-256").digest(
                (secret + ":dreamspex:delivery-link-encryption:v1")
                        .getBytes(StandardCharsets.UTF_8));
        return new SecretKeySpec(key, "AES");
    }

    private DeliveryBatch requireBatchByToken(String rawToken) {
        if (rawToken == null || rawToken.length() < 40 || rawToken.length() > 100) {
            throw notFound("DELIVERY_LINK_NOT_FOUND", "Delivery link is invalid or expired.");
        }
        DeliveryBatchLink link = links.findByTokenHashAndRevokedAtIsNullAndExpiresAtAfter(
                        sha256(rawToken), Instant.now())
                .orElseThrow(() -> notFound("DELIVERY_LINK_NOT_FOUND", "Delivery link is invalid or expired."));
        if ("REVOKED".equals(link.getBatch().getStatus())) {
            throw notFound("DELIVERY_LINK_NOT_FOUND", "Delivery link is invalid or expired.");
        }
        return link.getBatch();
    }

    private EligibleOrder eligibleOrder(Order order, String postalCode, String city) {
        try {
            JsonNode address = mapper.readTree(order.getAddressSnapshot());
            String orderPostalCode = text(address, "postalCode");
            String orderCity = text(address, "city");
            if (postalCode != null && !postalCode.isBlank() && !postalCode.equals(orderPostalCode)) return null;
            if (city != null && !city.isBlank() && !city.equalsIgnoreCase(orderCity)) return null;
            return new EligibleOrder(order.getId(), order.getOrderNumber(), order.getStatus(), order.getPaymentStatus(),
                    text(address, "recipientName"), orderCity, text(address, "state"), orderPostalCode, order.getCreatedAt());
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_ADDRESS_INVALID",
                    "A saved order address could not be read.", exception);
        }
    }

    private DriverOrder driverOrder(DeliveryBatchOrder item) {
        if (item.getReturnRequest() != null) {
            ReturnRequest request = item.getReturnRequest();
            Order order = request.getOrder();
            JsonNode address;
            try {
                address = mapper.readTree(order.getAddressSnapshot());
            } catch (Exception exception) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_ADDRESS_INVALID",
                        "A saved order address could not be read.", exception);
            }
            List<DriverOrderItem> products = request.getItems().stream()
                    .map(returnItem -> new DriverOrderItem(returnItem.getOrderItem().getProductNameSnapshot(),
                            returnItem.getQuantity())).toList();
            List<DeliveryHistory> events = new ArrayList<>(returnHistory
                    .findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                    .map(event -> new DeliveryHistory(null, event.getStatus(), event.getNote(),
                            "RETURN_REQUEST", event.getCreatedAt())).toList());
            events.addAll(history.findByBatchOrderIdOrderByCreatedAtAsc(item.getId()).stream()
                    .map(event -> new DeliveryHistory(event.getPreviousStatus(), event.getNewStatus(),
                            event.getNote(), event.getSource(), event.getCreatedAt())).toList());
            events.sort(Comparator.comparing(DeliveryHistory::createdAt));
            Coordinates coordinates = coordinates(address);
            return new DriverOrder(request.getId(), order.getOrderNumber(), item.getStatus(),
                    text(address, "recipientName"), text(address, "phone"),
                    addressLine(address), text(address, "city"), text(address, "state"), text(address, "postalCode"),
                    text(address, "countryCode"), products, events, request.getRequestNumber(),
                    coordinates.latitude(), coordinates.longitude());
        }
        Order order = item.getOrder();
        JsonNode address;
        try {
            address = mapper.readTree(order.getAddressSnapshot());
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_ADDRESS_INVALID",
                    "A saved order address could not be read.", exception);
        }
        List<DriverOrderItem> products = order.getItems().stream()
                .map(product -> new DriverOrderItem(product.getProductNameSnapshot(), product.getQuantity())).toList();
        List<DeliveryHistory> events = history.findByBatchOrderIdOrderByCreatedAtAsc(item.getId()).stream()
                .map(event -> new DeliveryHistory(event.getPreviousStatus(), event.getNewStatus(),
                        event.getNote(), event.getSource(), event.getCreatedAt())).toList();
        Coordinates coordinates = coordinates(address);
        return new DriverOrder(order.getId(), order.getOrderNumber(), item.getStatus(),
                text(address, "recipientName"), text(address, "phone"),
                addressLine(address), text(address, "city"), text(address, "state"), text(address, "postalCode"),
                text(address, "countryCode"), products, events, null,
                coordinates.latitude(), coordinates.longitude());
    }

    private Coordinates coordinates(JsonNode address) {
        JsonNode latitude = address.get("latitude");
        JsonNode longitude = address.get("longitude");
        if (latitude == null || !latitude.isNumber() || longitude == null || !longitude.isNumber()) {
            return new Coordinates(null, null);
        }
        java.math.BigDecimal lat = latitude.decimalValue();
        java.math.BigDecimal lon = longitude.decimalValue();
        if (lat.compareTo(java.math.BigDecimal.valueOf(-90)) < 0
                || lat.compareTo(java.math.BigDecimal.valueOf(90)) > 0
                || lon.compareTo(java.math.BigDecimal.valueOf(-180)) < 0
                || lon.compareTo(java.math.BigDecimal.valueOf(180)) > 0) {
            return new Coordinates(null, null);
        }
        return new Coordinates(lat, lon);
    }

    private record Coordinates(java.math.BigDecimal latitude, java.math.BigDecimal longitude) {}

    private BatchSummary summary(DeliveryBatch batch) {
        List<DeliveryBatchOrder> items = batchOrders.findByBatchIdOrderByCreatedAtAsc(batch.getId());
        List<BatchOrderSummary> summaries = items.stream().filter(item -> !"REASSIGNED".equals(item.getStatus()))
                .map(item -> {
                    if (item.getReturnRequest() != null) {
                        AddressRoute address = addressRoute(item.getReturnRequest().getOrder());
                        return new BatchOrderSummary(item.getId(), item.getReturnRequest().getId(),
                                item.getReturnRequest().getRequestNumber(), item.getStatus(), address.recipientName,
                                address.city, address.state, address.postalCode);
                    }
                    AddressRoute address = addressRoute(item.getOrder());
                    return new BatchOrderSummary(item.getId(), item.getOrder().getId(),
                            item.getOrder().getOrderNumber(), item.getStatus(), address.recipientName,
                            address.city, address.state, address.postalCode);
                }).toList();
        int total = summaries.size();
        int completed = (int) summaries.stream().filter(item -> isCompleted(batch, item.status())).count();
        int delivered = "RETURN_PICKUP".equals(batch.getOperationType()) ? 0 : completed;
        int failed = (int) summaries.stream().filter(item -> "FAILED_ATTEMPT".equals(item.status())).count();
        int pending = total - completed - failed;
        DeliveryBatchLink activeLink = activeLinkRecord(batch.getId());
        String status = "REVOKED".equals(batch.getStatus()) ? "REVOKED"
                : total > 0 && completed + (int) items.stream()
                .filter(item -> "REASSIGNED".equals(item.getStatus())).count() == items.size()
                ? "COMPLETED" : batch.getStatus();
        return new BatchSummary(batch.getId(), batch.getRouteName(), status, total, pending, delivered, failed,
                batch.getCreatedAt(), activeLink == null ? null : activeLink.getExpiresAt(),
                activeLink != null, summaries, batch.getOperationType(), completed);
    }

    private List<BatchSummary> listBatchesRequiringAttention(String operationType) {
        return batches.findAllByOrderByCreatedAtDesc().stream()
                .filter(batch -> operationType.equals(batch.getOperationType()))
                .map(this::summary)
                .filter(batch -> batch.pending() > 0 || batch.failed() > 0)
                .toList();
    }

    private DriverBatch driverBatch(DeliveryBatch batch, List<DriverOrder> driverOrders) {
        int total = driverOrders.size();
        int completed = (int) driverOrders.stream().filter(item -> isCompleted(batch, item.status())).count();
        int delivered = "RETURN_PICKUP".equals(batch.getOperationType()) ? 0 : completed;
        int failed = (int) driverOrders.stream().filter(item -> "FAILED_ATTEMPT".equals(item.status())).count();
        int pending = total - completed - failed;
        DeliveryBatchLink activeLink = activeLinkRecord(batch.getId());
        return new DriverBatch(batch.getRouteName(), batch.getStatus(), total, pending, delivered, failed,
                activeLink == null ? null : activeLink.getExpiresAt(), driverOrders,
                batch.getOperationType(), completed);
    }

    private AddressRoute addressRoute(Order order) {
        try {
            JsonNode address = mapper.readTree(order.getAddressSnapshot());
            return new AddressRoute(text(address, "recipientName"), text(address, "city"),
                    text(address, "state"), text(address, "postalCode"));
        } catch (Exception exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_ADDRESS_INVALID",
                    "A saved order address could not be read.", exception);
        }
    }

    private EligibleReturnRequest eligibleReturn(ReturnRequest request, String operationType,
                                                      String city, String state, String postalCode) {
            AddressRoute address = addressRoute(request.getOrder());
            if (city != null && !city.isBlank() && !city.equalsIgnoreCase(address.city)
                    || state != null && !state.isBlank() && !state.equalsIgnoreCase(address.state)
                    || postalCode != null && !postalCode.isBlank() && !postalCode.equals(address.postalCode)) {
                return null;
            }
            return new EligibleReturnRequest(request.getId(), request.getRequestNumber(),
                    request.getOrder().getOrderNumber(), request.getStatus(), operationType,
                    address.recipientName, textAddress(request.getOrder(), "phone"), address.city,
                    address.state, address.postalCode, request.getCreatedAt());
        }

    private String textAddress(Order order, String field) {
            try {
                return text(mapper.readTree(order.getAddressSnapshot()), field);
            } catch (Exception exception) {
                throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ORDER_ADDRESS_INVALID",
                        "A saved order address could not be read.", exception);
            }
        }

    private boolean eligibleReturnStatus(ReturnRequest request, String operationType) {
            if ("RETURN_PICKUP".equals(operationType)) {
                return Set.of("APPROVED", "PICKUP_SCHEDULED").contains(request.getStatus());
            }
            return "REPLACEMENT".equals(request.getResolution())
                    && "REPLACEMENT_PROCESSING".equals(request.getStatus());
        }

    private boolean isCompleted(DeliveryBatch batch, String status) {
            return "RETURN_PICKUP".equals(batch.getOperationType())
                    ? "PICKED_UP".equals(status) : "DELIVERED".equals(status);
        }

    private void validateReturnOperation(String operationType) {
            if (!Set.of("RETURN_PICKUP", "REPLACEMENT_DELIVERY").contains(operationType)) {
                throw notFound("DELIVERY_BATCH_NOT_FOUND", "Return delivery batch type was not found.");
            }
        }

    private DeliveryBatch requireReturnBatch(String operationType, String batchId) {
            validateReturnOperation(operationType);
            return batches.findById(batchId)
                    .filter(batch -> operationType.equals(batch.getOperationType()))
                    .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        }

    private DeliveryBatch requireReturnBatchForUpdate(String operationType, String batchId) {
            validateReturnOperation(operationType);
            return batches.findByIdForUpdate(batchId)
                    .filter(batch -> operationType.equals(batch.getOperationType()))
                    .orElseThrow(() -> notFound("DELIVERY_BATCH_NOT_FOUND", "Delivery batch was not found."));
        }
    private String addressLine(JsonNode address) {
        String line1 = text(address, "line1");
        String line2 = text(address, "line2");
        return line2.isBlank() ? line1 : line1 + ", " + line2;
    }

    private String text(JsonNode node, String field) {
        JsonNode value = node.get(field);
        return value == null || value.isNull() ? "" : value.asText();
    }

    private void updateBatchStatus(DeliveryBatch batch) {
        if ("REVOKED".equals(batch.getStatus())) return;
        List<DeliveryBatchOrder> items = batchOrders.findByBatchIdOrderByCreatedAtAsc(batch.getId());
        if (!items.isEmpty() && items.stream().allMatch(item ->
                isCompleted(batch, item.getStatus()) || "REASSIGNED".equals(item.getStatus()))) {
            batch.setStatus("COMPLETED");
        }
        batch.setUpdatedAt(Instant.now());
    }

    private String otpHash(String deliveryOrderId, String otp) {
        String secret = security.otpSecret();
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("DREAMSPEX_OTP_SECRET must contain at least 32 bytes.");
        }
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return java.util.HexFormat.of().formatHex(mac.doFinal((deliveryOrderId + ":" + otp)
                    .getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery OTP hash could not be generated.", exception);
        }
    }

    private String sha256(String value) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Delivery link hash could not be generated.", exception);
        }
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_DELIVERY_BATCH", message);
    }

    private ApiException conflict(String code, String message) {
        return new ApiException(HttpStatus.CONFLICT, code, message);
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    private record AddressRoute(String recipientName, String city, String state, String postalCode) {
        boolean matches(AddressRoute other) {
            return city.equalsIgnoreCase(other.city) && state.equalsIgnoreCase(other.state)
                    && postalCode.equals(other.postalCode);
        }
    }

    public record EligibleReturnRequest(String id, String requestNumber, String orderNumber, String status,
                                        String operationType, String recipientName, String phone, String city,
                                        String state, String postalCode, Instant createdAt) {}

    private record CreatedLink(String token, Instant expiresAt) {}
}
