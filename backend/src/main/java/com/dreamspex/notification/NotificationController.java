package com.dreamspex.notification;
import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.prescription.PrescriptionDtos.*;
@RestController @RequestMapping("/api/v1/me/notifications") @PreAuthorize("hasRole('CUSTOMER')")
public class NotificationController {
 private final NotificationService s; public NotificationController(NotificationService s){this.s=s;}
 @GetMapping List<NotificationResponse> list(Authentication a){return s.list(a);}
 @PostMapping("/{id}/read") void read(Authentication a,@PathVariable String id){s.markRead(a,id);}
}
