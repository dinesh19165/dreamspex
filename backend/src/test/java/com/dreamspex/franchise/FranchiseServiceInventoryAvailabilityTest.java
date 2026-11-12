package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.entity.Address;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.order.Order;
import com.dreamspex.order.OrderItem;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.order.OrderService;
import com.dreamspex.order.OrderDtos;
import com.dreamspex.returns.ReturnRequest;
import com.dreamspex.returns.ReturnRequestItem;
import com.dreamspex.returns.ReturnRequestRepository;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.shopping.entity.CartItem;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.security.core.Authentication;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.any;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;

@ExtendWith(MockitoExtension.class)
class FranchiseServiceInventoryAvailabilityTest {
    @Mock StoreRepository stores;
    @Mock FranchiseUserRepository franchiseUsers;
    @Mock FranchiseProductAssignmentRepository assignments;
    @Mock FranchiseInventoryRepository inventory;
    @Mock InventoryMovementRepository movements;
    @Mock FranchiseInventoryReservationRepository reservations;
    @Mock ProductRepository products;
    @Mock ProductVariantRepository variants;
    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock OrderRepository orders;
    @Mock CurrentUser currentUser;
    @Mock PasswordEncoder passwordEncoder;
    @Mock AuditLogService audit;
    @Mock ObjectProvider<OrderService> orderService;
    @Mock ReturnRequestRepository returnRequests;
    @Mock FranchiseInvitationService invitationService;

    private FranchiseService service;

    @BeforeEach
    void setUp() {
        service = new FranchiseService(stores, franchiseUsers, assignments, inventory, movements, reservations,
                products, variants, users, roles, orders, currentUser, passwordEncoder, audit, orderService,
                returnRequests, invitationService, new ObjectMapper());
    }

    @Test
    void franchiseCreationRejectsAnEmailAlreadyOwnedByAnAccount() {
        User actor = new User();
        when(currentUser.require(org.mockito.ArgumentMatchers.any())).thenReturn(actor);
        when(stores.findByFranchiseCodeIgnoreCase("DS-NEW")).thenReturn(Optional.empty());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("owner@example.com"))
                .thenReturn(Optional.of(new User()));

        FranchiseDtos.FranchiseRequest request = new FranchiseDtos.FranchiseRequest(
                "DS-NEW", "New Franchise", "Owner Name", "Owner@Example.com", "9876543210",
                "1 Main Street", "Hyderabad", "Telangana", "500001", null, null, null, null, "INACTIVE",
                null, null, null);

        ApiException error = assertThrows(ApiException.class, () -> service.create(
                new UsernamePasswordAuthenticationToken("admin", null), request));

