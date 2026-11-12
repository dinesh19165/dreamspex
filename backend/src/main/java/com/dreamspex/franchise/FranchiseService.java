package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.PhoneNumberNormalizer;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderService;
import com.dreamspex.order.OrderWorkflow;
import com.dreamspex.order.OrderDtos.ShippingAddressResponse;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.shopping.entity.CartItem;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.security.SecureRandom;
import java.time.Instant;
import java.util.List;
import java.util.Locale;
import java.util.Comparator;
import java.util.ArrayList;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.franchise.FranchiseDtos.*;
import static com.dreamspex.order.OrderDtos.StatusRequest;

@Service
public class FranchiseService {
    private static final Set<String> ACTIVE_STATUSES = Set.of("ACTIVE", "INACTIVE", "SUSPENDED");

    private final StoreRepository stores;
    private final FranchiseUserRepository franchiseUsers;
    private final FranchiseProductAssignmentRepository assignments;
    private final FranchiseInventoryRepository inventory;
    private final InventoryMovementRepository movements;
    private final FranchiseInventoryReservationRepository reservations;
    private final ProductRepository products;
    private final ProductVariantRepository variants;
    private final UserRepository users;
    private final RoleRepository roles;
    private final OrderRepository orders;
    private final CurrentUser currentUser;
    private final PasswordEncoder passwordEncoder;
    private final AuditLogService audit;
    private final ObjectProvider<OrderService> orderService;
    private final ReturnRequestRepository returnRequests;
    private final FranchiseInvitationService invitationService;
    private final ObjectMapper mapper;
    private final SecureRandom random = new SecureRandom();

    public FranchiseService(StoreRepository stores, FranchiseUserRepository franchiseUsers,
                            FranchiseProductAssignmentRepository assignments,
                            FranchiseInventoryRepository inventory, InventoryMovementRepository movements,
                            FranchiseInventoryReservationRepository reservations, ProductRepository products,
                            ProductVariantRepository variants, UserRepository users, RoleRepository roles,
                            OrderRepository orders, CurrentUser currentUser, PasswordEncoder passwordEncoder,
                            AuditLogService audit, ObjectProvider<OrderService> orderService,
                            ReturnRequestRepository returnRequests, FranchiseInvitationService invitationService,
                            ObjectMapper mapper) {
        this.stores = stores;
        this.franchiseUsers = franchiseUsers;
        this.assignments = assignments;
        this.inventory = inventory;
        this.movements = movements;
        this.reservations = reservations;
        this.products = products;
        this.variants = variants;
        this.users = users;
        this.roles = roles;
        this.orders = orders;
        this.currentUser = currentUser;
        this.passwordEncoder = passwordEncoder;
        this.audit = audit;
        this.orderService = orderService;
        this.returnRequests = returnRequests;
        this.invitationService = invitationService;
        this.mapper = mapper;
    }

    @Transactional(readOnly = true)
    public List<FranchiseResponse> adminList() {
        return stores.findByFranchiseManagedTrueOrderByNameAsc().stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public List<StorefrontFranchiseResponse> storefrontFranchises() {
        return stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE").stream()
                .map(store -> new StorefrontFranchiseResponse(store.getId(), store.getName(), store.getAddress(),
                        store.getCity(), store.getState(), store.getPostalCode(), store.getLatitude(),
                        store.getLongitude(), store.getDeliveryRadiusKm(), store.getOwnerName(), store.getPhone(),
                        store.getOpeningHours(), availableServices(store)))
                .toList();
    }

    @Transactional
    public Store requireStorefrontFranchise(String id) {
        return stores.findById(id).filter(Store::isFranchiseManaged)
                .filter(store -> "ACTIVE".equals(store.getStatus()))
                .orElseThrow(() -> notFound("FRANCHISE_NOT_FOUND", "Selected franchise is not available."));
    }

    @Transactional
    public List<String> storefrontProductIds(String storeId) {
        requireStorefrontFranchise(storeId);
        return products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED").stream()
                .filter(product -> !variants.findByProductIdAndStatusOrderBySku(product.getId(), "ACTIVE").isEmpty())
                .map(Product::getId).toList();
    }

    @Transactional
    public List<FranchiseInventory> storefrontProductInventory(String storeId, String productId) {
        Store store = requireStorefrontFranchise(storeId);
        Product product = products.findByIdAndStatusAndDeletedAtIsNull(productId, "PUBLISHED")
                .orElseThrow(() -> notFound("PRODUCT_NOT_FOUND", "Product was not found."));
        ensureProductInventory(store, product);
        return inventory.findByStoreIdAndVariantProductIdAndAvailabilityStatus(storeId, productId, "ACTIVE");
    }

    @Transactional
    public int storefrontAvailableQuantity(String storeId, String variantId) {
        requireStorefrontFranchise(storeId);
        FranchiseInventory row = inventory.findByStoreIdAndVariantId(storeId, variantId)
                .filter(value -> "ACTIVE".equals(value.getAvailabilityStatus()))
                .orElse(null);
        if (row == null) return 0;
        if (!"PUBLISHED".equals(row.getVariant().getProduct().getStatus())
                || row.getVariant().getProduct().getDeletedAt() != null) return 0;
        return row.getAvailableQuantity();
    }

    @Transactional
    public void validateStorefrontCartItem(String storeId, String variantId, int quantity) {
        if (storefrontAvailableQuantity(storeId, variantId) < quantity) {
            throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_STOCK_UNAVAILABLE",
                    "The selected franchise does not have enough stock for this product.");
        }
    }

