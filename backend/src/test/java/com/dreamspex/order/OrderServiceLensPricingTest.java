package com.dreamspex.order;

import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.catalog.entity.Coupon;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.catalog.service.CouponService;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.ShippingProperties;
import com.dreamspex.membership.Membership;
import com.dreamspex.membership.MembershipPlan;
import com.dreamspex.membership.MembershipRepository;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.prescription.LensOption;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.prescription.Prescription;
import com.dreamspex.security.CurrentUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.dreamspex.gst.GstCalculationService;
import com.dreamspex.gst.GstConfiguration;
import com.dreamspex.gst.GstConfigurationRepository;
import com.dreamspex.gst.GstPriceTreatment;
import com.dreamspex.admin.Store;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.util.Optional;

import static com.dreamspex.order.OrderDtos.CheckoutRequest;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class OrderServiceLensPricingTest {
    @Mock CurrentUser current;
    @Mock AddressRepository addresses;
    @Mock CartRepository carts;
    @Mock ProductVariantRepository variants;
    @Mock OrderRepository orders;
    @Mock CouponRepository coupons;
    @Mock CouponService couponService;
    @Mock MembershipRepository memberships;
    @Mock NotificationService notifications;
    @Mock LensOptionRepository lensOptions;
    @Mock DeliveryAvailabilityService deliveryAvailability;
    @Mock GstConfigurationRepository gstConfigurations;

    private User user;
    private Product product;
    private Cart cart;
    private ProductVariant variant;
    private CartItem item;
    private LensOption option;
    private OrderService service;

    @BeforeEach
    void setUp() {
        user = new User();
        product = new Product();
        product.setStatus("PUBLISHED");
        variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(10);
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(product);
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION");
        cart = new Cart();
        cart.setUser(user);
        item = new CartItem();
        item.setCart(cart);
        item.setVariant(variant);
        item.setPrescription(prescription);
        item.setSelectedLensCodes("SINGLE_VISION");
        item.setLensAdditionalPrice(new BigDecimal("100.00"));
        item.setUnitPriceSnapshot(new BigDecimal("1100.00"));
        item.setQuantity(1);
        cart.getItems().add(item);
        option = new LensOption();
        option.setCode("SINGLE_VISION");
        option.setCategory("TYPE");
        option.setAvailable(true);
        option.setAdditionalCost(new BigDecimal("100.00"));

        when(current.require(any())).thenReturn(user);
        Address address = new Address();
        address.setState("Telangana");
        when(addresses.findByIdAndUserIdAndDeletedAtIsNull("address", user.getId()))
                .thenReturn(Optional.of(address));
        when(carts.findByUserIdAndStatus(user.getId(), "ACTIVE")).thenReturn(Optional.of(cart));
        when(variants.findByIdAndStatus(variant.getId(), "ACTIVE")).thenReturn(Optional.of(variant));
        when(lensOptions.findByCode("SINGLE_VISION")).thenReturn(Optional.of(option));
        lenient().when(deliveryAvailability.evaluate(any())).thenReturn(new DeliveryAvailabilityService.Evaluation(
                false, "LOCATION_REQUIRED", null, null, null,
                "Select a valid delivery location on the map to check availability."));
        service = new OrderService(current, addresses, carts, variants, orders, coupons,
                couponService, memberships, new ObjectMapper(),
                notifications, new ShippingProperties(new BigDecimal("2000.00"), new BigDecimal("99.00")), lensOptions,
                org.mockito.Mockito.mock(com.dreamspex.prescription.PrescriptionFileRepository.class),
                org.mockito.Mockito.mock(com.dreamspex.prescription.PrescriptionStorage.class), deliveryAvailability,
                gstConfigurations, new GstCalculationService());
    }

    @Test
    void quoteCalculatesInclusiveIntrastateGstWithoutIncreasingPayableTotal() {
        Store store = store("Telangana");
        availableDelivery(store);
        when(gstConfigurations.findFirstByActiveTrueOrderByUpdatedAtDesc())
                .thenReturn(Optional.of(configuration()));
        product.setName("Frame");
        product.setHsnCode("900311");
        product.setGstRate(new BigDecimal("18.00"));

        var quote = service.quote(auth(), new CheckoutRequest("address", null));

        assertEquals(new BigDecimal("932.20"), quote.gstSnapshot().taxableAmount());
        assertEquals(new BigDecimal("167.80"), quote.gstSnapshot().gstAmount());
        assertEquals(new BigDecimal("83.90"), quote.gstSnapshot().cgstAmount());
        assertEquals(new BigDecimal("83.90"), quote.gstSnapshot().sgstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), quote.gstSnapshot().igstAmount());
        assertEquals(new BigDecimal("1199.00"), quote.gstSnapshot().finalAmount());
        assertEquals(quote.total(), quote.gstSnapshot().finalAmount());
    }

    @Test
    void quoteUsesProductRateAndInterstateIgst() {
        Store store = store("Telangana");
        availableDelivery(store);
        when(gstConfigurations.findFirstByActiveTrueOrderByUpdatedAtDesc())
                .thenReturn(Optional.of(configuration()));
        product.setName("Frame");
        product.setHsnCode("900311");
        product.setGstRate(new BigDecimal("12.00"));
        addresses.findByIdAndUserIdAndDeletedAtIsNull("address", user.getId()).orElseThrow().setState("Karnataka");

        var quote = service.quote(auth(), new CheckoutRequest("address", null));

        assertEquals(new BigDecimal("117.86"), quote.gstSnapshot().gstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), quote.gstSnapshot().cgstAmount());
        assertEquals(BigDecimal.ZERO.setScale(2), quote.gstSnapshot().sgstAmount());
        assertEquals(new BigDecimal("117.86"), quote.gstSnapshot().igstAmount());
        assertEquals(new BigDecimal("1199.00"), quote.total());
    }

    @Test
    void createdOrderPersistsGstSnapshotAndKeepsInclusivePayableAmount() {
        Store store = store("Telangana");
        availableDelivery(store);
        when(gstConfigurations.findFirstByActiveTrueOrderByUpdatedAtDesc())
                .thenReturn(Optional.of(configuration()));
        when(orders.findByUserIdAndIdempotencyKey(user.getId(), "gst-order")).thenReturn(Optional.empty());
        when(variants.findWithLockByIdAndStatus(variant.getId(), "ACTIVE")).thenReturn(Optional.of(variant));
        when(orders.save(any(Order.class))).thenAnswer(invocation -> invocation.getArgument(0));
        product.setName("Frame");
        product.setHsnCode("900311");
        product.setGstRate(new BigDecimal("18.00"));

        var order = service.create(auth(), new CheckoutRequest("address", null), "gst-order");

        assertEquals(new BigDecimal("1199.00"), order.total());
        assertEquals(new BigDecimal("167.80"), order.gstSnapshot().gstAmount());
        assertEquals(order.total(), order.gstSnapshot().finalAmount());
        verify(orders).save(org.mockito.ArgumentMatchers.<Order>argThat(saved -> saved.getGstSnapshot() != null
                && saved.getGstSnapshot().contains("\"hsnCode\":\"900311\"")));
    }

    private org.springframework.security.core.Authentication auth() {
        return new UsernamePasswordAuthenticationToken("customer", null);
    }

    private Store store(String state) {
        Store store = new Store();
        store.setState(state);
        return store;
    }

    private void availableDelivery(Store store) {
        when(deliveryAvailability.evaluate(any())).thenReturn(new DeliveryAvailabilityService.Evaluation(
                true, "AVAILABLE", store, BigDecimal.ONE, BigDecimal.TEN, "Delivery available."));
    }

    private GstConfiguration configuration() {
        return new GstConfiguration(new BigDecimal("18.00"), GstPriceTreatment.INCLUSIVE, true, null);
    }

    @Test
    void checkoutQuoteIncludesConfiguredLensPrice() {
        var quote = service.quote(new UsernamePasswordAuthenticationToken("customer", null),
                new CheckoutRequest("address", null));

        assertEquals(new BigDecimal("1100.00"), quote.subtotal());
        assertEquals(new BigDecimal("1199.00"), quote.total());
    }

    @Test
    void checkoutRejectsLensPriceChangedSinceCartWasConfigured() {
        option.setAdditionalCost(new BigDecimal("150.00"));

        ApiException error = assertThrows(ApiException.class, () -> service.quote(
                new UsernamePasswordAuthenticationToken("customer", null), new CheckoutRequest("address", null)));

        assertEquals("LENS_PRICE_CHANGED", error.code());
    }

    @Test
    void activeMembershipDiscountIsAppliedFromConfiguredPlan() {
        MembershipPlan plan = new MembershipPlan();
        plan.setDiscountPercentage(new BigDecimal("10.00"));
        Membership membership = new Membership();
        membership.setPlan(plan);
        membership.setStartsAt(java.time.Instant.now().minusSeconds(60));
        membership.setExpiresAt(java.time.Instant.now().plusSeconds(86400));
        when(memberships.findFirstByUserIdAndStatusOrderByExpiresAtDesc(user.getId(), "ACTIVE"))
                .thenReturn(Optional.of(membership));

        var quote = service.quote(new UsernamePasswordAuthenticationToken("customer", null),
                new CheckoutRequest("address", null));

        assertEquals(new BigDecimal("110.00"), quote.membershipDiscount());
        assertEquals(new BigDecimal("110.00"), quote.discount());
        assertEquals(BigDecimal.ZERO, quote.couponDiscount());
    }

    @Test
    void couponAndMembershipDiscountAreNotCombined() {
        when(coupons.findByCodeIgnoreCaseAndStatus("SAVE", "ACTIVE"))
                .thenReturn(Optional.of(org.mockito.Mockito.mock(com.dreamspex.catalog.entity.Coupon.class)));
        when(couponService.discountForCart(any(), any(), any())).thenReturn(new BigDecimal("50.00"));

        var quote = service.quote(new UsernamePasswordAuthenticationToken("customer", null),
                new CheckoutRequest("address", "SAVE"));

        assertEquals(new BigDecimal("50.00"), quote.couponDiscount());
        assertEquals(BigDecimal.ZERO, quote.membershipDiscount());
        assertEquals(new BigDecimal("50.00"), quote.discount());
        org.mockito.Mockito.verifyNoInteractions(memberships);
    }
}
