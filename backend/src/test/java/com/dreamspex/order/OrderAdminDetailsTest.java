package com.dreamspex.order;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
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
import static org.mockito.Mockito.*;

class OrderAdminDetailsTest {
    @Test
    void adminOrderUsesHistoricalShippingSnapshotAndCustomerIdentity() {
        Order order = new Order();
        order.setOrderNumber("DS-1");
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

        OrderRepository orders = mock(OrderRepository.class);
        when(orders.findById("order-id")).thenReturn(Optional.of(order));
        OrderService service = new OrderService(mock(CurrentUser.class), mock(AddressRepository.class),
                mock(CartRepository.class), mock(ProductVariantRepository.class), orders,
                mock(CouponRepository.class), mock(com.dreamspex.catalog.service.CouponService.class),
                mock(MembershipRepository.class), new ObjectMapper(), mock(NotificationService.class),
                new com.dreamspex.config.ShippingProperties(null, null), mock(LensOptionRepository.class),
                mock(com.dreamspex.prescription.PrescriptionFileRepository.class),
                mock(com.dreamspex.prescription.PrescriptionStorage.class),
                mock(DeliveryAvailabilityService.class));

        OrderDtos.AdminOrderResponse response = service.adminOrder("order-id");

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
}
