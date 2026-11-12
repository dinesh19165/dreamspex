package com.dreamspex.order;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.admin.Store;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.catalog.service.CouponService;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.membership.MembershipRepository;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.security.CurrentUser;import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.mockito.Mockito.*;

class OrderAdminDetailsTest {
    @Test
    void adminOrderUsesHistoricalShippingSnapshotAndCustomerIdentity() {
        Order order = new Order();
        order.setOrderNumber("DS-1");
        order.setFulfillmentType("DELIVERY");
        order.setAddressSnapshot("""
                {"recipientName":"Jane Doe","phone":"+919876543210","line1":"1 Main Street",
                 "line2":"Apartment 2","city":"Hyderabad","state":"Telangana",
                 "postalCode":"500001","countryCode":"IN"}
                """);
        order.setSubtotal(new BigDecimal("1000.00"));
        order.setDiscountAmount(new BigDecimal("100.00"));
        order.setShippingAmount(new BigDecimal("99.00"));
        order.setTotalAmount(new BigDecimal("999.00"));

        User user = new User();
        user.setDisplayName("Jane Customer");
        user.setEmail("jane@example.com");
        user.setPhone("+919999999999");
        order.setUser(user);

        OrderDtos.AdminOrderResponse response = serviceFor(order).adminOrder("order-id");

        assertEquals("DELIVERY", response.fulfillmentType());
        assertNull(response.fulfillmentStoreId());
        assertNull(response.fulfillmentStore());
        assertEquals("Jane Customer", response.customer().displayName());
        assertEquals("jane@example.com", response.customer().email());
        assertEquals("+919999999999", response.customer().phone());
        assertEquals("Jane Doe", response.shippingAddress().recipientName());
        assertEquals("+919876543210", response.shippingAddress().phone());
        assertEquals("1 Main Street", response.shippingAddress().line1());
        assertEquals("Apartment 2", response.shippingAddress().line2());
        assertEquals("500001", response.shippingAddress().postalCode());
        assertEquals("999.00", response.total().toPlainString());
    }

    @Test
    void adminPickupOrderReturnsStoreDetailsAndNoShippingAddress() {
        Order order = new Order();
        order.setOrderNumber("DS-PICKUP");
        order.setFulfillmentType("PICKUP");
        order.setAddressSnapshot(null);
        order.setSubtotal(new BigDecimal("1000.00"));
        order.setDiscountAmount(BigDecimal.ZERO);
        order.setShippingAmount(BigDecimal.ZERO);
        order.setTotalAmount(new BigDecimal("1000.00"));

        User user = new User();
        user.setDisplayName("Jane Customer");
        user.setEmail("jane@example.com");
        user.setPhone("+919999999999");
        order.setUser(user);

        Store store = new Store();
        store.setName("Central Store");
        store.setPhone("+911234567890");
        store.setAddress("1 Main Road");
        store.setCity("Hyderabad");
        store.setState("Telangana");
        store.setPostalCode("500001");
        order.setFulfillmentStore(store);

        OrderDtos.AdminOrderResponse response = serviceFor(order).adminOrder("order-id");

        assertEquals("PICKUP", response.fulfillmentType());
        assertNull(response.shippingAddress());
        assertEquals(store.getId(), response.fulfillmentStoreId());
        assertEquals(store.getId(), response.fulfillmentStore().id());
        assertEquals("Central Store", response.fulfillmentStore().name());
        assertEquals("+911234567890", response.fulfillmentStore().phone());
        assertEquals("1 Main Road", response.fulfillmentStore().address());
        assertEquals("Hyderabad", response.fulfillmentStore().city());
        assertEquals("Telangana", response.fulfillmentStore().state());
        assertEquals("500001", response.fulfillmentStore().postalCode());
    }

    private OrderService serviceFor(Order order) {
        OrderRepository orders = mock(OrderRepository.class);
        when(orders.findById("order-id")).thenReturn(Optional.of(order));
        return new OrderService(mock(CurrentUser.class), mock(AddressRepository.class),
                mock(CartRepository.class), mock(ProductVariantRepository.class), orders,
                mock(CouponRepository.class), mock(com.dreamspex.catalog.service.CouponService.class),
                mock(MembershipRepository.class), new ObjectMapper(), mock(NotificationService.class),
                new com.dreamspex.config.ShippingProperties(null, null), mock(LensOptionRepository.class),
                mock(com.dreamspex.prescription.PrescriptionFileRepository.class),
                mock(com.dreamspex.prescription.PrescriptionStorage.class),
                mock(DeliveryAvailabilityService.class),
                mock(com.dreamspex.gst.GstConfigurationRepository.class),
                mock(com.dreamspex.gst.GstCalculationService.class));
    }
}
