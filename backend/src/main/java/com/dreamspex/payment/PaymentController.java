package com.dreamspex.payment;
import jakarta.validation.Valid;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import static com.dreamspex.order.OrderDtos.*;
@RestController @RequestMapping("/api/v1/payments")
public class PaymentController {
 private final PaymentService s; public PaymentController(PaymentService s){this.s=s;}
 @PostMapping("/orders/{orderId}/intent") @PreAuthorize("hasRole('CUSTOMER')") PaymentOrderResponse create(Authentication a,@PathVariable String orderId){return s.create(a,orderId);}
 @PostMapping("/orders/{orderId}/verify") @PreAuthorize("hasRole('CUSTOMER')") PaymentResponse verify(Authentication a,@PathVariable String orderId,@Valid @RequestBody PaymentVerificationRequest request){return s.verify(a,orderId,request);}
 @PostMapping("/orders/{orderId}/failed") @PreAuthorize("hasRole('CUSTOMER')") PaymentResponse failed(Authentication a,@PathVariable String orderId,@Valid @RequestBody PaymentFailureRequest request){return s.failed(a,orderId,request);}
 @GetMapping("/{id}") @PreAuthorize("hasRole('CUSTOMER')") PaymentResponse get(Authentication a,@PathVariable String id){return s.get(a,id);}
 @PostMapping("/webhooks/razorpay") PaymentResponse webhook(@RequestHeader("X-Razorpay-Signature") String signature,@RequestHeader("X-Razorpay-Event-Id") String eventId,@RequestBody String payload){return s.webhook(signature,eventId,payload);}
}