    @Transactional(readOnly = true)
    public List<StorefrontAvailabilityResponse> storefrontAvailability(StorefrontAvailabilityRequest request) {
        return stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE").stream().map(store -> {
            BigDecimal distance = null;
            boolean serviceable = false;
            if (request.latitude() != null && request.longitude() != null && hasDeliveryConfiguration(store)) {
                double rawDistance = com.dreamspex.order.DeliveryAvailabilityService.distanceKm(
                        request.latitude().doubleValue(), request.longitude().doubleValue(),
                        store.getLatitude().doubleValue(), store.getLongitude().doubleValue());
                distance = BigDecimal.valueOf(rawDistance).setScale(2, java.math.RoundingMode.HALF_UP);
                serviceable = rawDistance <= store.getDeliveryRadiusKm().doubleValue() + 1e-9;
            }
            List<StorefrontItemAvailability> items = request.items().stream().map(item -> {
                int available = storefrontAvailableQuantity(store.getId(), item.variantId());
                return new StorefrontItemAvailability(item.variantId(), item.quantity(), available,
                        available >= item.quantity());
            }).toList();
            return new StorefrontAvailabilityResponse(store.getId(), store.getName(), store.getAddress(),
                    store.getCity(), store.getState(), store.getPostalCode(), distance, serviceable,
                    items.stream().allMatch(StorefrontItemAvailability::availableForItem), items);
        }).toList();
    }

    public record StoreSelection(Store store, boolean available, String status, BigDecimal distanceKm,
                                 BigDecimal radiusKm, String message) {}

    @Transactional
    public StoreSelection selectFulfillmentStore(Address address, List<CartItem> cartItems, String fulfillmentType,
                                                  String requestedStoreId, boolean lockInventory) {
        List<Store> activeStores = stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE");
        if (activeStores.isEmpty()) return null;
        boolean pickup = "PICKUP".equals(fulfillmentType);
        if (pickup && (requestedStoreId == null || requestedStoreId.isBlank())) {
            return unavailableSelection("FRANCHISE_REQUIRED", "Select an active franchise for store pickup.");
        }
        if (!pickup && (address == null || address.getLatitude() == null || address.getLongitude() == null)) {
            return unavailableSelection("LOCATION_REQUIRED",
                    "Select a valid delivery location on the map to check availability.");
        }

        List<StoreDistance> candidates = activeStores.stream()
                .filter(store -> requestedStoreId == null || requestedStoreId.isBlank()
                        || requestedStoreId.equals(store.getId()))
                .filter(store -> pickup || hasDeliveryConfiguration(store))
                .map(store -> new StoreDistance(store, pickup ? 0 : com.dreamspex.order.DeliveryAvailabilityService.distanceKm(
                        address.getLatitude().doubleValue(), address.getLongitude().doubleValue(),
                        store.getLatitude().doubleValue(), store.getLongitude().doubleValue())))
                .filter(candidate -> pickup || candidate.distanceKm() <= candidate.store().getDeliveryRadiusKm().doubleValue() + 1e-9)
                .sorted(Comparator.comparingDouble(StoreDistance::distanceKm))
                .toList();

        for (StoreDistance candidate : candidates) {
            if (hasCartStock(candidate.store(), cartItems, lockInventory)) {
                BigDecimal distance = pickup ? null
                        : BigDecimal.valueOf(candidate.distanceKm()).setScale(2, java.math.RoundingMode.HALF_UP);
                return new StoreSelection(candidate.store(), true, "AVAILABLE", distance,
                        candidate.store().getDeliveryRadiusKm(),
                        pickup ? "Pickup is available at " + candidate.store().getName() + "."
                                : "Delivery is available from " + candidate.store().getName() + ".");
            }
        }
        if (candidates.isEmpty() && !pickup) {
            return unavailableSelection("OUTSIDE_DELIVERY_AREA",
                    "Sorry, this location is outside our franchise delivery area.");
        }
        if (!pickup && requestedStoreId != null && !requestedStoreId.isBlank()
                && activeStores.stream().noneMatch(store -> requestedStoreId.equals(store.getId()))) {
            return unavailableSelection("FRANCHISE_UNAVAILABLE", "The selected franchise is unavailable.");
        }
        String message = pickup ? "This store cannot fulfill every item in your cart."
                : "No single nearby franchise has every item in your cart in stock.";
        return new StoreSelection(null, false, "FRANCHISE_STOCK_UNAVAILABLE", null, null, message);
    }

    @Transactional(readOnly = true)
    public FranchiseResponse adminGet(String id) {
        return response(requireStore(id));
    }

    @Transactional
    public FranchiseCreateResponse create(Authentication authentication, FranchiseRequest request) {
        User actor = currentUser.require(authentication);
        validateRequest(request, null);
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = PhoneNumberNormalizer.normalize(request.phone());
        if (phone == null) {
            throw invalid("Enter a valid Indian phone number.");
        }
        if (users.findByEmailIgnoreCaseAndDeletedAtIsNull(email).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_EMAIL_EXISTS",
                    "A user account already exists for this email.");
        }
        if (users.findByPhoneAndDeletedAtIsNull(phone).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_ACCOUNT_EXISTS",
                    "A user account already exists for this phone number.");
        }
        Store store = new Store();
        apply(store, request, phone, email);
        store.setFranchiseManaged(true);
        store = stores.save(store);
        ensureStoreInventory(store);

        User user = new User();
        user.setEmail(email);
        user.setPhone(phone);
        user.setDisplayName(request.ownerName().trim());
        user.setPasswordHash(passwordEncoder.encode(randomPassword()));
        user.setStatus("ACTIVE");
        Role role = roles.findByCode("FRANCHISE_ADMIN").orElseThrow(() ->
                new IllegalStateException("FRANCHISE_ADMIN role is missing from the database."));
        user.getRoles().add(role);
        users.save(user);

        FranchiseUser link = new FranchiseUser();
        link.setStore(store);
        link.setUser(user);
        franchiseUsers.save(link);
        invitationService.invite(link);
        audit.record(actor, "FRANCHISE_CREATED", "STORE", store.getId());
        return new FranchiseCreateResponse(response(store), email, "/franchise/setup");
    }

    @Transactional
    public FranchiseResponse update(Authentication authentication, String id, FranchiseRequest request) {
        User actor = currentUser.require(authentication);
        Store store = requireStore(id);
        validateRequest(request, store.getId());
        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String phone = PhoneNumberNormalizer.normalize(request.phone());
        if (phone == null) throw invalid("Enter a valid Indian phone number.");
        franchiseUsers.findByStoreId(id).stream().findFirst().ifPresent(link -> {
            User owner = link.getUser();
            users.findByEmailIgnoreCaseAndDeletedAtIsNull(email)
                    .filter(existing -> !existing.getId().equals(owner.getId()))
                    .ifPresent(existing -> { throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_ACCOUNT_EXISTS",
                            "A user account already exists for this email."); });
            users.findByPhoneAndDeletedAtIsNull(phone)
                    .filter(existing -> !existing.getId().equals(owner.getId()))
                    .ifPresent(existing -> { throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_ACCOUNT_EXISTS",
                            "A user account already exists for this phone number."); });
            owner.setEmail(email);
            owner.setPhone(phone);
            owner.setDisplayName(request.ownerName().trim());
            users.save(owner);
        });
        apply(store, request, phone, email);
        Store saved = stores.save(store);
        if ("ACTIVE".equals(saved.getStatus())) ensureStoreInventory(saved);
        audit.record(actor, "FRANCHISE_UPDATED", "STORE", saved.getId());
        return response(saved);
    }

    @Transactional
    public void syncPublishedProductInventory(Product product) {
        if (product.getDeletedAt() != null || !"PUBLISHED".equals(product.getStatus())) return;
        stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE")
                .forEach(store -> ensureProductInventory(store, product));
    }

    @Transactional
    public void syncActiveFranchiseInventory(String storeId) {
        ensureStoreInventory(requireManagedStore(storeId));
    }

    @Transactional(readOnly = true)
    public List<FranchiseUserResponse> adminUsers(String storeId) {
        requireStore(storeId);
        return franchiseUsers.findByStoreId(storeId).stream()
                .map(link -> new FranchiseUserResponse(link.getUser().getId(), link.getUser().getDisplayName(),
                        link.getUser().getEmail(), link.getUser().getPhone(), link.getUser().getStatus(),
                        link.getUser().getCreatedAt()))
                .toList();
    }

    @Transactional
    public List<AssignmentResponse> assignProduct(Authentication authentication, String storeId,
                                                   AssignmentRequest request) {
        User actor = currentUser.require(authentication);
        Store store = requireManagedStore(storeId);
        Product product = products.findById(request.productId())
                .filter(value -> value.getDeletedAt() == null && "PUBLISHED".equals(value.getStatus()))
                .orElseThrow(() -> notFound("PRODUCT_NOT_FOUND", "Published product was not found."));
        List<ProductVariant> activeVariants = variants.findByProductIdAndStatusOrderBySku(product.getId(), "ACTIVE");
        if (activeVariants.isEmpty()) throw invalid("A product must have an active variant before assignment.");

        FranchiseProductAssignment assignment = assignments.findByStoreIdAndProductId(storeId, product.getId())
                .orElseGet(FranchiseProductAssignment::new);
        assignment.setStore(store);
        assignment.setProduct(product);
        assignment.setAvailabilityStatus(request.availabilityStatus());
        assignments.save(assignment);
        for (ProductVariant variant : activeVariants) {
            FranchiseInventory row = inventory.findByStoreIdAndVariantId(storeId, variant.getId())
                    .orElseGet(() -> {
                        FranchiseInventory created = new FranchiseInventory();
                        created.setStore(store);
                        created.setVariant(variant);
                        created.setQuantity(request.initialStock());
                        created.setLowStockThreshold(request.lowStockThreshold());
                        created.setAvailabilityStatus(request.availabilityStatus());
                        return created;
                    });
            row.setLowStockThreshold(request.lowStockThreshold());
            row.setAvailabilityStatus(request.availabilityStatus());
            inventory.save(row);
            String reference = "ASSIGNMENT:" + assignment.getId() + ":" + variant.getId();
            if (request.initialStock() > 0
                    && !movements.existsByReferenceIdAndMovementType(reference, "ASSIGNMENT")) {
                recordMovement(store, variant, actor, "ASSIGNMENT", request.initialStock(),
                        reference, "Initial franchise stock.");
            }
        }
        audit.record(actor, "FRANCHISE_PRODUCT_ASSIGNED", "PRODUCT", product.getId());
        return productAssignments(storeId);
    }

    @Transactional
    public InventoryResponse adjustInventory(Authentication authentication, String storeId, String inventoryId,
                                             InventoryAdjustmentRequest request) {
        User actor = currentUser.require(authentication);
        FranchiseInventory row = inventory.findById(inventoryId)
                .filter(value -> value.getStore().getId().equals(storeId))
                .orElseThrow(() -> notFound("INVENTORY_NOT_FOUND", "Franchise inventory was not found."));
        int previous = row.getQuantity();
        if (request.quantity() < row.getReservedQuantity()) {
            throw invalid("Stock cannot be adjusted below the quantity already reserved for pending orders.");
        }
        row.setQuantity(request.quantity());
        row.setLowStockThreshold(request.lowStockThreshold());
        inventory.save(row);
        int delta = request.quantity() - previous;
        if (delta != 0) recordMovement(row.getStore(), row.getVariant(), actor, "ADJUSTMENT", delta,
                UUID.randomUUID().toString(), request.note().trim());
        audit.record(actor, "FRANCHISE_INVENTORY_ADJUSTED", "FRANCHISE_INVENTORY", inventoryId);
        return inventoryResponse(row);
    }

    @Transactional
    public InventoryResponse adjustOwnInventory(Authentication authentication, String inventoryId,
                                                InventoryAdjustmentRequest request) {
        return adjustInventory(authentication, franchiseStore(authentication).getId(), inventoryId, request);
    }

    @Transactional(readOnly = true)
    public List<InventoryMovementResponse> inventoryMovements() {
        return stores.findByFranchiseManagedTrueOrderByNameAsc().stream().flatMap(store ->
                movements.findTop100ByStoreIdOrderByCreatedAtDesc(store.getId()).stream()).limit(500)
                .map(this::inventoryMovementResponse).toList();
    }

    @Transactional
    public List<AssignmentResponse> productAssignments(String storeId) {
        Store store = requireStore(storeId);
        return products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED").stream()
                .filter(product -> !variants.findByProductIdAndStatusOrderBySku(product.getId(), "ACTIVE").isEmpty())
                .map(product -> {
                    if ("ACTIVE".equals(store.getStatus())) ensureProductInventory(store, product);
                    return new AssignmentResponse(product.getId(), product.getName(), product.getBrand(), "ACTIVE",
                            inventory.findByStoreIdAndVariantProductIdAndAvailabilityStatus(
                                    storeId, product.getId(), "ACTIVE").stream().map(this::inventoryResponse).toList());
                }).toList();
    }

    @Transactional(readOnly = true)
    public FranchiseResponse me(Authentication authentication) {
        return response(franchiseStore(authentication));
    }

    @Transactional(readOnly = true)
    public DashboardResponse dashboard(Authentication authentication) {
        Store store = franchiseStore(authentication);
        List<FranchiseInventory> stock = inventory.findByStoreIdAndAvailabilityStatus(store.getId(), "ACTIVE");
        List<Order> franchiseOrders = orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(store.getId());
        long pending = franchiseOrders.stream().filter(order -> Set.of("PENDING_PAYMENT").contains(order.getStatus())).count();
        long processing = franchiseOrders.stream().filter(order -> Set.of("PAID", "PROCESSING").contains(order.getStatus())).count();
        long delivered = franchiseOrders.stream().filter(order -> "DELIVERED".equals(order.getStatus())).count();
        long readyForPickup = franchiseOrders.stream().filter(order -> "READY_FOR_PICKUP".equals(order.getStatus())).count();
        long pickedUp = franchiseOrders.stream().filter(order -> "PICKED_UP".equals(order.getStatus())).count();
        BigDecimal revenue = franchiseOrders.stream().filter(order -> "PAID".equals(order.getPaymentStatus())
                        && !"CANCELLED".equals(order.getStatus()))
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        List<ReturnRequest> franchiseReturns = returnRequests.findByOrderFulfillmentStoreIdOrderByCreatedAtDesc(store.getId());
        BigDecimal completedRefunds = franchiseReturns.stream().filter(item -> "REFUNDED".equals(item.getStatus()))
                .map(ReturnRequest::getRefundAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new DashboardResponse(products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED").size(),
                stock.stream().mapToLong(FranchiseInventory::getAvailableQuantity).sum(),
                stock.stream().filter(row -> row.getAvailableQuantity() > 0
                        && row.getAvailableQuantity() <= row.getLowStockThreshold()).count(),
                stock.stream().filter(row -> row.getAvailableQuantity() == 0).count(), franchiseOrders.size(),
                pending, processing, delivered, readyForPickup, pickedUp, franchiseReturns.size(), revenue,
                franchiseReturns.stream().map(ReturnRequest::getRefundAmount).reduce(BigDecimal.ZERO, BigDecimal::add),
                completedRefunds);
    }

    @Transactional
    public List<InventoryResponse> franchiseInventory(Authentication authentication) {
        Store store = franchiseStore(authentication);
        if ("ACTIVE".equals(store.getStatus())) ensureStoreInventory(store);
        return inventory.findByStoreIdOrderByVariantProductNameAsc(store.getId()).stream()
                .map(this::inventoryResponse).toList();
    }

    @Transactional(readOnly = true)
    public void validateCartAvailability(Store store, List<CartItem> cartItems) {
        if (store == null || !store.isFranchiseManaged()) return;
        for (CartItem item : cartItems) {
            validateStorefrontCartItem(store.getId(), item.getVariant().getId(), item.getQuantity());
        }
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> franchiseOrders(Authentication authentication) {
        Store store = franchiseStore(authentication);
        return orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(store.getId()).stream().map(this::orderResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReturnResponse> franchiseReturns(Authentication authentication) {
        Store store = franchiseStore(authentication);
        return returnRequests.findByOrderFulfillmentStoreIdOrderByCreatedAtDesc(store.getId()).stream()
                .map(this::returnResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<ReturnResponse> adminReturns(String storeId) {
        requireStore(storeId);
        return returnRequests.findByOrderFulfillmentStoreIdOrderByCreatedAtDesc(storeId).stream()
                .map(this::returnResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<OrderResponse> franchiseOrdersForAdmin(String storeId) {
        requireStore(storeId);
        return orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(storeId).stream().map(this::orderResponse).toList();
    }

    @Transactional(readOnly = true)
    public List<AssignmentResponse> productAssignmentsForUser(Authentication authentication) {
        return productAssignments(franchiseStore(authentication).getId());
    }

    @Transactional(readOnly = true)
    public List<InventoryMovementResponse> franchiseMovements(Authentication authentication) {
        Store store = franchiseStore(authentication);
        return movements.findTop100ByStoreIdOrderByCreatedAtDesc(store.getId()).stream()
                .map(this::inventoryMovementResponse).toList();
    }

    @Transactional(readOnly = true)
    public OrderResponse franchiseOrder(Authentication authentication, String orderId) {
        Store store = franchiseStore(authentication);
        Order order = orders.findById(orderId).filter(value -> value.getFulfillmentStore() != null
                        && store.getId().equals(value.getFulfillmentStore().getId()))
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        return orderResponse(order);
    }

    @Transactional
    public OrderResponse updateOrderStatus(Authentication authentication, String orderId, OrderStatusRequest request) {
        Store store = franchiseStore(authentication);
        Order order = orders.findById(orderId).filter(value -> value.getFulfillmentStore() != null
                        && store.getId().equals(value.getFulfillmentStore().getId()))
                .orElseThrow(() -> notFound("ORDER_NOT_FOUND", "Order was not found."));
        Set<String> allowedStatuses = OrderWorkflow.nextStatuses(order.getStatus(), order.getFulfillmentType())
                .stream().filter(status -> !"CANCELLED".equals(status) && !"DELIVERED".equals(status))
                .collect(java.util.stream.Collectors.toSet());
        if (!allowedStatuses.contains(request.status())) {
            throw invalid("The requested status is not available for this order's fulfillment type.");
        }
        if (!"PAID".equals(order.getPaymentStatus())) {
            throw invalid("Only paid orders can be processed by the franchise.");
        }
        orderService.getObject().adminStatus(authentication, order.getId(), new StatusRequest(request.status(), request.note()));
        return orderResponse(order);
    }

    @Transactional(readOnly = true)
    public ReportResponse franchiseReport(Authentication authentication, Instant from, Instant to) {
        Store store = franchiseStore(authentication);
        validateRange(from, to);
        return report(store, from, to,
                orders.findByFulfillmentStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                        store.getId(), from, to),
                returnRequests.findByOrderFulfillmentStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                        store.getId(), from, to));
    }

    @Transactional(readOnly = true)
    public List<ReportResponse> adminReports(Instant from, Instant to) {
        validateRange(from, to);
        return stores.findByFranchiseManagedTrueOrderByNameAsc().stream().map(store -> report(store, from, to,
                orders.findByFulfillmentStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                        store.getId(), from, to),
                returnRequests.findByOrderFulfillmentStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
                        store.getId(), from, to))).toList();
    }

    @Transactional
    public void reserveOrder(Order order) {
        Store store = order.getFulfillmentStore();
        if (store == null || !store.isFranchiseManaged()) return;
        for (OrderItem item : order.getItems()) {
            FranchiseInventory row = inventory.findForUpdate(store.getId(), item.getVariant().getId())
                    .filter(value -> "ACTIVE".equals(value.getAvailabilityStatus()))
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "FRANCHISE_STOCK_UNAVAILABLE",
                            "A product is not available at the selected fulfillment franchise."));
            if (row.getAvailableQuantity() < item.getQuantity()) {
                throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_STOCK_UNAVAILABLE",
                        "The selected franchise does not have enough stock.");
            }
            row.setReservedQuantity(row.getReservedQuantity() + item.getQuantity());
            inventory.save(row);
            FranchiseInventoryReservation reservation = reservations
                    .findByOrderIdAndInventoryId(order.getId(), row.getId()).orElseGet(FranchiseInventoryReservation::new);
            reservation.setOrder(order);
            reservation.setInventory(row);
            reservation.setQuantity(item.getQuantity());
            reservation.setStatus("RESERVED");
            reservations.save(reservation);
            recordMovement(store, item.getVariant(), null, "RESERVED", 0, order.getId(),
                    "Reserved " + item.getQuantity() + " units for " + order.getOrderNumber() + ".");
        }
    }

    @Transactional
    public void ensureOrderReserved(Order order) {
        Store store = order.getFulfillmentStore();
        if (store == null || !store.isFranchiseManaged()) return;
        for (OrderItem item : order.getItems()) {
            FranchiseInventory row = inventory.findForUpdate(store.getId(), item.getVariant().getId())
                    .filter(value -> "ACTIVE".equals(value.getAvailabilityStatus()))
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "FRANCHISE_STOCK_UNAVAILABLE",
                            "A product is not available at the selected fulfillment franchise."));
            FranchiseInventoryReservation reservation = reservations.findByOrderIdAndInventoryId(order.getId(), row.getId())
                    .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "FRANCHISE_RESERVATION_MISSING",
                            "The franchise stock reservation is missing."));
            if ("RESERVED".equals(reservation.getStatus())) continue;
            if (row.getAvailableQuantity() < item.getQuantity()) {
                throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_STOCK_UNAVAILABLE",
                        "The selected franchise no longer has enough stock.");
            }
            row.setReservedQuantity(row.getReservedQuantity() + item.getQuantity());
            inventory.save(row);
            reservation.setStatus("RESERVED");
            reservations.save(reservation);
            recordMovement(store, item.getVariant(), null, "RESERVED", 0, order.getId(),
                    "Re-reserved " + item.getQuantity() + " units for payment retry.");
        }
    }

    @Transactional
    public void commitOrder(Order order) {
        for (FranchiseInventoryReservation reservation : reservations.findByOrderId(order.getId())) {
            if (!"RESERVED".equals(reservation.getStatus())) continue;
            FranchiseInventory row = inventory.findById(reservation.getInventory().getId())
                    .orElseThrow(() -> new IllegalStateException("Reserved franchise inventory was removed."));
            row.setReservedQuantity(Math.max(0, row.getReservedQuantity() - reservation.getQuantity()));
            row.setQuantity(row.getQuantity() - reservation.getQuantity());
            inventory.save(row);
            reservation.setStatus("SOLD");
            reservations.save(reservation);
            recordMovement(row.getStore(), row.getVariant(), null, "SALE", -reservation.getQuantity(),
                    order.getId(), "Stock deducted after verified payment.");
        }
    }

    @Transactional
    public void releaseOrder(Order order, boolean restoreSoldStock) {
        for (FranchiseInventoryReservation reservation : reservations.findByOrderId(order.getId())) {
            FranchiseInventory row = inventory.findById(reservation.getInventory().getId())
                    .orElseThrow(() -> new IllegalStateException("Reserved franchise inventory was removed."));
            if ("RESERVED".equals(reservation.getStatus())) {
                row.setReservedQuantity(Math.max(0, row.getReservedQuantity() - reservation.getQuantity()));
                reservation.setStatus("RELEASED");
                recordMovement(row.getStore(), row.getVariant(), null, "RELEASED", 0, order.getId(),
                        "Unpaid order reservation released.");
            } else if ("SOLD".equals(reservation.getStatus()) && restoreSoldStock) {
                row.setQuantity(row.getQuantity() + reservation.getQuantity());
                reservation.setStatus("RESTORED");
                recordMovement(row.getStore(), row.getVariant(), null, "CANCELLED", reservation.getQuantity(),
                        order.getId(), "Stock restored after order cancellation.");
            }
            inventory.save(row);
            reservations.save(reservation);
        }
    }

    @Transactional
    public void restockReturnItems(ReturnRequest request, User actor) {
        Store store = request.getOrder().getFulfillmentStore();
        if (store == null || !store.isFranchiseManaged()) return;
        request.getItems().forEach(item -> {
            ProductVariant variant = item.getOrderItem().getVariant();
            FranchiseInventory row = inventory.findForUpdate(store.getId(), variant.getId())
                    .orElseThrow(() -> new IllegalStateException("Returned product has no franchise inventory record."));
            String reference = "RETURN:" + request.getId() + ":" + item.getId();
            if (movements.existsByReferenceIdAndMovementType(reference, "RETURN")) return;
            row.setQuantity(row.getQuantity() + item.getQuantity());
            inventory.save(row);
            recordMovement(store, variant, actor, "RETURN", item.getQuantity(), reference,
                    "Returned stock restored after inspection and return approval.");
        });
    }

    private boolean hasCartStock(Store store, List<CartItem> cartItems, boolean lockInventory) {
        for (CartItem item : cartItems) {
            FranchiseInventory row = (lockInventory
                    ? inventory.findForUpdate(store.getId(), item.getVariant().getId())
                    : inventory.findByStoreIdAndVariantId(store.getId(), item.getVariant().getId()))
                    .filter(value -> "ACTIVE".equals(value.getAvailabilityStatus())
                            && "ACTIVE".equals(value.getVariant().getStatus())
                            && "PUBLISHED".equals(value.getVariant().getProduct().getStatus())
                            && value.getVariant().getProduct().getDeletedAt() == null)
                    .orElse(null);
            if (row == null || row.getAvailableQuantity() < item.getQuantity()) return false;
        }
        return true;
    }

    private void ensureStoreInventory(Store store) {
        products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED")
                .forEach(product -> ensureProductInventory(store, product));
    }

    private void ensureProductInventory(Store store, Product product) {
        for (ProductVariant variant : variants.findByProductIdAndStatusOrderBySku(product.getId(), "ACTIVE")) {
            if (inventory.findByStoreIdAndVariantId(store.getId(), variant.getId()).isPresent()) continue;
            FranchiseInventory row = new FranchiseInventory();
            row.setStore(store);
            row.setVariant(variant);
            row.setQuantity(0);
            row.setLowStockThreshold(0);
            row.setAvailabilityStatus("ACTIVE");
            inventory.save(row);
        }
    }

    private static boolean hasDeliveryConfiguration(Store store) {
        return store.getLatitude() != null && store.getLongitude() != null
                && store.getDeliveryRadiusKm() != null && store.getDeliveryRadiusKm().signum() > 0;
    }

    private StoreSelection unavailableSelection(String status, String message) {
        return new StoreSelection(null, false, status, null, null, message);
    }

    private record StoreDistance(Store store, double distanceKm) {}

    private Store franchiseStore(Authentication authentication) {
        User user = currentUser.require(authentication);
        return franchiseUsers.findByUserId(user.getId())
                .map(FranchiseUser::getStore)
                .filter(Store::isFranchiseManaged)
                .orElseThrow(() -> new ApiException(HttpStatus.FORBIDDEN, "FRANCHISE_ACCESS_DENIED",
                        "A franchise account associated with a managed store is required."));
    }

    private Store requireStore(String id) {
        return stores.findById(id).filter(Store::isFranchiseManaged)
                .orElseThrow(() -> notFound("FRANCHISE_NOT_FOUND", "Franchise was not found."));
    }

    private Store requireManagedStore(String id) {
        Store store = requireStore(id);
        if (!"ACTIVE".equals(store.getStatus())) {
            throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_INACTIVE", "The franchise is not active.");
        }
        return store;
    }

    private void validateRequest(FranchiseRequest request, String id) {
        stores.findByFranchiseCodeIgnoreCase(request.franchiseCode().trim())
                .filter(existing -> !existing.getId().equals(id))
                .ifPresent(existing -> { throw new ApiException(HttpStatus.CONFLICT, "FRANCHISE_CODE_EXISTS",
                        "A franchise already uses this code."); });
        boolean coordinatesComplete = (request.latitude() == null) == (request.longitude() == null);
        if (!coordinatesComplete || ("ACTIVE".equals(request.status())
                && (request.latitude() == null || request.deliveryRadiusKm() == null))) {
            throw invalid("Active franchises require valid map coordinates and a delivery radius.");
        }
        if (!ACTIVE_STATUSES.contains(request.status())) throw invalid("Invalid franchise status.");
    }

    private void apply(Store store, FranchiseRequest request, String phone, String email) {
        store.setFranchiseCode(request.franchiseCode().trim().toUpperCase(Locale.ROOT));
        store.setName(request.name().trim());
        store.setOwnerName(request.ownerName().trim());
        store.setOwnerEmail(email);
        store.setPhone(phone);
        store.setAddress(request.address().trim());
        store.setCity(request.city().trim());
        store.setState(request.state().trim());
        store.setPostalCode(request.postalCode().trim());
        store.setGstNumber(request.gstNumber() == null ? null : request.gstNumber().trim());
        store.setBusinessType(request.businessType() == null ? null : request.businessType().trim());
        store.setOpeningHours(request.openingHours() == null ? null : request.openingHours().trim());
        store.setAvailableServices(request.availableServices() == null || request.availableServices().isBlank()
                ? null : request.availableServices().trim());
        store.setLatitude(request.latitude());
        store.setLongitude(request.longitude());
        store.setDeliveryRadiusKm(request.deliveryRadiusKm());
        store.setStatus(request.status());
        store.setFranchiseManaged(true);
    }

    private FranchiseResponse response(Store store) {
        long productCount = products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED").size();
        List<Order> franchiseOrders = orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(store.getId());
        BigDecimal sales = franchiseOrders.stream().filter(order -> "PAID".equals(order.getPaymentStatus())
                        && !"CANCELLED".equals(order.getStatus()))
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new FranchiseResponse(store.getId(), store.getFranchiseCode(), store.getName(),
                store.getOwnerName(), store.getOwnerEmail(), store.getPhone(), store.getAddress(),
                store.getCity(), store.getState(), store.getPostalCode(), store.getGstNumber(),
                store.getBusinessType(), store.getStatus(), store.getLatitude(), store.getLongitude(),
                store.getDeliveryRadiusKm(), productCount, franchiseOrders.size(), sales, store.getCreatedAt(),
                store.getOpeningHours(), availableServices(store));
    }

    private List<String> availableServices(Store store) {
        if (store.getAvailableServices() == null || store.getAvailableServices().isBlank()) return List.of();
        return java.util.Arrays.stream(store.getAvailableServices().split("[,\\n]"))
                .map(String::trim).filter(value -> !value.isBlank()).distinct().toList();
    }

    private AssignmentResponse assignmentResponse(Store store, FranchiseProductAssignment assignment) {
        List<InventoryResponse> stock = inventory.findByStoreIdOrderByVariantProductNameAsc(store.getId()).stream()
                .filter(row -> assignment.getProduct().getId().equals(row.getVariant().getProduct().getId()))
                .map(this::inventoryResponse).toList();
        Product product = assignment.getProduct();
        return new AssignmentResponse(product.getId(), product.getName(), product.getBrand(),
                assignment.getAvailabilityStatus(), stock);
    }

    private InventoryResponse inventoryResponse(FranchiseInventory row) {
        int available = row.getAvailableQuantity();
        String state = available == 0 ? "OUT_OF_STOCK"
                : available <= row.getLowStockThreshold() ? "LOW_STOCK" : "IN_STOCK";
        ProductVariant variant = row.getVariant();
        return new InventoryResponse(row.getId(), variant.getProduct().getId(), variant.getProduct().getName(),
                variant.getId(), variant.getSku(), row.getQuantity(), row.getReservedQuantity(), available,
                row.getLowStockThreshold(), row.getAvailabilityStatus(), state);
    }

    private OrderResponse orderResponse(Order order) {
        Store store = order.getFulfillmentStore();
        FulfillmentStoreResponse fulfillmentStore = store == null ? null
                : new FulfillmentStoreResponse(store.getId(), store.getName(), store.getPhone(), store.getAddress(),
                        store.getCity(), store.getState(), store.getPostalCode());
        return new OrderResponse(order.getId(), order.getOrderNumber(), order.getUser().getDisplayName(),
                order.getUser().getEmail(), order.getUser().getPhone(), order.getStatus(), order.getPaymentStatus(),
                order.getTotalAmount(), order.getItems().stream().map(OrderItem::getProductNameSnapshot).toList(),
                order.getCreatedAt(), order.getFulfillmentType(), fulfillmentStore,
                shippingAddress(order.getAddressSnapshot()));
    }

    private ShippingAddressResponse shippingAddress(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) return null;
        try {
            var json = mapper.readTree(snapshot);
            return new ShippingAddressResponse(text(json, "recipientName"), text(json, "phone"),
                    text(json, "line1"), text(json, "line2"), text(json, "city"), text(json, "state"),
                    text(json, "postalCode"), text(json, "countryCode"));
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "ADDRESS_SNAPSHOT_ERROR",
                    "Order address could not be read.", e);
        }
    }

    private String text(com.fasterxml.jackson.databind.JsonNode json, String field) {
        return json.path(field).isNull() ? null : json.path(field).asText(null);
    }

    private ReportResponse report(Store store, Instant from, Instant to, List<Order> values,
                                  List<ReturnRequest> returnValues) {
        List<Order> paid = values.stream().filter(order -> "PAID".equals(order.getPaymentStatus())).toList();
        List<ReturnRequest> refunded = returnValues.stream().filter(request -> "REFUNDED".equals(request.getStatus())).toList();
        BigDecimal refunds = refunded.stream().map(ReturnRequest::getRefundAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal revenue = paid.stream().filter(order -> !"CANCELLED".equals(order.getStatus()))
                .map(Order::getTotalAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        return new ReportResponse(store.getId(), store.getName(), from, to, values.size(), paid.size(),
                values.stream().filter(order -> Set.of("PENDING_PAYMENT", "PAID", "PROCESSING")
                        .contains(order.getStatus())).count(),
                values.stream().filter(order -> "CANCELLED".equals(order.getStatus())).count(),
                values.stream().filter(order -> "DELIVERED".equals(order.getStatus())).count(),
                returnValues.size(), refunded.size(), revenue, refunds);
    }

    private ReturnResponse returnResponse(ReturnRequest request) {
        return new ReturnResponse(request.getId(), request.getRequestNumber(),
                request.getOrder().getOrderNumber(), request.getUser().getDisplayName(),
                request.getStatus(), request.getReasonCode(), request.getRefundAmount(), request.getCreatedAt());
    }

    private void validateRange(Instant from, Instant to) {
        if (from == null || to == null || !from.isBefore(to)
                || to.isAfter(Instant.now().plusSeconds(86400))
                || from.plusSeconds(366L * 86400).isBefore(to)) {
            throw invalid("A valid date range is required.");
        }
    }

    private String randomPassword() {
        byte[] bytes = new byte[32];
        random.nextBytes(bytes);
        return UUID.nameUUIDFromBytes(bytes).toString() + UUID.randomUUID();
    }

    private void recordMovement(Store store, ProductVariant variant, User actor, String type, int delta,
                                String reference, String note) {
        InventoryMovement movement = new InventoryMovement();
        movement.setStore(store);
        movement.setVariant(variant);
        movement.setPerformedBy(actor);
        movement.setMovementType(type);
        movement.setQuantityChange(delta);
        movement.setReferenceId(reference);
        movement.setNote(note);
        movements.save(movement);
    }

    private InventoryMovementResponse inventoryMovementResponse(InventoryMovement movement) {
        return new InventoryMovementResponse(movement.getId(), movement.getStore().getId(),
                movement.getStore().getName(), movement.getVariant().getSku(),
                movement.getVariant().getProduct().getName(), movement.getMovementType(),
                movement.getQuantityChange(), movement.getReferenceId(), movement.getNote(),
                movement.getPerformedBy() == null ? null : movement.getPerformedBy().getDisplayName(),
                movement.getCreatedAt());
    }

    private ApiException invalid(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_FRANCHISE_REQUEST", message);
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }

}
