package com.dreamspex.catalog.service;


import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Category;
import com.dreamspex.catalog.entity.Coupon;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.common.ApiException;
import com.dreamspex.membership.MembershipRepository;
import com.dreamspex.order.OrderRepository;
import com.dreamspex.security.CurrentUser;import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

import static com.dreamspex.catalog.dto.CatalogDtos.*;

@Service
public class CouponService {
    private static final Set<String> DISCOUNT_TYPES = Set.of("PERCENT", "FIXED");
    private static final Set<String> ELIGIBILITY = Set.of("ALL", "NEW_CUSTOMERS", "MEMBERSHIP_MEMBERS");

    private final CouponRepository coupons;
    private final CurrentUser currentUser;
    private final CartRepository carts;
    private final OrderRepository orders;
    private final MembershipRepository memberships;
    private final ProductRepository products;
    private final CategoryRepository categories;
    private final ObjectMapper mapper;
    private final AuditLogService audit;

    public CouponService(
            CouponRepository coupons,
            CurrentUser currentUser,
            CartRepository carts,
            OrderRepository orders,
            MembershipRepository memberships,
            ProductRepository products,
            CategoryRepository categories,
            ObjectMapper mapper,
            AuditLogService audit) {
        this.coupons = coupons;
        this.currentUser = currentUser;
        this.carts = carts;
        this.orders = orders;
        this.memberships = memberships;
        this.products = products;
        this.categories = categories;
        this.mapper = mapper;
        this.audit = audit;
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> offers() {
        Instant now = Instant.now();
        return coupons.findByStatus("ACTIVE").stream()
                .filter(Coupon::isPublished)
                .filter(coupon -> current(coupon, now))
                .filter(this::hasActiveOfferCategory)
                .filter(coupon -> coupon.getUsageLimit() == null || coupon.getCode() == null
                        || orders.countByCouponCodeIgnoreCase(coupon.getCode()) < coupon.getUsageLimit())
                .sorted((first, second) -> {
                    int displayOrder = Integer.compare(first.getDisplayOrder(), second.getDisplayOrder());
                    return displayOrder != 0 ? displayOrder : first.getTitle().compareToIgnoreCase(second.getTitle());
                })
                .map(this::response)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<OfferResponse> adminOffers(String query, String category, String publicationStatus, Boolean active) {
        String normalizedQuery = query == null ? "" : query.trim().toLowerCase(Locale.ROOT);
        String normalizedCategory = category == null ? "" : category.trim().toLowerCase(Locale.ROOT);
        String normalizedPublication = publicationStatus == null ? "" : publicationStatus.trim().toUpperCase(Locale.ROOT);
        return coupons.findAll().stream()
                .filter(offer -> normalizedQuery.isEmpty()
                        || offer.getTitle().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                        || offer.getCode() != null && offer.getCode().toLowerCase(Locale.ROOT).contains(normalizedQuery)
                        || offer.getDescription() != null && offer.getDescription().toLowerCase(Locale.ROOT).contains(normalizedQuery))
                .filter(offer -> normalizedCategory.isEmpty() || normalizedCategory.equalsIgnoreCase(offer.getOfferCategory()))
                .filter(offer -> normalizedPublication.isEmpty()
                        || normalizedPublication.equals(offer.isPublished() ? "PUBLISHED" : "DRAFT"))
                .filter(offer -> active == null || active == "ACTIVE".equals(offer.getStatus()))
                .sorted((first, second) -> {
                    int displayOrder = Integer.compare(first.getDisplayOrder(), second.getDisplayOrder());
                    return displayOrder != 0 ? displayOrder : first.getTitle().compareToIgnoreCase(second.getTitle());
                })
                .map(this::response)
                .toList();
    }

    @Transactional
    public OfferResponse saveOffer(Authentication authentication, String id, OfferRequest request) {
        User actor = currentUser.require(authentication);
        String code = normalizeCode(request.couponCode());
        String category = request.category().trim().toLowerCase(Locale.ROOT);
        String discountType = request.discountType().trim().toUpperCase(Locale.ROOT);
        String eligibility = request.customerEligibility().trim().toUpperCase(Locale.ROOT);
        String publication = request.publicationStatus().trim().toUpperCase(Locale.ROOT);
        if (!DISCOUNT_TYPES.contains(discountType)) throw invalidOffer("Choose percentage or fixed amount discount.");
        if (!ELIGIBILITY.contains(eligibility)) throw invalidOffer("Choose a supported customer eligibility.");
        if (!Set.of("DRAFT", "PUBLISHED").contains(publication)) throw invalidOffer("Choose Draft or Published status.");
        Category offerCategory = category.matches("[a-z0-9]+(?:-[a-z0-9]+)*")
                ? categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull(category, "OFFER", "ACTIVE")
                        .or(() -> categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull(category, "OFFER", "INACTIVE"))
                        .orElse(null)
                : null;
        if (offerCategory == null || "INACTIVE".equals(offerCategory.getStatus())
                && (id == null || "PUBLISHED".equals(publication))) {
            throw invalidOffer("Choose an active offer category.");
        }
        if ("PERCENT".equals(discountType) && request.discountValue().compareTo(BigDecimal.valueOf(100)) > 0) {
            throw invalidOffer("Percentage discounts cannot exceed 100%.");
        }
        if (request.maxDiscount() != null && request.maxDiscount().signum() == 0) {
            throw invalidOffer("Maximum discount must be greater than zero when provided.");
        }
        if (request.minSubtotal() != null && request.maxDiscount() != null
                && request.maxDiscount().compareTo(request.minSubtotal()) > 0) {
            throw invalidOffer("Maximum discount cannot exceed the minimum purchase amount.");
        }
        if (request.startsAt() != null && request.endsAt() != null && !request.endsAt().isAfter(request.startsAt())) {
            throw invalidOffer("Expiry date must be after the start date.");
        }
        validateImageUrl(request.imageUrl());
        if (code != null && coupons.countByCodeIgnoreCaseAndIdNot(code, id == null ? "" : id) > 0) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_COUPON_CODE", "This coupon code is already in use.");
        }
        List<String> productIds = validateProductIds(request.applicableProductIds());
        List<String> categoryIds = validateCategoryIds(request.applicableCategoryIds());

        Coupon offer = id == null ? new Coupon() : coupons.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND", "Offer was not found."));
        offer.setCode(code);
        offer.setTitle(request.title().trim());
        offer.setSubtitle(blank(request.subtitle()));
        offer.setDescription(request.description().trim());
        offer.setImageUrl(request.imageUrl().trim());
        offer.setOfferCategory(category);
        offer.setDiscountType(discountType);
        offer.setDiscountValue(request.discountValue().setScale(2, RoundingMode.HALF_UP));
        offer.setMinSubtotal(request.minSubtotal());
        offer.setMaxDiscount(request.maxDiscount());
        offer.setStartsAt(request.startsAt());
        offer.setEndsAt(request.endsAt());
        offer.setUsageLimit(request.usageLimit());
        offer.setPerUserLimit(request.perUserLimit());
        offer.setCustomerEligibility(eligibility);
        offer.setDisplayOrder(request.displayOrder());
        offer.setStatus(request.active() ? "ACTIVE" : "INACTIVE");
        offer.setPublished("PUBLISHED".equals(publication));
        offer.setApplicableProductIds(writeIds(productIds));
        offer.setApplicableCategoryIds(writeIds(categoryIds));
        Coupon saved = coupons.save(offer);
        audit.record(actor, id == null ? "OFFER_CREATED" : "OFFER_UPDATED", "COUPON", saved.getId());
        return response(saved);
    }

    @Transactional
    public void deleteOffer(Authentication authentication, String id) {
        User actor = currentUser.require(authentication);
        Coupon offer = coupons.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "OFFER_NOT_FOUND", "Offer was not found."));
        offer.setStatus("INACTIVE");
        offer.setPublished(false);
        coupons.save(offer);
        audit.record(actor, "OFFER_DELETED", "COUPON", id);
    }

    @Transactional(readOnly = true)
    public CouponResponse validate(Authentication authentication, CouponRequest request) {
        User user = currentUser.require(authentication);
        Coupon coupon = coupons.findByCodeIgnoreCaseAndStatus(request.code().trim(), "ACTIVE")
                .filter(Coupon::isPublished)
                .filter(this::hasActiveOfferCategory)
                .orElseThrow(() -> invalidCoupon());
        Cart cart = carts.findByUserIdAndStatus(user.getId(), "ACTIVE")
                .orElseThrow(() -> invalidCoupon());
        BigDecimal discount = discountForCart(coupon, user, cart);
        return new CouponResponse(coupon.getCode(), true, discount, "Coupon applied.");
    }

    public BigDecimal discountForCart(Coupon coupon, User user, Cart cart) {
        Instant now = Instant.now();
        if (!"ACTIVE".equals(coupon.getStatus()) || !coupon.isPublished()
                || !hasActiveOfferCategory(coupon) || !current(coupon, now)) {
            throw invalidCoupon();
        }
        if (coupon.getUsageLimit() != null
                && orders.countByCouponCodeIgnoreCase(coupon.getCode()) >= coupon.getUsageLimit()) {
            throw invalidCoupon();
        }
        if (coupon.getPerUserLimit() != null
                && orders.countByUserIdAndCouponCodeIgnoreCase(user.getId(), coupon.getCode()) >= coupon.getPerUserLimit()) {
            throw invalidCoupon();
        }
        if ("NEW_CUSTOMERS".equals(coupon.getCustomerEligibility()) && orders.countByUserId(user.getId()) > 0) {
            throw invalidCoupon();
        }
        if ("MEMBERSHIP_MEMBERS".equals(coupon.getCustomerEligibility())
                && memberships.findFirstByUserIdAndStatusOrderByExpiresAtDesc(user.getId(), "ACTIVE")
                .filter(membership -> !membership.getStartsAt().isAfter(now) && membership.getExpiresAt().isAfter(now))
                .isEmpty()) {
            throw invalidCoupon();
        }

        List<String> productIds = readIds(coupon.getApplicableProductIds());
        List<String> categoryIds = readIds(coupon.getApplicableCategoryIds());
        BigDecimal eligibleSubtotal = BigDecimal.ZERO;
        for (CartItem item : cart.getItems()) {
            Product product = item.getVariant().getProduct();
            boolean applies = productIds.isEmpty() && categoryIds.isEmpty()
                    || productIds.contains(product.getId())
                    || product.getCategories().stream().anyMatch(category -> categoryIds.contains(category.getId()));
            if (applies) {
                eligibleSubtotal = eligibleSubtotal.add(item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())));
            }
        }
        if (eligibleSubtotal.signum() <= 0
                || coupon.getMinSubtotal() != null && eligibleSubtotal.compareTo(coupon.getMinSubtotal()) < 0) {
            throw invalidCoupon();
        }
        BigDecimal discount = "PERCENT".equals(coupon.getDiscountType())
                ? eligibleSubtotal.multiply(coupon.getDiscountValue()).divide(BigDecimal.valueOf(100), 2, RoundingMode.DOWN)
                : coupon.getDiscountValue();
        if (coupon.getMaxDiscount() != null) discount = discount.min(coupon.getMaxDiscount());
        return discount.min(eligibleSubtotal).setScale(2, RoundingMode.DOWN);
    }

    private OfferResponse response(Coupon coupon) {
        List<String> productIds = readIds(coupon.getApplicableProductIds());
        List<String> categoryIds = readIds(coupon.getApplicableCategoryIds());
        String linkUrl = categoryIds.stream()
                .map(categories::findById)
                .flatMap(Optional::stream)
                .findFirst()
                .map(category -> "/shop?category=" + category.getSlug())
                .orElseGet(() -> productIds.stream()
                        .map(products::findById)
                        .flatMap(Optional::stream)
                        .findFirst()
                        .map(product -> "/product/" + product.getId())
                        .orElseGet(() -> "offer-membership-offers".equalsIgnoreCase(coupon.getOfferCategory()) ? "/membership" : "/shop"));
        return new OfferResponse(
                coupon.getId(), coupon.getCode(), coupon.getTitle(), coupon.getSubtitle(), coupon.getDescription(),
                coupon.getImageUrl(), coupon.getOfferCategory(), coupon.getDiscountType(), coupon.getDiscountValue(),
                coupon.getMinSubtotal(), coupon.getMaxDiscount(), coupon.getStartsAt(), coupon.getEndsAt(),
                coupon.getUsageLimit(), coupon.getPerUserLimit(), coupon.getCustomerEligibility(),
                coupon.getDisplayOrder(), "ACTIVE".equals(coupon.getStatus()),
                coupon.isPublished() ? "PUBLISHED" : "DRAFT", productIds, categoryIds, linkUrl);
    }

    private List<String> validateProductIds(List<String> ids) {
        List<String> values = ids == null ? List.of() : ids.stream().filter(value -> value != null && !value.isBlank()).distinct().toList();
        if (values.stream().anyMatch(id -> products.findById(id).isEmpty())) throw invalidOffer("An applicable product was not found.");
        return values;
    }

    private List<String> validateCategoryIds(List<String> ids) {
        List<String> values = ids == null ? List.of() : ids.stream().filter(value -> value != null && !value.isBlank()).distinct().toList();
        if (values.stream().anyMatch(id -> categories.findById(id).isEmpty())) throw invalidOffer("An applicable category was not found.");
        return values;
    }

    private String writeIds(List<String> ids) {
        if (ids.isEmpty()) return null;
        try {
            return mapper.writeValueAsString(ids);
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "OFFER_SAVE_FAILED", "Applicable products could not be saved.", exception);
        }
    }

    private List<String> readIds(String json) {
        if (json == null || json.isBlank()) return List.of();
        try {
            return mapper.readValue(json, new TypeReference<>() {});
        } catch (JsonProcessingException exception) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "OFFER_DATA_INVALID", "Applicable offer items could not be read.", exception);
        }
    }

    private void validateImageUrl(String value) {
        try {
            var uri = java.net.URI.create(value.trim());
            if (!Set.of("http", "https", "/").contains(uri.getScheme() == null ? "/" : uri.getScheme())) throw new IllegalArgumentException();
        } catch (IllegalArgumentException exception) {
            throw invalidOffer("Offer image URL must use http or https.");
        }
    }

    private boolean hasActiveOfferCategory(Coupon coupon) {
        return coupon.getOfferCategory() != null
                && categories.findBySlugAndCategoryTypeAndStatusAndDeletedAtIsNull(
                        coupon.getOfferCategory(), "OFFER", "ACTIVE").isPresent();
    }

    private boolean current(Coupon coupon, Instant now) {
        return coupon.getStartsAt() != null && !coupon.getStartsAt().isAfter(now)
                && (coupon.getEndsAt() == null || coupon.getEndsAt().isAfter(now));
    }

    private String normalizeCode(String value) {
        if (value == null || value.isBlank()) return null;
        String code = value.trim().toUpperCase(Locale.ROOT);
        if (!code.matches("[A-Z0-9_-]{2,64}")) throw invalidOffer("Coupon codes may contain letters, numbers, underscores, and hyphens.");
        return code;
    }

    private String blank(String value) { return value == null || value.isBlank() ? null : value.trim(); }

    private ApiException invalidOffer(String message) {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_OFFER", message);
    }

    private ApiException invalidCoupon() {
        return new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_COUPON", "Coupon conditions are not met.");
    }
}
