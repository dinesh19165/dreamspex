package com.dreamspex.membership;
import jakarta.validation.Valid; import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.prescription.PrescriptionDtos.*; import static com.dreamspex.membership.MembershipDtos.*;
import com.dreamspex.audit.AuditLogService; import com.dreamspex.security.CurrentUser; import org.springframework.security.core.Authentication;
@RestController @RequestMapping("/api/v1/admin/membership-plans") @PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminMembershipController {
 private final MembershipService s; private final CurrentUser current; private final AuditLogService audit; public AdminMembershipController(MembershipService s,CurrentUser current,AuditLogService audit){this.s=s;this.current=current;this.audit=audit;}
 @GetMapping List<PlanResponse> list(){return s.adminPlans();}
 @GetMapping("/memberships") List<AdminMembershipResponse> memberships(){return s.adminMemberships();}
 @GetMapping("/payments") List<AdminMembershipPaymentResponse> payments(){return s.adminPaymentHistory();}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) PlanResponse create(Authentication a,@Valid @RequestBody PlanRequest r){PlanResponse out=s.savePlan(null,r);audit.record(current.require(a),"MEMBERSHIP_PLAN_CREATED","MEMBERSHIP_PLAN",out.id());return out;}
 @PatchMapping("/{id}") PlanResponse update(Authentication a,@PathVariable String id,@Valid @RequestBody PlanRequest r){PlanResponse out=s.savePlan(id,r);audit.record(current.require(a),"MEMBERSHIP_PLAN_UPDATED","MEMBERSHIP_PLAN",id);return out;}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication a,@PathVariable String id){s.deletePlan(id);audit.record(current.require(a),"MEMBERSHIP_PLAN_DISABLED","MEMBERSHIP_PLAN",id);}
}
