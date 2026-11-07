package com.dreamspex.order;
import jakarta.validation.Valid; import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.order.OrderDtos.*;
@RestController @RequestMapping("/api/v1") @PreAuthorize("hasRole('CUSTOMER')")
public class OrderController {
 private final OrderService s; public OrderController(OrderService s){this.s=s;}
 @PostMapping("/checkout/quote") QuoteResponse quote(Authentication a,@Valid @RequestBody CheckoutRequest r){return s.quote(a,r);}
 @PostMapping("/orders") @ResponseStatus(HttpStatus.CREATED) OrderResponse create(Authentication a,@RequestHeader("Idempotency-Key") String key,@Valid @RequestBody CheckoutRequest r){return s.create(a,r,key);}
 @GetMapping("/orders") List<OrderResponse> list(Authentication a){return s.customerOrders(a);}
 @GetMapping("/orders/{id}") OrderResponse get(Authentication a,@PathVariable String id){return s.customerOrder(a,id);}
 @PostMapping("/orders/{id}/cancel") OrderResponse cancel(Authentication a,@PathVariable String id){return s.cancel(a,id);}
}
