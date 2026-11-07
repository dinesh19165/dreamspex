package com.dreamspex.catalog;


import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Coupon;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.service.CouponService;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartRepository;
import static com.dreamspex.catalog.dto.CatalogDtos.OfferRequest;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.membership.MembershipRepository;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.security.CurrentUser;import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CouponServiceOfferTest {
    @Mock CouponRepository coupons;
    @Mock CurrentUser currentUser;
    @Mock CartRepository carts;
    @Mock OrderRepository orders;
    @Mock MembershipRepository memberships;
    @Mock ProductRepository products;
    @Mock CategoryRepository categories;
    @Mock AuditLogService audit;

    private final User user = new User();
    private CouponService service;

    @BeforeEach
    void setUp() {
        service = new CouponService(coupons, currentUser, carts, orders, memberships, products, categories,
                new ObjectMapper(), audit);
    }

    @Test
    void adminCanCreateAndPublishAnOfferUsingTheCouponRecord() {
        when(currentUser.require(any())).thenReturn(user);
        when(coupons.save(any(Coupon.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(coupons.countByCodeIgnoreCaseAndIdNot("SAVE20", "")).thenReturn(0L);
        when(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull("offer-todays-offers", "OFFER", "ACTIVE"))
                .thenReturn(Optional.of(offerCategory()));

        var saved = service.saveOffer(authentication(), null, request(
                " SAVE20 ", "PUBLISHED", true, null, null));

        assertEquals("SAVE20", saved.couponCode());
        assertEquals("PUBLISHED", saved.publicationStatus());
        assertTrue(saved.active());
        verify(audit).record(user, "OFFER_CREATED", "COUPON", saved.id());
    }

    @Test
    void adminCanEditAnOfferAndUnpublishIt() {
        when(currentUser.require(any())).thenReturn(user);
        when(coupons.save(any(Coupon.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull("offer-todays-offers", "OFFER", "ACTIVE"))
                .thenReturn(Optional.of(offerCategory()));
        Coupon existing = coupon("SAVE20", Instant.now().minusSeconds(60), null);
        existing.setPublished(true);
        when(coupons.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(coupons.countByCodeIgnoreCaseAndIdNot("SAVE20", existing.getId())).thenReturn(0L);

        var saved = service.saveOffer(authentication(), existing.getId(), request(
                "SAVE20", "DRAFT", false, null, null));

        assertFalse(saved.active());
        assertEquals("DRAFT", saved.publicationStatus());
        verify(audit).record(user, "OFFER_UPDATED", "COUPON", existing.getId());
    }

    @Test
    void publicOffersExcludeExpiredAndUnpublishedRecords() {
        Coupon current = coupon("NOW", Instant.now().minusSeconds(60), null);
        Coupon expired = coupon("OLD", Instant.now().minusSeconds(3600), Instant.now().minusSeconds(60));
        Coupon draft = coupon("DRAFT", Instant.now().minusSeconds(60), null);
        draft.setPublished(false);
        when(coupons.findByStatus("ACTIVE")).thenReturn(List.of(expired, draft, current));
        when(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull("offer-todays-offers", "OFFER", "ACTIVE"))
                .thenReturn(Optional.of(offerCategory()));

        var visible = service.offers();

        assertEquals(List.of(current.getId()), visible.stream().map(offer -> offer.id()).toList());
    }

    @Test
    void productOfferLinksUseTheProductRouteIdentifier() {
        Coupon offer = coupon("FRAME20", Instant.now().minusSeconds(60), null);
        Product product = new Product();
        product.setSlug("premium-frame");
        offer.setApplicableProductIds("[\"" + product.getId() + "\"]");
        when(coupons.findByStatus("ACTIVE")).thenReturn(List.of(offer));
        when(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull("offer-todays-offers", "OFFER", "ACTIVE"))
                .thenReturn(Optional.of(offerCategory()));
        when(products.findById(product.getId())).thenReturn(Optional.of(product));

        var visible = service.offers();

        assertEquals("/product/" + product.getId(), visible.get(0).linkUrl());
    }

    @Test
    void couponDiscountIsCalculatedOnTheBackendAndUsageLimitIsEnforced() {
        Coupon coupon = coupon("SAVE20", Instant.now().minusSeconds(60), null);
        coupon.setDiscountType("PERCENT");
        coupon.setDiscountValue(new BigDecimal("20.00"));
        coupon.setMaxDiscount(new BigDecimal("100.00"));
        when(categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull("offer-todays-offers", "OFFER", "ACTIVE"))
                .thenReturn(Optional.of(offerCategory()));
        Cart cart = new Cart();
        Product product = new Product();
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        CartItem item = new CartItem();
        item.setVariant(variant);
        item.setQuantity(1);
        item.setUnitPriceSnapshot(new BigDecimal("1000.00"));
        cart.getItems().add(item);

        assertEquals(new BigDecimal("100.00"), service.discountForCart(coupon, user, cart));

        coupon.setUsageLimit(1);
        when(orders.countByCouponCodeIgnoreCase("SAVE20")).thenReturn(1L);
        var exception = assertThrows(com.dreamspex.common.ApiException.class,
                () -> service.discountForCart(coupon, user, cart));
        assertEquals("INVALID_COUPON", exception.code());
    }

    private OfferRequest request(String code, String publication, boolean active,
                                 Instant startsAt, Instant endsAt) {
        return new OfferRequest(code, "Save on eyewear", null, "A limited time saving", "/offers/save.jpg",
                "offer-todays-offers", "PERCENT", new BigDecimal("20.00"), null, new BigDecimal("100.00"),
                startsAt == null ? Instant.now().minusSeconds(60) : startsAt, endsAt, 20, 1, "ALL",
                1, active, publication, List.of(), List.of());
    }

    private Coupon coupon(String code, Instant startsAt, Instant endsAt) {
        Coupon coupon = new Coupon();
        coupon.setCode(code);
        coupon.setTitle(code);
        coupon.setDescription("Offer description");
        coupon.setImageUrl("/offers/" + code.toLowerCase() + ".jpg");
        coupon.setOfferCategory("offer-todays-offers");
        coupon.setDiscountType("PERCENT");
        coupon.setDiscountValue(new BigDecimal("10.00"));
        coupon.setStartsAt(startsAt);
        coupon.setEndsAt(endsAt);
        coupon.setStatus("ACTIVE");
        coupon.setPublished(true);
        coupon.setCustomerEligibility("ALL");
        return coupon;
    }

    private UsernamePasswordAuthenticationToken authentication() {
        return new UsernamePasswordAuthenticationToken("admin", "credentials");
    }

    private Category offerCategory() {
        Category category = new Category();
        category.setName("Today's Offers");
        category.setSlug("offer-todays-offers");
        category.setStatus("ACTIVE");
        category.setCategoryType("OFFER");
        return category;
    }
}