        assertEquals("FRANCHISE_EMAIL_EXISTS", error.code());
    }

    @Test
    void storefrontListingReturnsOnlyPublicStoreDetails() {
        Store store = new Store();
        store.setName("Dream Spex Central");
        store.setOwnerName("Store Contact");
        store.setOwnerEmail("private@example.com");
        store.setPhone("9876543210");
        store.setAddress("1 Main Street");
        store.setCity("Hyderabad");
        store.setState("Telangana");
        store.setPostalCode("500001");
        store.setOpeningHours("Mon-Sat: 09:00 AM - 06:00 PM; Sun: Closed");
        store.setAvailableServices("Eye tests, Frame fitting");
        when(stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(store));

        List<FranchiseDtos.StorefrontFranchiseResponse> result = service.storefrontFranchises();

        assertEquals(1, result.size());
        assertEquals("Store Contact", result.get(0).ownerName());
        assertEquals("9876543210", result.get(0).phone());
        assertEquals("Mon-Sat: 09:00 AM - 06:00 PM; Sun: Closed", result.get(0).openingHours());
        assertEquals(List.of("Eye tests", "Frame fitting"), result.get(0).availableServices());
        verify(stores).findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE");
    }

    @Test
    void adminCanEditLocationAndToggleStatusWithoutChangingHistoricalData() {
        User actor = new User();
        Store store = new Store();
        store.setFranchiseManaged(true);
        store.setFranchiseCode("DS-100");
        store.setName("Original Store");
        store.setOwnerName("Original Owner");
        store.setOwnerEmail("owner@example.com");
        store.setPhone("9876543210");
        store.setAddress("Old address");
        store.setCity("Hyderabad");
        store.setState("Telangana");
        store.setPostalCode("500001");
        store.setLatitude(new java.math.BigDecimal("17.40"));
        store.setLongitude(new java.math.BigDecimal("78.40"));
        store.setDeliveryRadiusKm(new java.math.BigDecimal("50.00"));
        store.setStatus("ACTIVE");
        Order historicalOrder = new Order();
        historicalOrder.setOrderNumber("OLD-ORDER-100");
        historicalOrder.setStatus("DELIVERED");
        historicalOrder.setPaymentStatus("PAID");
        historicalOrder.setTotalAmount(new java.math.BigDecimal("1000.00"));

        when(currentUser.require(any())).thenReturn(actor);
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(stores.findByFranchiseCodeIgnoreCase("DS-100")).thenReturn(Optional.of(store));
        when(franchiseUsers.findByStoreId(store.getId())).thenReturn(List.of());
        when(stores.save(store)).thenReturn(store);
        when(products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED")).thenReturn(List.of());
        when(orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(store.getId())).thenReturn(List.of(historicalOrder));

        var deactivated = service.update(new UsernamePasswordAuthenticationToken("admin", null), store.getId(),
                new FranchiseDtos.FranchiseRequest("DS-100", "Updated Store", "Updated Owner", "new@example.com",
                        "9876543210", "Updated full address", "Warangal", "Telangana", "506001",
                        null, "Optical Studio", null, null, "INACTIVE",
                        new java.math.BigDecimal("17.99"), new java.math.BigDecimal("79.59"),
                        new java.math.BigDecimal("50.00")));

        assertEquals(store.getId(), deactivated.id());
        assertEquals("Updated Store", deactivated.name());
        assertEquals("Updated Owner", deactivated.ownerName());
        assertEquals("new@example.com", deactivated.ownerEmail());
        assertEquals("Warangal", deactivated.city());
        assertEquals("506001", deactivated.postalCode());
        assertEquals("Updated full address", store.getAddress());
        assertEquals("Warangal", store.getCity());
        assertEquals("INACTIVE", store.getStatus());
        assertEquals(1, deactivated.orders());
        assertEquals("OLD-ORDER-100", historicalOrder.getOrderNumber());
        verifyNoInteractions(inventory);
        verifyNoInteractions(assignments);

        var reactivated = service.update(new UsernamePasswordAuthenticationToken("admin", null), store.getId(),
                new FranchiseDtos.FranchiseRequest("DS-100", "Updated Store", "Updated Owner", "new@example.com",
                        "9876543210", "Updated full address", "Warangal", "Telangana", "506001",
                        null, "Optical Studio", null, null, "ACTIVE",
                        new java.math.BigDecimal("17.99"), new java.math.BigDecimal("79.59"),
                        new java.math.BigDecimal("50.00")));
        assertEquals(store.getId(), reactivated.id());
        assertEquals("ACTIVE", store.getStatus());
        assertEquals("OLD-ORDER-100", historicalOrder.getOrderNumber());
        verifyNoInteractions(inventory);
        verifyNoInteractions(assignments);
    }

    @Test
    void inactiveFranchiseCanStillReadItsHistoricalOrders() {
        User franchiseAdmin = new User();
        User customer = new User();
        customer.setDisplayName("Customer");
        customer.setEmail("customer@example.com");
        customer.setPhone("9876543210");
        Store store = new Store();
        store.setFranchiseManaged(true);
        store.setStatus("INACTIVE");
        store.setName("Inactive Store");
        store.setPhone("9876543210");
        store.setAddress("1 Main Street");
        store.setCity("Hyderabad");
        store.setState("Telangana");
        store.setPostalCode("500001");
        FranchiseUser link = new FranchiseUser();
        link.setStore(store);
        link.setUser(franchiseAdmin);
        Order historicalOrder = new Order();
        historicalOrder.setOrderNumber("OLD-ORDER-200");
        historicalOrder.setUser(customer);
        historicalOrder.setFulfillmentStore(store);
        historicalOrder.setStatus("PROCESSING");
        historicalOrder.setPaymentStatus("PAID");
        historicalOrder.setTotalAmount(new java.math.BigDecimal("1000.00"));

        when(currentUser.require(any())).thenReturn(franchiseAdmin);
        when(franchiseUsers.findByUserId(franchiseAdmin.getId())).thenReturn(Optional.of(link));
        when(orders.findByFulfillmentStoreIdOrderByCreatedAtDesc(store.getId())).thenReturn(List.of(historicalOrder));

        List<FranchiseDtos.OrderResponse> result = service.franchiseOrders(
                new UsernamePasswordAuthenticationToken("franchise-admin", null));

        assertEquals(1, result.size());
        assertEquals("OLD-ORDER-200", result.get(0).orderNumber());
    }

    @Test
    void inactiveFranchiseCannotReceiveNewProductAssignments() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        store.setStatus("INACTIVE");
        when(currentUser.require(any())).thenReturn(new User());
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));

        ApiException error = assertThrows(ApiException.class, () -> service.assignProduct(
                new UsernamePasswordAuthenticationToken("admin", null), store.getId(),
                new FranchiseDtos.AssignmentRequest("product-1", 10, 2, "ACTIVE")));

        assertEquals("FRANCHISE_INACTIVE", error.code());
        verifyNoInteractions(assignments);
        verifyNoInteractions(inventory);
    }

    @Test
    void validatesAgainstSelectedFranchiseAvailableStock() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        Product product = new Product();
        ProductVariant variant = variant(product, "variant-1");
        CartItem item = new CartItem();
        item.setVariant(variant);
        item.setQuantity(3);

        FranchiseInventory row = new FranchiseInventory();
        row.setStore(store);
        row.setVariant(variant);
        row.setQuantity(5);
        row.setReservedQuantity(2);
        row.setAvailabilityStatus("ACTIVE");
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(inventory.findByStoreIdAndVariantId(store.getId(), "variant-1")).thenReturn(Optional.of(row));

        assertDoesNotThrow(() -> service.validateCartAvailability(store, List.of(item)));
    }

    @Test
    void franchiseAdminCanShipOnlyAssignedHomeDeliveryOrders() {
        Store store = franchiseStore();
        Order order = order("HOME_DELIVERY", "PROCESSING", store);
        Authentication authentication = franchiseAuthentication();
        OrderService delegatedOrderService = org.mockito.Mockito.mock(OrderService.class);
        when(orderService.getObject()).thenReturn(delegatedOrderService);
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));
        doAnswer(invocation -> {
            OrderDtos.StatusRequest request = invocation.getArgument(2);
            order.setStatus(request.status());
            return null;
        }).when(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());

        FranchiseDtos.OrderResponse response = service.updateOrderStatus(authentication, order.getId(),
                new FranchiseDtos.OrderStatusRequest("SHIPPED", null));

        assertEquals("SHIPPED", response.status());
        assertEquals("HOME_DELIVERY", response.fulfillmentType());
        verify(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());
    }

    @Test
    void franchiseAdminCanPreparePickupButCannotShipOrSkipPickupReady() {
        Store store = franchiseStore();
        Order order = order("STORE_PICKUP", "PROCESSING", store);
        Authentication authentication = franchiseAuthentication();
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));

        ApiException cannotShip = assertThrows(ApiException.class, () -> service.updateOrderStatus(authentication,
                order.getId(), new FranchiseDtos.OrderStatusRequest("SHIPPED", null)));
        assertEquals("INVALID_FRANCHISE_REQUEST", cannotShip.code());
        ApiException cannotSkipReady = assertThrows(ApiException.class, () -> service.updateOrderStatus(authentication,
                order.getId(), new FranchiseDtos.OrderStatusRequest("PICKED_UP", null)));
        assertEquals("INVALID_FRANCHISE_REQUEST", cannotSkipReady.code());
        verify(orderService, never()).getObject();
    }

    @Test
    void franchiseAdminCanMarkStorePickupReady() {
        Store store = franchiseStore();
        Order order = order("STORE_PICKUP", "PROCESSING", store);
        Authentication authentication = franchiseAuthentication();
        OrderService delegatedOrderService = org.mockito.Mockito.mock(OrderService.class);
        when(orderService.getObject()).thenReturn(delegatedOrderService);
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));
        doAnswer(invocation -> {
            OrderDtos.StatusRequest request = invocation.getArgument(2);
            order.setStatus(request.status());
            return null;
        }).when(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());

        FranchiseDtos.OrderResponse response = service.updateOrderStatus(authentication, order.getId(),
                new FranchiseDtos.OrderStatusRequest("READY_FOR_PICKUP", null));

        assertEquals("READY_FOR_PICKUP", response.status());
        assertEquals("STORE_PICKUP", response.fulfillmentType());
        verify(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());
    }

    @Test
    void franchiseAdminCanConfirmPickupOnlyAfterReadyForPickup() {
        Store store = franchiseStore();
        Order order = order("STORE_PICKUP", "READY_FOR_PICKUP", store);
        Authentication authentication = franchiseAuthentication();
        OrderService delegatedOrderService = org.mockito.Mockito.mock(OrderService.class);
        when(orderService.getObject()).thenReturn(delegatedOrderService);
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));
        doAnswer(invocation -> {
            OrderDtos.StatusRequest request = invocation.getArgument(2);
            order.setStatus(request.status());
            return null;
        }).when(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());

        FranchiseDtos.OrderResponse response = service.updateOrderStatus(authentication, order.getId(),
                new FranchiseDtos.OrderStatusRequest("PICKED_UP", "Customer collection confirmed."));

        assertEquals("PICKED_UP", response.status());
        assertEquals("STORE_PICKUP", response.fulfillmentType());
        verify(delegatedOrderService).adminStatus(eq(authentication), eq(order.getId()), any());
    }

    @Test
    void franchiseAdminCannotChangeAnOrderAssignedToAnotherFranchise() {
        Store ownStore = franchiseStore();
        Store otherStore = new Store();
        otherStore.setFranchiseManaged(true);
        Order order = order("DELIVERY", "PROCESSING", otherStore);
        Authentication authentication = franchiseAuthentication();
        when(orders.findById(order.getId())).thenReturn(Optional.of(order));

        ApiException error = assertThrows(ApiException.class, () -> service.updateOrderStatus(authentication,
                order.getId(), new FranchiseDtos.OrderStatusRequest("SHIPPED", null)));

        assertEquals("ORDER_NOT_FOUND", error.code());
        verify(orderService, never()).getObject();
    }

    private Store franchiseStore() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        store.setStatus("ACTIVE");
        User actor = new User();
        FranchiseUser franchiseUser = new FranchiseUser();
        franchiseUser.setUser(actor);
        franchiseUser.setStore(store);
        when(currentUser.require(any(Authentication.class))).thenReturn(actor);
        when(franchiseUsers.findByUserId(actor.getId())).thenReturn(Optional.of(franchiseUser));
        return store;
    }

    private Authentication franchiseAuthentication() {
        return new UsernamePasswordAuthenticationToken("franchise-admin", null);
    }

    private Order order(String fulfillmentType, String status, Store store) {
        Order order = new Order();
        order.setFulfillmentType(fulfillmentType);
        order.setStatus(status);
        order.setPaymentStatus("PAID");
        order.setFulfillmentStore(store);
        order.setUser(new User());
        order.setTotalAmount(java.math.BigDecimal.ZERO);
        return order;
    }

    @Test
    void rejectsUnavailableFranchiseStockEvenWhenOtherStockMayExist() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        ProductVariant variant = variant(new Product(), "variant-1");
        CartItem item = new CartItem();
        item.setVariant(variant);
        item.setQuantity(1);
        when(stores.findById(store.getId())).thenReturn(Optional.of(store));
        when(inventory.findByStoreIdAndVariantId(store.getId(), "variant-1")).thenReturn(Optional.empty());

        ApiException error = assertThrows(ApiException.class,
                () -> service.validateCartAvailability(store, List.of(item)));

        assertEquals("FRANCHISE_STOCK_UNAVAILABLE", error.code());
    }

    @Test
    void leavesLegacyStoreInventoryValidationUnchanged() {
        Store store = new Store();
        store.setFranchiseManaged(false);

        assertDoesNotThrow(() -> service.validateCartAvailability(store, List.of()));
    }

    @Test
    void franchiseAdminsCannotReadAnotherFranchisesOrder() {
        Authentication authentication = org.mockito.Mockito.mock(Authentication.class);
        User user = new User();
        when(currentUser.require(authentication)).thenReturn(user);
        Store authorizedStore = new Store();
        authorizedStore.setFranchiseManaged(true);
        FranchiseUser link = new FranchiseUser();
        link.setStore(authorizedStore);
        link.setUser(user);
        when(franchiseUsers.findByUserId(user.getId())).thenReturn(Optional.of(link));
        Store otherStore = new Store();
        otherStore.setFranchiseManaged(true);
        Order otherOrder = new Order();
        otherOrder.setFulfillmentStore(otherStore);
        when(orders.findById("other-order")).thenReturn(Optional.of(otherOrder));

        ApiException error = assertThrows(ApiException.class,
                () -> service.franchiseOrder(authentication, "other-order"));

        assertEquals("ORDER_NOT_FOUND", error.code());
    }

    @Test
    void concurrentCheckoutsCannotReserveTheSameLastUnit() throws Exception {
        Store store = new Store();
        store.setFranchiseManaged(true);
        ProductVariant variant = variant(new Product(), "variant-race");
        FranchiseInventory row = new FranchiseInventory();
        row.setStore(store);
        row.setVariant(variant);
        row.setQuantity(1);
        row.setAvailabilityStatus("ACTIVE");
        when(inventory.findForUpdate(store.getId(), variant.getId())).thenReturn(Optional.of(row));
        when(reservations.findByOrderIdAndInventoryId(org.mockito.ArgumentMatchers.anyString(),
                org.mockito.ArgumentMatchers.eq(row.getId()))).thenReturn(Optional.empty());
        when(reservations.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(inventory.save(row)).thenReturn(row);
        when(movements.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        CountDownLatch start = new CountDownLatch(1);
        AtomicInteger reserved = new AtomicInteger();
        AtomicInteger rejected = new AtomicInteger();
        Runnable checkout = () -> {
            try {
                start.await();
                synchronized (row) {
                    service.reserveOrder(order(store, variant));
                }
                reserved.incrementAndGet();
            } catch (ApiException exception) {
                rejected.incrementAndGet();
            } catch (InterruptedException exception) {
                Thread.currentThread().interrupt();
                throw new AssertionError(exception);
            }
        };
        Thread first = new Thread(checkout);
        Thread second = new Thread(checkout);
        first.start();
        second.start();
        start.countDown();
        first.join();
        second.join();

        assertEquals(1, reserved.get());
        assertEquals(1, rejected.get());
        assertEquals(1, row.getReservedQuantity());
    }

    @Test
    void paymentFailureAndCancellationReleaseOrRestoreOnlyTheirReservation() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        ProductVariant variant = variant(new Product(), "variant-release");
        FranchiseInventory row = new FranchiseInventory();
        row.setStore(store);
        row.setVariant(variant);
        row.setQuantity(4);
        row.setReservedQuantity(1);
        FranchiseInventoryReservation reservation = reservation(order(store, variant), row, 1, "RESERVED");
        when(reservations.findByOrderId(reservation.getOrder().getId())).thenReturn(List.of(reservation));
        when(inventory.findById(row.getId())).thenReturn(Optional.of(row));
        when(inventory.save(row)).thenReturn(row);
        when(reservations.save(reservation)).thenReturn(reservation);
        when(movements.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.releaseOrder(reservation.getOrder(), false);
        assertEquals(0, row.getReservedQuantity());
        assertEquals(4, row.getQuantity());
        assertEquals("RELEASED", reservation.getStatus());

        row.setQuantity(3);
        reservation.setStatus("SOLD");
        when(reservations.findByOrderId(reservation.getOrder().getId())).thenReturn(List.of(reservation));
        service.releaseOrder(reservation.getOrder(), true);
        service.releaseOrder(reservation.getOrder(), true);

        assertEquals(4, row.getQuantity());
        assertEquals("RESTORED", reservation.getStatus());
    }

    @Test
    void approvedReturnRestocksFranchiseInventoryExactlyOnce() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        ProductVariant variant = variant(new Product(), "variant-return");
        FranchiseInventory row = new FranchiseInventory();
        row.setStore(store);
        row.setVariant(variant);
        row.setQuantity(0);
        OrderItem orderItem = new OrderItem();
        orderItem.setVariant(variant);
        ReturnRequest request = new ReturnRequest();
        Order order = new Order();
        order.setFulfillmentStore(store);
        request.setOrder(order);
        ReturnRequestItem returnedItem = new ReturnRequestItem();
        returnedItem.setOrderItem(orderItem);
        returnedItem.setQuantity(1);
        request.getItems().add(returnedItem);
        when(inventory.findForUpdate(store.getId(), variant.getId())).thenReturn(Optional.of(row));
        when(inventory.save(row)).thenReturn(row);
        when(movements.existsByReferenceIdAndMovementType(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.eq("RETURN")))
                .thenReturn(false, true);
        when(movements.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        service.restockReturnItems(request, null);
        service.restockReturnItems(request, null);

        assertEquals(1, row.getQuantity());
    }

    @Test
    void publishedCatalogProductsAreVisibleWithoutAssignmentsAndGetIndependentZeroStockRows() {
        Store first = new Store();
        first.setFranchiseManaged(true);
        Store second = new Store();
        second.setFranchiseManaged(true);
        Product product = new Product();
        product.setStatus("PUBLISHED");
        ProductVariant variant = variant(product, "central-variant");
        when(stores.findById(first.getId())).thenReturn(Optional.of(first));
        when(stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE"))
                .thenReturn(List.of(first, second));
        when(products.findByStatusAndDeletedAtIsNullOrderByCreatedAtDesc("PUBLISHED"))
                .thenReturn(List.of(product));
        when(variants.findByProductIdAndStatusOrderBySku(product.getId(), "ACTIVE"))
                .thenReturn(List.of(variant));
        when(inventory.findByStoreIdAndVariantId(first.getId(), variant.getId())).thenReturn(Optional.empty());
        when(inventory.findByStoreIdAndVariantId(second.getId(), variant.getId())).thenReturn(Optional.empty());
        when(inventory.save(any(FranchiseInventory.class))).thenAnswer(invocation -> invocation.getArgument(0));

        assertEquals(List.of(product.getId()), service.storefrontProductIds(first.getId()));
        service.syncPublishedProductInventory(product);

        org.mockito.ArgumentCaptor<FranchiseInventory> saved =
                org.mockito.ArgumentCaptor.forClass(FranchiseInventory.class);
        verify(inventory, org.mockito.Mockito.times(2)).save(saved.capture());
        assertTrue(saved.getAllValues().stream().allMatch(row -> row.getQuantity() == 0));
        assertTrue(saved.getAllValues().stream().map(row -> row.getStore().getId()).distinct().count() == 2);
        verify(assignments, never()).findByStoreIdAndProductId(anyString(), anyString());
    }

    @Test
    void pickupValidatesAllItemsAtTheCustomerSelectedFranchise() {
        Store store = new Store();
        store.setFranchiseManaged(true);
        Product product = new Product();
        product.setStatus("PUBLISHED");
        ProductVariant variant = variant(product, "pickup-variant");
        CartItem item = new CartItem();
        item.setVariant(variant);
        item.setQuantity(2);
        FranchiseInventory row = new FranchiseInventory();
        row.setStore(store);
        row.setVariant(variant);
        row.setQuantity(3);
        row.setAvailabilityStatus("ACTIVE");
        when(stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE")).thenReturn(List.of(store));
        when(inventory.findByStoreIdAndVariantId(store.getId(), variant.getId())).thenReturn(Optional.of(row));

        FranchiseService.StoreSelection selection =
                service.selectFulfillmentStore(null, List.of(item), "PICKUP", store.getId(), false);

        assertTrue(selection.available());
        assertEquals(store, selection.store());
        assertEquals("AVAILABLE", selection.status());
    }

    @Test
    void deliveryChoosesNearestServiceableFranchiseThatCanFulfillTheWholeCart() {
        Store nearest = new Store();
        nearest.setFranchiseManaged(true);
        nearest.setLatitude(new java.math.BigDecimal("17.3850"));
        nearest.setLongitude(new java.math.BigDecimal("78.4867"));
        nearest.setDeliveryRadiusKm(new java.math.BigDecimal("20.00"));
        Store farther = new Store();
        farther.setFranchiseManaged(true);
        farther.setLatitude(new java.math.BigDecimal("17.4000"));
        farther.setLongitude(new java.math.BigDecimal("78.5000"));
        farther.setDeliveryRadiusKm(new java.math.BigDecimal("20.00"));
        Product product = new Product();
        product.setStatus("PUBLISHED");
        ProductVariant variant = variant(product, "delivery-variant");
        CartItem item = new CartItem();
        item.setVariant(variant);
        item.setQuantity(1);
        FranchiseInventory empty = new FranchiseInventory();
        empty.setStore(nearest);
        empty.setVariant(variant);
        empty.setQuantity(0);
        empty.setAvailabilityStatus("ACTIVE");
        FranchiseInventory stocked = new FranchiseInventory();
        stocked.setStore(farther);
        stocked.setVariant(variant);
        stocked.setQuantity(1);
        stocked.setAvailabilityStatus("ACTIVE");
        Address address = new Address();
        address.setLatitude(new java.math.BigDecimal("17.3850"));
        address.setLongitude(new java.math.BigDecimal("78.4867"));
        when(stores.findByFranchiseManagedTrueAndStatusOrderByNameAsc("ACTIVE"))
                .thenReturn(List.of(farther, nearest));
        when(inventory.findByStoreIdAndVariantId(nearest.getId(), variant.getId())).thenReturn(Optional.of(empty));
        when(inventory.findByStoreIdAndVariantId(farther.getId(), variant.getId())).thenReturn(Optional.of(stocked));

        FranchiseService.StoreSelection selection =
                service.selectFulfillmentStore(address, List.of(item), "DELIVERY", null, false);

        assertTrue(selection.available());
        assertEquals(farther, selection.store());
    }

    @Test
    void franchiseAdminCannotChangeAnotherFranchisesStock() {
        Authentication authentication = org.mockito.Mockito.mock(Authentication.class);
        User user = new User();
        when(currentUser.require(authentication)).thenReturn(user);
        Store ownStore = new Store();
        ownStore.setFranchiseManaged(true);
        FranchiseUser link = new FranchiseUser();
        link.setStore(ownStore);
        link.setUser(user);
        when(franchiseUsers.findByUserId(user.getId())).thenReturn(Optional.of(link));
        Store otherStore = new Store();
        otherStore.setFranchiseManaged(true);
        ProductVariant variant = variant(new Product(), "other-variant");
        FranchiseInventory otherStock = new FranchiseInventory();
        otherStock.setStore(otherStore);
        otherStock.setVariant(variant);
        otherStock.setQuantity(5);
        when(inventory.findById(otherStock.getId())).thenReturn(Optional.of(otherStock));

        ApiException error = assertThrows(ApiException.class, () -> service.adjustOwnInventory(authentication,
                otherStock.getId(), new FranchiseDtos.InventoryAdjustmentRequest(0, 0, "unauthorized")));

        assertEquals("INVENTORY_NOT_FOUND", error.code());
        assertEquals(5, otherStock.getQuantity());
        verify(inventory, never()).save(otherStock);
    }

    private ProductVariant variant(Product product, String id) {
        ProductVariant variant = org.mockito.Mockito.mock(ProductVariant.class);
        product.setStatus("PUBLISHED");
        org.mockito.Mockito.lenient().when(variant.getId()).thenReturn(id);
        org.mockito.Mockito.lenient().when(variant.getProduct()).thenReturn(product);
        org.mockito.Mockito.lenient().when(variant.getStatus()).thenReturn("ACTIVE");
        return variant;
    }

    private FranchiseProductAssignment assignment(Store store, Product product) {
        FranchiseProductAssignment assignment = new FranchiseProductAssignment();
        assignment.setStore(store);
        assignment.setProduct(product);
        assignment.setAvailabilityStatus("ACTIVE");
        return assignment;
    }

    private Order order(Store store, ProductVariant variant) {
        Order order = new Order();
        order.setFulfillmentStore(store);
        OrderItem item = new OrderItem();
        item.setOrder(order);
        item.setVariant(variant);
        item.setQuantity(1);
        order.getItems().add(item);
        return order;
    }

    private FranchiseInventoryReservation reservation(Order order, FranchiseInventory row,
                                                        int quantity, String status) {
        FranchiseInventoryReservation reservation = new FranchiseInventoryReservation();
        reservation.setOrder(order);
        reservation.setInventory(row);
        reservation.setQuantity(quantity);
        reservation.setStatus(status);
        return reservation;
    }
}
