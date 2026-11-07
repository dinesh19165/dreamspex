package com.dreamspex.admin;
import com.dreamspex.catalog.entity.ProductVariant;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import static com.dreamspex.admin.AdminDtos.*;

@RestController @RequestMapping("/api/v1/admin") @PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminOperationsController {
 private final AdminOperationsService s; public AdminOperationsController(AdminOperationsService s){this.s=s;}
 @GetMapping("/dashboard") Dashboard dashboard(){return s.dashboard();}
 @GetMapping("/customers") CustomerPage customers(@RequestParam(required=false) String q,@RequestParam(defaultValue="0") int page,@RequestParam(defaultValue="25") int size){return s.customers(q,page,size);}
 @PatchMapping("/customers/{id}/status") CustomerResponse customerStatus(Authentication a,@PathVariable String id,@Valid @RequestBody StatusRequest r){return s.customerStatus(a,id,r);}
 @PatchMapping("/inventory/{id}") Object inventory(Authentication a,@PathVariable String id,@Valid @RequestBody InventoryRequest r){ProductVariant v=s.inventory(a,id,r);return java.util.Map.of("id",v.getId(),"sku",v.getSku(),"quantity",v.getQuantity(),"reservedQuantity",v.getReservedQuantity(),"availableQuantity",v.getAvailableQuantity());}
 @GetMapping("/coupons") List<CouponAdminResponse> coupons(){return s.couponList();}
 @PostMapping("/coupons") @ResponseStatus(HttpStatus.CREATED) CouponAdminResponse createCoupon(Authentication a,@Valid @RequestBody CouponAdminRequest r){return s.saveCoupon(a,null,r);}
 @PatchMapping("/coupons/{id}") CouponAdminResponse updateCoupon(Authentication a,@PathVariable String id,@Valid @RequestBody CouponAdminRequest r){return s.saveCoupon(a,id,r);}
 @DeleteMapping("/coupons/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void deleteCoupon(Authentication a,@PathVariable String id){s.deleteCoupon(a,id);}
 @PostMapping("/customers/{id}/notifications") @ResponseStatus(HttpStatus.NO_CONTENT) void notify(Authentication a,@PathVariable String id,@Valid @RequestBody NotificationRequest r){s.notifyCustomer(a,id,r);}
 @GetMapping("/audit-logs") List<AuditResponse> audit(@RequestParam(required=false) String action){return s.audit(action);}
 @GetMapping("/banners") List<BannerResponse> banners(){return s.publicBanners();}
 @PostMapping("/banners") @ResponseStatus(HttpStatus.CREATED) BannerResponse createBanner(@Valid @RequestBody BannerRequest r){return s.saveBanner(null,r);}
 @PatchMapping("/banners/{id}") BannerResponse updateBanner(@PathVariable String id,@Valid @RequestBody BannerRequest r){return s.saveBanner(id,r);}
 @GetMapping("/homepage-content") List<ContentResponse> content(){return s.publicContent();}
 @PostMapping("/homepage-content") @ResponseStatus(HttpStatus.CREATED) ContentResponse createContent(Authentication a,@Valid @RequestBody ContentRequest r){return s.saveContent(a,null,r);}
 @PatchMapping("/homepage-content/{id}") ContentResponse updateContent(Authentication a,@PathVariable String id,@Valid @RequestBody ContentRequest r){return s.saveContent(a,id,r);}
 @GetMapping("/stores") List<StoreResponse> stores(){return s.publicStores();}
 @GetMapping("/stores/all") List<StoreResponse> allStores(){return s.adminStores();}
 @PostMapping("/stores") @ResponseStatus(HttpStatus.CREATED) StoreResponse createStore(@Valid @RequestBody StoreRequest r){return s.saveStore(null,r);}
 @PatchMapping("/stores/{id}") StoreResponse updateStore(@PathVariable String id,@Valid @RequestBody StoreRequest r){return s.saveStore(id,r);}
 @GetMapping("/services") List<ServiceResponse> services(){return s.publicServices();}
 @PostMapping("/services") @ResponseStatus(HttpStatus.CREATED) ServiceResponse createService(@Valid @RequestBody ServiceRequest r){return s.saveService(null,r);}
 @PatchMapping("/services/{id}") ServiceResponse updateService(@PathVariable String id,@Valid @RequestBody ServiceRequest r){return s.saveService(id,r);}
}
