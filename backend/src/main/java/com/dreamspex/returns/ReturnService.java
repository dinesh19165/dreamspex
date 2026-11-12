package com.dreamspex.returns;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderStatusHistory;
import com.dreamspex.payment.Payment;
import com.dreamspex.payment.PaymentRepository;
import com.dreamspex.payment.RazorpayGateway;
import com.dreamspex.prescription.PrescriptionStorage;
import com.dreamspex.returns.ReturnDtos.*;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.franchise.FranchiseService;
import jakarta.persistence.EntityManager;
import java.io.IOException;
import java.io.InputStream;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.Collectors;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
public class ReturnService {
    @Autowired(required = false) private FranchiseService franchiseService;
    private static final ZoneId REPORT_ZONE = ZoneId.of("Asia/Kolkata");
    private static final BigDecimal ZERO = new BigDecimal("0.00");
    private static final Set<String> TERMINAL_REQUESTS = Set.of("REJECTED", "CANCELLED");
    private static final Map<String, Set<String>> TRANSITIONS = Map.of(
            "REQUESTED", Set.of("APPROVED", "REJECTED"),
            "APPROVED", Set.of("PICKUP_SCHEDULED"),
            "PICKUP_SCHEDULED", Set.of("PICKED_UP"),
            "PICKED_UP", Set.of("RECEIVED"),
            "RECEIVED", Set.of("QUALITY_CHECK"),
            "QUALITY_CHECK", Set.of("REPLACEMENT_PROCESSING"),
            "REPLACEMENT_PROCESSING", Set.of("REPLACED"));

    private final CurrentUser current;
    private final OrderRepository orders;
    private final PaymentRepository payments;
    private final ProductRepository products;
    private final ReturnPolicyRepository policies;
    private final ReturnableProductRepository returnableProducts;
    private final ReturnRequestRepository requests;
    private final ReturnEvidenceRepository evidence;
    private final ReturnStatusHistoryRepository history;
    private final ReturnRefundTransactionRepository refunds;
    private final PrescriptionStorage storage;
    private final RazorpayGateway razorpay;
    private final ReturnRefundProcessor refundProcessor;
    private final EntityManager entityManager;
    private final ReturnRefundNotifications returnNotifications;

    public ReturnService(CurrentUser current, OrderRepository orders, PaymentRepository payments,
                         ProductRepository products, ReturnPolicyRepository policies,
                         ReturnableProductRepository returnableProducts, ReturnRequestRepository requests,
                         ReturnEvidenceRepository evidence, ReturnStatusHistoryRepository history,
                         ReturnRefundTransactionRepository refunds, PrescriptionStorage storage,
                         RazorpayGateway razorpay, ReturnRefundProcessor refundProcessor,
                         EntityManager entityManager, ReturnRefundNotifications returnNotifications) {
        this.current = current;
        this.orders = orders;
        this.payments = payments;
        this.products = products;
        this.policies = policies;
        this.returnableProducts = returnableProducts;
        this.requests = requests;
        this.evidence = evidence;
        this.history = history;
        this.refunds = refunds;
        this.storage = storage;
        this.razorpay = razorpay;
        this.refundProcessor = refundProcessor;
        this.entityManager = entityManager;
        this.returnNotifications = returnNotifications;
    }

    @Transactional(readOnly = true)
    public PolicyResponse customerPolicy() {
        return policyResponse();
    }

