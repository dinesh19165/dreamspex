package com.dreamspex.membership;
import com.dreamspex.membership.MembershipDtos.PaymentIntentResponse;
import com.dreamspex.membership.MembershipDtos.PaymentVerificationRequest;
import com.dreamspex.membership.MembershipDtos.PaymentStatusRequest;
import com.dreamspex.membership.MembershipDtos.MembershipDashboardResponse;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import static com.dreamspex.prescription.PrescriptionDtos.*;
@RestController @RequestMapping("/api/v1/membership-plans")
public class MembershipController {
 private final MembershipService s; public MembershipController(MembershipService s){this.s=s;}
 @GetMapping List<PlanResponse> list(){return s.publicPlans();}
 @GetMapping("/{id}") PlanResponse get(@PathVariable String id){return s.publicPlans().stream().filter(p->p.id().equals(id)).findFirst().orElseThrow(()->new com.dreamspex.common.ApiException(HttpStatus.NOT_FOUND,"PLAN_NOT_FOUND","Membership plan was not found."));}
 @PostMapping("/{id}/activate") @PreAuthorize("hasRole('CUSTOMER')") MembershipResponse activate(Authentication a,@PathVariable String id){return s.activate(a,id);}
 @PostMapping("/{id}/payment-intent") @PreAuthorize("hasRole('CUSTOMER')") PaymentIntentResponse createPaymentIntent(Authentication a,@PathVariable String id){return s.createPaymentIntent(a,id);}
 @PostMapping("/{id}/verify") @PreAuthorize("hasRole('CUSTOMER')") MembershipResponse verifyPayment(Authentication a,@PathVariable String id,@Valid @RequestBody PaymentVerificationRequest request){return s.verifyPayment(a,id,request);}
 @PostMapping("/{id}/payment-status") @PreAuthorize("hasRole('CUSTOMER')") PaymentIntentResponse updatePaymentStatus(Authentication a,@PathVariable String id,@Valid @RequestBody PaymentStatusRequest request){return s.updatePaymentStatus(a,id,request);}
 @GetMapping("/me") @PreAuthorize("hasRole('CUSTOMER')") MembershipDashboardResponse dashboard(Authentication a){return s.customerDashboard(a);}
 @GetMapping("/me/current") @PreAuthorize("hasRole('CUSTOMER')") MembershipResponse current(Authentication a){return s.current(a);}
}
