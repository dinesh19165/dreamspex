package com.dreamspex.payment;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.order.OrderDtos.*;
@RestController @RequestMapping("/api/v1/admin/payments") @PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminPaymentController {
 private final PaymentService s; public AdminPaymentController(PaymentService s){this.s=s;}
 @GetMapping List<PaymentResponse> list(){return s.adminList();}
}