    @Transactional(readOnly = true)
    public OrderEligibilityResponse eligibility(org.springframework.security.core.Authentication auth,
                                                String orderId) {
        User user = current.require(auth);
        Order order = orders.findByIdAndUserId(orderId, user.getId())
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        ReturnPolicy policy = getPolicy();
        Instant deliveredAt = deliveredAt(order);
        Instant deadline = policy.getReturnWindowDays() == null || deliveredAt == null
                ? null : deliveredAt.plusSeconds(policy.getReturnWindowDays() * 86400L);
        String reason = eligibilityFailure(order, policy, deliveredAt, Instant.now());
        List<ReturnRequest> existing = requests.findByOrderId(orderId).stream()
                .filter(request -> !TERMINAL_REQUESTS.contains(request.getStatus())).toList();
        Map<String, Integer> used = usedQuantities(existing);
        List<EligibleItem> items = order.getItems().stream().map(item -> {
            boolean isReturnable = isReturnable(item.getVariant().getProduct().getId());
            int available = reason == null && isReturnable
                    ? Math.max(0, item.getQuantity() - used.getOrDefault(item.getId(), 0)) : 0;
            return new EligibleItem(item.getId(), item.getProductNameSnapshot(), item.getSkuSnapshot(),
                    item.getQuantity(), available, netLineAmount(order, item), isReturnable);
        }).toList();
        return new OrderEligibilityResponse(order.getId(), order.getOrderNumber(), reason == null,
                reason, deliveredAt, deadline, items);
    }

    @Transactional(readOnly = true)
    public List<ReturnResponse> customerList(org.springframework.security.core.Authentication auth) {
        User user = current.require(auth);
        return requests.findByUserIdOrderByCreatedAtDesc(user.getId()).stream().map(this::customerResponse).toList();
    }

    @Transactional(readOnly = true)
    public ReturnResponse customerGet(org.springframework.security.core.Authentication auth, String id) {
        User user = current.require(auth);
        ReturnRequest request = requests.findByIdAndUserId(id, user.getId())
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found."));
        return customerResponse(request);
    }

