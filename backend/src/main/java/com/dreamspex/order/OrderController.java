package com.dreamspex.order;

import com.dreamspex.loyalty.LoyaltyService;
import com.dreamspex.loyalty.LoyaltyDtos.RedemptionPreview;
import jakarta.validation.Valid;
import java.math.BigDecimal;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import static com.dreamspex.order.OrderDtos.*;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("hasRole('CUSTOMER')")
public class OrderController {
    private final OrderService service;
    private final OrderRepository orders;
    private final LoyaltyService loyalty;

    public OrderController(OrderService service, OrderRepository orders, LoyaltyService loyalty) {
        this.service = service;
        this.orders = orders;
        this.loyalty = loyalty;
    }

    @PostMapping("/checkout/quote")
    QuoteResponse quote(Authentication authentication, @Valid @RequestBody CheckoutRequest request) {
        QuoteResponse quote = service.quote(authentication, request);
        RedemptionPreview preview = loyalty.previewRedemption(authentication,
                request.loyaltyPoints() == null ? 0 : request.loyaltyPoints(), quote.total());
        BigDecimal total = quote.total().subtract(preview.discount()).max(BigDecimal.ZERO);
        return new QuoteResponse(quote.subtotal(), quote.discount(), quote.couponDiscount(),
                quote.membershipDiscount(), quote.shipping(), total, quote.couponCode(),
                quote.deliveryAvailability(), quote.gstSnapshot(), preview.availablePoints(),
                preview.requestedPoints(), preview.discount(), preview.maximumRedeemablePoints());
    }

    @PostMapping("/orders")
    @ResponseStatus(HttpStatus.CREATED)
    @Transactional
    OrderResponse create(Authentication authentication, @RequestHeader("Idempotency-Key") String key,
                         @Valid @RequestBody CheckoutRequest request) {
        OrderResponse response = service.create(authentication, request, key);
        Order order = orders.findByIdForUpdate(response.id())
                .orElseThrow(() -> new IllegalStateException("The created order could not be reloaded."));
        if (order.getLoyaltyPointsRedeemed() == 0 && request.loyaltyPoints() != null
                && request.loyaltyPoints() > 0) {
            BigDecimal eligibleAmount = response.total();
            RedemptionPreview redemption = loyalty.redeemForOrder(order.getUser().getId(), order.getId(),
                    request.loyaltyPoints(), eligibleAmount);
            order.setLoyaltyPointsRedeemed(redemption.requestedPoints());
            order.setLoyaltyDiscountAmount(redemption.discount());
            order.setTotalAmount(order.getTotalAmount().subtract(redemption.discount()).max(BigDecimal.ZERO));
            response = withRedemption(response, order);
        }
        return response;
    }

    @GetMapping("/orders")
    List<OrderResponse> list(Authentication authentication) { return service.customerOrders(authentication); }

    @GetMapping("/orders/{id}")
    OrderResponse get(Authentication authentication, @PathVariable String id) {
        return service.customerOrder(authentication, id);
    }

    @PostMapping("/orders/{id}/cancel")
    @Transactional
    OrderResponse cancel(Authentication authentication, @PathVariable String id) {
        OrderResponse response = service.cancel(authentication, id);
        orders.findByIdForUpdate(id).ifPresent(order -> loyalty.restoreRedemption(order,
                "ORDER:" + id + ":CANCEL_REDEMPTION_REVERSAL", order.getTotalAmount()));
        return response;
    }

    private OrderResponse withRedemption(OrderResponse response, Order order) {
        return new OrderResponse(response.id(), response.orderNumber(), response.status(), response.paymentStatus(),
                response.subtotal(), response.discount(), response.couponDiscount(), response.membershipDiscount(),
                response.shipping(), order.getTotalAmount(), response.couponCode(), response.createdAt(),
                response.items(), response.history(), response.gstSnapshot(), order.getLoyaltyPointsRedeemed(),
                order.getLoyaltyDiscountAmount());
    }
}