    @Transactional
    public ReturnResponse create(org.springframework.security.core.Authentication auth, String orderId,
                                CreateRequest input) {
        User user = current.require(auth);
        Order order = orders.findByIdAndUserIdForUpdate(orderId, user.getId())
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        ReturnPolicy policy = getPolicy();
        Instant delivered = deliveredAt(order);
        String ineligibleReason = eligibilityFailure(order, policy, delivered, Instant.now());
        if (ineligibleReason != null) {
            throw new ApiException(HttpStatus.CONFLICT, "RETURN_NOT_ELIGIBLE", ineligibleReason);
        }
        if (input.items().stream().map(RequestedItem::orderItemId).distinct().count() != input.items().size()) {
            throw invalid("Duplicate order items are not allowed in a return request.");
        }

        List<ReturnRequest> existing = requests.findByOrderId(orderId).stream()
                .filter(request -> !TERMINAL_REQUESTS.contains(request.getStatus())).toList();
        Map<String, Integer> used = usedQuantities(existing);
        Map<String, OrderItem> orderItems = order.getItems().stream()
                .collect(Collectors.toMap(OrderItem::getId, Function.identity()));

        ReturnRequest request = new ReturnRequest();
        request.setRequestNumber("DSR-" + UUID.randomUUID().toString().replace("-", "")
                .substring(0, 12).toUpperCase(java.util.Locale.ROOT));
        request.setOrder(order);
        request.setUser(user);
        request.setResolution(input.resolution());
        request.setReasonCode(input.reasonCode());
        request.setDescription(trimToNull(input.description()));
        request.setStatus("REQUESTED");
        List<ReturnRequestItem> newItems = new ArrayList<>();
        BigDecimal calculatedRefund = ZERO;

        for (RequestedItem requested : input.items()) {
            OrderItem orderItem = orderItems.get(requested.orderItemId());
            if (orderItem == null || !isReturnable(orderItem.getVariant().getProduct().getId())) {
                throw invalid("One or more selected products are not configured as returnable.");
            }
            int alreadyRequested = used.getOrDefault(orderItem.getId(), 0);
            if (requested.quantity() > orderItem.getQuantity() - alreadyRequested) {
                throw new ApiException(HttpStatus.CONFLICT, "RETURN_QUANTITY_EXCEEDED",
                        "The selected quantity exceeds the quantity still available for return.");
            }

            ReturnRequestItem item = new ReturnRequestItem();
            item.setReturnRequest(request);
            item.setOrderItem(orderItem);
            item.setQuantity(requested.quantity());
            BigDecimal itemRefund = "REFUND".equals(input.resolution())
                    ? incrementalLineAmount(order, orderItem, alreadyRequested, requested.quantity()) : ZERO;
            item.setRefundAmount(itemRefund);
            newItems.add(item);
            calculatedRefund = calculatedRefund.add(itemRefund);
        }
        if ("REFUND".equals(input.resolution()) && calculatedRefund.signum() <= 0) {
            throw invalid("The selected items do not have a refundable payment amount.");
        }
        BigDecimal previouslyReserved = existing.stream()
                .filter(value -> "REFUND".equals(value.getResolution()))
                .map(ReturnRequest::getRefundAmount).reduce(ZERO, BigDecimal::add);
        Payment captured = payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(orderId, "CAPTURED")
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "CAPTURED_PAYMENT_NOT_FOUND",
                        "A verified captured payment could not be found for this order."));
        if (previouslyReserved.add(calculatedRefund).compareTo(captured.getAmount()) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "REFUND_AMOUNT_EXCEEDED",
                    "The requested refund exceeds the remaining amount paid for this order.");
        }
        request.setRefundAmount(calculatedRefund);
        entityManager.persist(request);
        entityManager.flush();
        for (ReturnRequestItem item : newItems) {
            item.setReturnRequest(request);
            request.getItems().add(item);
            entityManager.persist(item);
        }
        record(request, "REQUESTED", null, user);
        returnNotifications.submitted(request);
        return customerResponse(request);
    }

    @Transactional
    public ReturnResponse cancel(org.springframework.security.core.Authentication auth, String id) {
        User user = current.require(auth);
        ReturnRequest request = requests.findByIdForUpdate(id)
                .filter(value -> value.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found."));
        if (!"REQUESTED".equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "RETURN_NOT_CANCELLABLE",
                    "A return request can only be cancelled before it is approved.");
        }
        changeStatus(request, "CANCELLED", null, user);
        return customerResponse(request);
    }

    @Transactional
    public EvidenceUploadResponse uploadEvidence(org.springframework.security.core.Authentication auth, String id,
                                                  MultipartFile file) {
        User user = current.require(auth);
        ReturnRequest request = requests.findByIdForUpdate(id)
                .filter(value -> value.getUser().getId().equals(user.getId()))
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found."));
        if (!"REQUESTED".equals(request.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "EVIDENCE_UPLOAD_CLOSED",
                    "Evidence can only be added before the return request is approved.");
        }
        validateEvidence(file);
        try {
            ReturnEvidence stored = new ReturnEvidence();
            stored.setReturnRequest(request);
            stored.setOriginalName(safeFileName(file.getOriginalFilename()));
            stored.setContentType(file.getContentType());
            stored.setSizeBytes(file.getSize());
            stored.setStorageKey(storage.store(file).storageKey());
            stored.setReturnRequest(request);
            request.getEvidence().add(stored);
            entityManager.persist(stored);
            return new EvidenceUploadResponse(stored.getId(), stored.getOriginalName(), stored.getContentType(),
                    stored.getSizeBytes(), stored.getCreatedAt(), evidenceUrl(request.getId(), stored.getId()));
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "RETURN_EVIDENCE_UPLOAD_FAILED",
                    "Return evidence could not be stored.", e);
        }
    }

    @Transactional(readOnly = true)
    public EvidenceFile customerEvidence(org.springframework.security.core.Authentication auth,
                                         String returnId, String evidenceId) {
        User user = current.require(auth);
        ReturnEvidence file = evidence.findByIdAndReturnRequestId(evidenceId, returnId)
                .filter(value -> value.getReturnRequest().getUser().getId().equals(user.getId()))
                .orElseThrow(() -> notFound("RETURN_EVIDENCE_NOT_FOUND", "Return evidence was not found."));
        return loadEvidence(file);
    }

    @Transactional(readOnly = true)
    public PolicyResponse adminPolicy() { return policyResponse(); }

    @Transactional
    public PolicyResponse updatePolicy(User admin, PolicyRequest input) {
        if (input.enabled() && (input.returnWindowDays() == null || input.returnWindowDays() < 1)) {
            throw invalid("Set a positive return window before enabling the return policy.");
        }
        ReturnPolicy policy = policies.findById("default").orElseGet(ReturnPolicy::new);
        policy.setEnabled(input.enabled());
        policy.setReturnWindowDays(input.returnWindowDays());
        policy.setUpdatedBy(admin);
        policy.setUpdatedAt(Instant.now());
        return policyResponse(policies.save(policy));
    }

    @Transactional(readOnly = true)
    public List<ProductEligibilityResponse> adminProducts(String query) {
        Map<String, ReturnableProduct> enabled = returnableProducts.findAllByEnabledTrue().stream()
                .collect(Collectors.toMap(ReturnableProduct::getProductId, Function.identity()));
        String needle = query == null ? "" : query.trim().toLowerCase(java.util.Locale.ROOT);
        return products.findAll().stream()
                .filter(product -> product.getDeletedAt() == null)
                .filter(product -> needle.isEmpty() || product.getName().toLowerCase(java.util.Locale.ROOT).contains(needle)
                        || product.getSku().toLowerCase(java.util.Locale.ROOT).contains(needle))
                .sorted(Comparator.comparing(Product::getName, String.CASE_INSENSITIVE_ORDER))
                .map(product -> new ProductEligibilityResponse(product.getId(), product.getName(), product.getSku(),
                        product.getStatus(), enabled.containsKey(product.getId())))
                .toList();
    }

    @Transactional
    public ProductEligibilityResponse setProductEligibility(User admin, String productId,
                                                            ProductEligibilityRequest input) {
        Product product = products.findById(productId).filter(value -> value.getDeletedAt() == null)
                .orElseThrow(() -> notFound("PRODUCT_NOT_FOUND", "Product was not found."));
        ReturnableProduct eligibility = returnableProducts.findById(productId)
                .orElseGet(() -> new ReturnableProduct(productId));
        eligibility.setEnabled(input.returnable());
        eligibility.setUpdatedBy(admin);
        eligibility.setUpdatedAt(Instant.now());
        returnableProducts.save(eligibility);
        return new ProductEligibilityResponse(product.getId(), product.getName(), product.getSku(),
                product.getStatus(), input.returnable());
    }

    @Transactional(readOnly = true)
    public List<AdminReturnResponse> adminList(String status, LocalDate from, LocalDate to, String orderId) {
        return requests.findAllByOrderByCreatedAtDesc().stream()
                .filter(request -> status == null || status.isBlank() || request.getStatus().equals(status))
                .filter(request -> from == null || !request.getCreatedAt().isBefore(from.atStartOfDay(REPORT_ZONE).toInstant()))
                .filter(request -> to == null || request.getCreatedAt().isBefore(to.plusDays(1).atStartOfDay(REPORT_ZONE).toInstant()))
                .filter(request -> orderId == null || orderId.isBlank()
                        || request.getOrder().getId().equals(orderId)
                        || request.getOrder().getOrderNumber().equalsIgnoreCase(orderId))
                .map(this::adminResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdminReturnResponse adminGet(String id) {
        return adminResponse(requests.findById(id)
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found.")));
    }

    @Transactional
    public AdminReturnResponse updateStatus(User admin, String id, StatusRequest input) {
        ReturnRequest request = requests.findByIdForUpdate(id)
                .orElseThrow(() -> notFound("RETURN_NOT_FOUND", "Return request was not found."));
        if ("REPLACEMENT_PROCESSING".equals(input.status()) && !"REPLACEMENT".equals(request.getResolution())) {
            throw new ApiException(HttpStatus.CONFLICT, "RETURN_RESOLUTION_MISMATCH",
                    "Only replacement requests can enter replacement processing.");
        }
        if (!TRANSITIONS.getOrDefault(request.getStatus(), Set.of()).contains(input.status())) {
            throw new ApiException(HttpStatus.CONFLICT, "INVALID_RETURN_TRANSITION",
                    "Return status cannot move from " + request.getStatus() + " to " + input.status() + ".");
        }
        request.setAdminRemarks(trimToNull(input.adminRemarks()));
        changeStatus(request, input.status(), request.getAdminRemarks(), admin);
        if ("REPLACEMENT_PROCESSING".equals(input.status()) && franchiseService != null) {
            franchiseService.restockReturnItems(request, admin);
        }
        if ("APPROVED".equals(input.status())) returnNotifications.approved(request);
        if ("PICKUP_SCHEDULED".equals(input.status())) returnNotifications.pickupScheduled(request);
        return adminResponse(request);
    }

    public AdminReturnResponse processRefund(User admin, String id) {
        ReturnRefundProcessor.RefundCommand command = refundProcessor.prepare(id, admin);
        if (command.complete()) return adminGet(id);
        try {
            RazorpayGateway.RazorpayRefund gatewayRefund;
            if (command.fetchOnly() && command.providerRefundId() != null) {
                gatewayRefund = razorpay.fetchRefund(command.providerPaymentId(), command.providerRefundId());
            } else if (command.fetchOnly()) {
                gatewayRefund = razorpay.findRefundByReceipt(command.providerPaymentId(), command.idempotencyKey())
                        .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "REFUND_RECONCILIATION_PENDING",
                                "A refund submission is already in progress. The gateway has not returned a matching refund yet, so no duplicate refund was submitted."));
            } else {
                gatewayRefund = razorpay.createOrFindRefund(command.providerPaymentId(), command.amount(),
                        command.idempotencyKey());
            }
            if (!command.idempotencyKey().equals(gatewayRefund.receipt())
                    || gatewayRefund.amount() != command.amount().movePointRight(2).longValueExact()
                    || (gatewayRefund.paymentId() != null
                    && !gatewayRefund.paymentId().equals(command.providerPaymentId()))
                    || (gatewayRefund.currency() != null
                    && !gatewayRefund.currency().equalsIgnoreCase(command.currency()))) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "REFUND_MISMATCH",
                        "Payment provider refund does not match the return request.");
            }
            refundProcessor.complete(command.transactionId(), gatewayRefund.id(), gatewayRefund.status(),
                    gatewayRefund.createdAt());
        } catch (RazorpayGateway.PaymentGatewayException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "REFUND_GATEWAY_ERROR",
                    "The payment provider could not confirm the refund. The request remains available for a safe retry.", e);
        } catch (ArithmeticException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "REFUND_AMOUNT_INVALID",
                    "The return refund amount could not be represented in payment currency.", e);
        }
        return adminGet(id);
    }

    @Transactional(readOnly = true)
    public EvidenceFile adminEvidence(String returnId, String evidenceId) {
        ReturnEvidence file = evidence.findByIdAndReturnRequestId(evidenceId, returnId)
                .orElseThrow(() -> notFound("RETURN_EVIDENCE_NOT_FOUND", "Return evidence was not found."));
        return loadEvidence(file);
    }

    private String eligibilityFailure(Order order, ReturnPolicy policy, Instant deliveredAt, Instant now) {
        if (!policy.isEnabled() || policy.getReturnWindowDays() == null) {
            return "Return policy has not been configured by Dream Spex.";
        }
        boolean fulfilled = "DELIVERED".equals(order.getStatus())
                || ("PICKED_UP".equals(order.getStatus())
                && ("PICKUP".equals(order.getFulfillmentType()) || "STORE_PICKUP".equals(order.getFulfillmentType())));
        if (!fulfilled || !"PAID".equals(order.getPaymentStatus())) {
            return "Only completed orders with confirmed payment can be returned.";
        }
        if (deliveredAt == null) return "Delivery date could not be verified for this order.";
        if (now.isAfter(deliveredAt.plusSeconds(policy.getReturnWindowDays() * 86400L))) {
            return "The configured return window has expired.";
        }
        return null;
    }

    private Instant deliveredAt(Order order) {
        String completionStatus = "PICKUP".equals(order.getFulfillmentType())
                || "STORE_PICKUP".equals(order.getFulfillmentType()) ? "PICKED_UP" : "DELIVERED";
        return order.getHistory().stream().filter(entry -> completionStatus.equals(entry.getStatus()))
                .map(OrderStatusHistory::getCreatedAt).max(Comparator.naturalOrder()).orElse(null);
    }

    private Map<String, Integer> usedQuantities(List<ReturnRequest> existing) {
        return existing.stream().flatMap(request -> request.getItems().stream())
                .collect(Collectors.groupingBy(item -> item.getOrderItem().getId(),
                        Collectors.summingInt(ReturnRequestItem::getQuantity)));
    }

    private BigDecimal incrementalLineAmount(Order order, OrderItem item, int previouslyRequested, int newQuantity) {
        BigDecimal lineNet = netLineAmount(order, item);
        int nextTotal = previouslyRequested + newQuantity;
        BigDecimal previousAmount = lineNet.multiply(BigDecimal.valueOf(previouslyRequested))
                .divide(BigDecimal.valueOf(item.getQuantity()), 2, RoundingMode.HALF_UP);
        BigDecimal nextAmount = lineNet.multiply(BigDecimal.valueOf(nextTotal))
                .divide(BigDecimal.valueOf(item.getQuantity()), 2, RoundingMode.HALF_UP);
        return nextAmount.subtract(previousAmount).max(ZERO);
    }

    private BigDecimal netLineAmount(Order order, OrderItem selected) {
        List<OrderItem> ordered = order.getItems().stream()
                .sorted(Comparator.comparing(OrderItem::getId)).toList();
        BigDecimal subtotal = order.getSubtotal();
        if (subtotal == null || subtotal.signum() <= 0) return ZERO;
        BigDecimal target = subtotal.subtract(order.getDiscountAmount()).max(ZERO).setScale(2, RoundingMode.HALF_UP);
        BigDecimal allocated = ZERO;
        for (int index = 0; index < ordered.size(); index++) {
            OrderItem item = ordered.get(index);
            BigDecimal amount;
            if (index == ordered.size() - 1) {
                amount = target.subtract(allocated).max(ZERO).setScale(2, RoundingMode.HALF_UP);
            } else {
                amount = item.getLineTotal().multiply(target)
                        .divide(subtotal, 2, RoundingMode.HALF_UP);
                allocated = allocated.add(amount);
            }
            if (item.getId().equals(selected.getId())) return amount;
        }
        return ZERO;
    }

    private boolean isReturnable(String productId) {
        return returnableProducts.findByProductIdAndEnabledTrue(productId).isPresent();
    }

    private ReturnPolicy getPolicy() {
        return policies.findById("default").orElseGet(ReturnPolicy::new);
    }

    private PolicyResponse policyResponse() { return policyResponse(getPolicy()); }

    private PolicyResponse policyResponse(ReturnPolicy policy) {
        return new PolicyResponse(policy.isEnabled(), policy.getReturnWindowDays(), policy.getUpdatedAt());
    }

    private ReturnResponse customerResponse(ReturnRequest request) {
        return new ReturnResponse(request.getId(), request.getRequestNumber(), request.getOrder().getId(),
                request.getOrder().getOrderNumber(), request.getResolution(), request.getReasonCode(),
                request.getDescription(), request.getStatus(), request.getRefundAmount(), request.getCreatedAt(),
                itemResponses(request), evidenceResponses(request, false), customerHistory(request),
                refunds.findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                        .map(this::customerRefund).toList());
    }

    private AdminReturnResponse adminResponse(ReturnRequest request) {
        User user = request.getUser();
        AdminPaymentResponse payment = payments.findFirstByOrderIdAndStatusOrderByCreatedAtDesc(
                        request.getOrder().getId(), "CAPTURED")
                .map(value -> new AdminPaymentResponse(value.getProvider(), value.getProviderPaymentId(),
                        value.getAmount(), value.getCurrency(), value.getStatus()))
                .orElse(null);
        List<ReturnRefundTransaction> refundTransactions =
                refunds.findByReturnRequestIdOrderByCreatedAtAsc(request.getId());
        String latestRefundId = refunds.findFirstByReturnRequestIdOrderByCreatedAtDesc(request.getId())
                .map(ReturnRefundTransaction::getId).orElse(null);
        return new AdminReturnResponse(request.getId(), request.getRequestNumber(), request.getOrder().getId(),
                request.getOrder().getOrderNumber(), request.getResolution(), request.getReasonCode(),
                request.getDescription(), request.getStatus(), request.getRefundAmount(), request.getAdminRemarks(),
                request.getCreatedAt(), new CustomerResponse(user.getId(), user.getDisplayName(), user.getEmail()),
                payment, itemResponses(request), evidenceResponses(request, true), adminHistory(request),
                refundTransactions.stream()
                        .map(refund -> adminRefund(refund, refund.getId().equals(latestRefundId)
                                && "REFUND_PROCESSING".equals(request.getStatus())
                                && "FAILED".equals(refund.getStatus())))
                        .toList());
    }

    private List<ItemResponse> itemResponses(ReturnRequest request) {
        return request.getItems().stream().map(item -> new ItemResponse(item.getOrderItem().getId(),
                item.getOrderItem().getProductNameSnapshot(), item.getOrderItem().getSkuSnapshot(),
                item.getQuantity(), item.getRefundAmount())).toList();
    }

    private List<EvidenceResponse> evidenceResponses(ReturnRequest request, boolean admin) {
        return evidence.findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                .map(file -> new EvidenceResponse(file.getId(), file.getOriginalName(), file.getContentType(),
                        file.getSizeBytes(), file.getCreatedAt(), evidenceUrl(request.getId(), file.getId(), admin)))
                .toList();
    }

    private List<HistoryResponse> customerHistory(ReturnRequest request) {
        return history.findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                .map(entry -> new HistoryResponse(entry.getStatus(), entry.getCreatedAt())).toList();
    }

    private List<AdminHistoryResponse> adminHistory(ReturnRequest request) {
        return history.findByReturnRequestIdOrderByCreatedAtAsc(request.getId()).stream()
                .map(entry -> new AdminHistoryResponse(entry.getStatus(), entry.getNote(),
                        entry.getChangedBy() == null ? null : entry.getChangedBy().getDisplayName(),
                        entry.getCreatedAt())).toList();
    }

    private CustomerRefundResponse customerRefund(ReturnRefundTransaction refund) {
        return new CustomerRefundResponse(refund.getAmount(), refund.getCurrency(), refund.getStatus(),
                refund.getProviderRefundId(), refund.getCreatedAt(), refund.getProcessedAt(),
                refund.getGatewayCreatedAt());
    }

    private AdminRefundResponse adminRefund(ReturnRefundTransaction refund, boolean retryable) {
        return new AdminRefundResponse(refund.getId(), refund.getProvider(), refund.getProviderRefundId(),
                refund.getAmount(), refund.getCurrency(), refund.getStatus(), refund.getErrorMessage(),
                refund.getCreatedAt(), refund.getProcessedAt(), refund.getGatewayCreatedAt(), retryable);
    }

    private void changeStatus(ReturnRequest request, String status, String note, User actor) {
        request.setStatus(status);
        request.setUpdatedAt(Instant.now());
        record(request, status, note, actor);
    }

    private void record(ReturnRequest request, String status, String note, User actor) {
        ReturnStatusHistory entry = new ReturnStatusHistory();
        entry.setReturnRequest(request);
        entry.setStatus(status);
        entry.setNote(note);
        entry.setChangedBy(actor);
        request.getHistory().add(entry);
        entityManager.persist(entry);
    }

    private void validateEvidence(MultipartFile file) {
        if (file == null || file.isEmpty() || file.getSize() > 10_000_000L) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_RETURN_EVIDENCE",
                    "Upload a non-empty image of 10 MB or less.");
        }
        String contentType = file.getContentType();
        boolean validType = contentType != null && Set.of("image/jpeg", "image/png", "image/webp").contains(contentType);
        String name = file.getOriginalFilename() == null ? "" : file.getOriginalFilename().toLowerCase(java.util.Locale.ROOT);
        boolean validExtension = switch (contentType == null ? "" : contentType) {
            case "image/jpeg" -> name.endsWith(".jpg") || name.endsWith(".jpeg");
            case "image/png" -> name.endsWith(".png");
            case "image/webp" -> name.endsWith(".webp");
            default -> false;
        };
        if (!validType || !validExtension) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_RETURN_EVIDENCE_TYPE",
                    "Evidence must be a JPEG, PNG, or WebP image.");
        }
        try (InputStream input = file.getInputStream()) {
            byte[] signature = input.readNBytes(12);
            boolean validSignature = switch (contentType) {
                case "image/jpeg" -> signature.length >= 3 && (signature[0] & 0xff) == 0xff
                        && (signature[1] & 0xff) == 0xd8 && (signature[2] & 0xff) == 0xff;
                case "image/png" -> signature.length >= 8 && (signature[0] & 0xff) == 0x89
                        && signature[1] == 'P' && signature[2] == 'N' && signature[3] == 'G';
                case "image/webp" -> signature.length >= 12 && signature[0] == 'R' && signature[1] == 'I'
                        && signature[2] == 'F' && signature[3] == 'F' && signature[8] == 'W'
                        && signature[9] == 'E' && signature[10] == 'B' && signature[11] == 'P';
                default -> false;
            };
            if (!validSignature) {
                throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_RETURN_EVIDENCE",
                        "The uploaded file contents do not match the selected image type.");
            }
        } catch (IOException e) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "RETURN_EVIDENCE_READ_FAILED",
                    "Return evidence could not be read.", e);
        }
    }

    private EvidenceFile loadEvidence(ReturnEvidence file) {
        try {
            return new EvidenceFile(storage.load(file.getStorageKey()), file.getContentType(), file.getOriginalName());
        } catch (IOException e) {
            throw new ApiException(HttpStatus.NOT_FOUND, "RETURN_EVIDENCE_NOT_FOUND",
                    "Return evidence was not found in storage.", e);
        }
    }

    private String safeFileName(String fileName) {
        String safe = fileName == null ? "return-evidence" : fileName.replaceAll("[^A-Za-z0-9._-]", "_");
        return safe.isBlank() ? "return-evidence" : safe.substring(0, Math.min(255, safe.length()));
    }

    private String evidenceUrl(String returnId, String evidenceId) {
        return evidenceUrl(returnId, evidenceId, false);
    }

    private String evidenceUrl(String returnId, String evidenceId, boolean admin) {
        return "/api/v1/" + (admin ? "admin/returns/" : "returns/") + returnId + "/evidence/" + evidenceId;
    }

    private String trimToNull(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_RETURN_REQUEST", message);
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

    public record EvidenceFile(InputStream stream, String contentType, String originalName) {}
}
