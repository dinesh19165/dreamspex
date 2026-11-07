package com.dreamspex.admin;


import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.catalog.entity.Coupon;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.audit.*;import com.dreamspex.common.ApiException;
import com.dreamspex.notification.*;
import com.dreamspex.order.*;
import com.dreamspex.payment.*;
import com.dreamspex.security.CurrentUser;
import jakarta.persistence.criteria.Predicate;
import org.springframework.data.domain.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.math.BigDecimal;
import java.time.Instant;
import java.util.*;
import static com.dreamspex.admin.AdminDtos.*;

@Service
public class AdminOperationsService {
    private final CurrentUser current; private final UserRepository users;
    private final ProductRepository products; private final ProductVariantRepository variants; private final CategoryRepository categories;
    private final CouponRepository coupons; private final OrderRepository orders; private final PaymentRepository payments;
    private final NotificationService notifications; private final NotificationRepository notificationRepository;
    private final AuditLogRepository audit; private final AuditLogService auditService; private final BannerRepository banners; private final HomepageContentRepository content;
    private final StoreRepository stores; private final ServiceOfferingRepository services;
    public AdminOperationsService(CurrentUser current, UserRepository users, ProductRepository products,
            ProductVariantRepository variants, CategoryRepository categories, CouponRepository coupons, OrderRepository orders,
            PaymentRepository payments, NotificationService notifications, NotificationRepository notificationRepository,
            AuditLogRepository audit, AuditLogService auditService, BannerRepository banners, HomepageContentRepository content, StoreRepository stores,
            ServiceOfferingRepository services) {
        this.current=current; this.users=users; this.products=products; this.variants=variants; this.categories=categories;
        this.coupons=coupons; this.orders=orders; this.payments=payments; this.notifications=notifications;
        this.notificationRepository=notificationRepository; this.audit=audit; this.auditService=auditService; this.banners=banners; this.content=content; this.stores=stores; this.services=services;
    }
    @Transactional(readOnly=true) public Dashboard dashboard() {
        long customer=users.countByDeletedAtIsNullAndRoles_Code("CUSTOMER");
        long active=users.countByStatusAndDeletedAtIsNull("ACTIVE");
        long pending=orders.findAll().stream().filter(o->"PENDING_PAYMENT".equals(o.getStatus())).count();
        BigDecimal revenue=orders.findAll().stream().filter(o->"PAID".equals(o.getPaymentStatus())).map(Order::getTotalAmount).reduce(BigDecimal.ZERO,BigDecimal::add);
        return new Dashboard(customer,active,products.count(),orders.count(),pending,variants.countByQuantityLessThanEqualAndStatus(5,"ACTIVE"),revenue);
    }
    @Transactional(readOnly=true) public CustomerPage customers(String q,int page,int size) {
        if(page<0||size<1||size>100) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_PAGINATION","Invalid pagination.");
        Pageable pageable=PageRequest.of(page,size,Sort.by("createdAt").descending());
        Page<User> result=(q==null||q.isBlank())?users.findByDeletedAtIsNullAndRoles_Code("CUSTOMER",pageable):users.searchByRoleAndContact("CUSTOMER",q.trim(),pageable);
        return new CustomerPage(result.getContent().stream().map(this::customer).toList(),page,size,result.getTotalElements());
    }
    @Transactional public CustomerResponse customerStatus(org.springframework.security.core.Authentication auth,String id,StatusRequest request) {
        User actor=current.require(auth); User user=users.findById(id).orElseThrow(()->notFound("CUSTOMER_NOT_FOUND","Customer was not found."));
        if(user.getRoles().stream().noneMatch(r->"CUSTOMER".equals(r.getCode()))) throw notFound("CUSTOMER_NOT_FOUND","Customer was not found.");
        if(!Set.of("ACTIVE","SUSPENDED","DISABLED").contains(request.status())) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_STATUS","Invalid customer status.");
        user.setStatus(request.status()); user.incrementTokenVersion(); users.save(user); auditService.record(actor,"CUSTOMER_STATUS_CHANGED","USER",id); return customer(user);
    }
    @Transactional public ProductVariant inventory(org.springframework.security.core.Authentication auth,String id,InventoryRequest request) {
        User actor=current.require(auth); ProductVariant v=variants.findById(id).orElseThrow(()->notFound("VARIANT_NOT_FOUND","Variant was not found."));
        if(request.reservedQuantity()>request.quantity()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_INVENTORY","Reserved quantity cannot exceed quantity.");
        v.setQuantity(request.quantity()); v.setReservedQuantity(request.reservedQuantity()); ProductVariant saved=variants.save(v); auditService.record(actor,"INVENTORY_UPDATED","PRODUCT_VARIANT",id); return saved;
    }
    @Transactional(readOnly=true) public List<CouponAdminResponse> couponList(){return coupons.findAll().stream().map(this::coupon).toList();}
    @Transactional public CouponAdminResponse saveCoupon(org.springframework.security.core.Authentication auth,String id,CouponAdminRequest r){User actor=current.require(auth); Coupon c=id==null?new Coupon():coupons.findById(id).orElseThrow(()->notFound("COUPON_NOT_FOUND","Coupon was not found.")); if(!Set.of("ACTIVE","INACTIVE","DRAFT").contains(r.status()))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_STATUS","Invalid coupon status."); c.setCode(r.code().trim().toUpperCase());c.setTitle(r.title().trim());c.setDescription(r.description());c.setDiscountType(r.discountType().trim().toUpperCase());c.setDiscountValue(r.discountValue());c.setMinSubtotal(r.minSubtotal());c.setMaxDiscount(r.maxDiscount());c.setStartsAt(r.startsAt());c.setEndsAt(r.endsAt());c.setStatus(r.status());Coupon saved=coupons.save(c);auditService.record(actor,"COUPON_SAVED","COUPON",saved.getId());return coupon(saved);}
    @Transactional public void deleteCoupon(org.springframework.security.core.Authentication auth,String id){User actor=current.require(auth);Coupon c=coupons.findById(id).orElseThrow(()->notFound("COUPON_NOT_FOUND","Coupon was not found."));c.setStatus("INACTIVE");coupons.save(c);auditService.record(actor,"COUPON_DISABLED","COUPON",id);}
    @Transactional public void notifyCustomer(org.springframework.security.core.Authentication auth,String id,NotificationRequest r){User actor=current.require(auth);User user=users.findById(id).orElseThrow(()->notFound("CUSTOMER_NOT_FOUND","Customer was not found."));notifications.create(user,r.type(),r.title(),r.message());auditService.record(actor,"CUSTOMER_NOTIFIED","USER",id);}
    @Transactional(readOnly=true) public List<AuditResponse> audit(String action){return audit.findAll(Sort.by(Sort.Direction.DESC,"createdAt")).stream().filter(x->action==null||action.isBlank()||action.equals(x.getAction())).map(x->new AuditResponse(x.getId(),x.getAction(),x.getResourceType(),x.getResourceId(),x.getRequestId(),x.getIpAddress(),x.getCreatedAt())).toList();}
    @Transactional public BannerResponse saveBanner(String id,BannerRequest r){Banner b=id==null?new Banner():banners.findById(id).orElseThrow(()->notFound("BANNER_NOT_FOUND","Banner was not found."));b.setTitle(r.title().trim());b.setImageUrl(r.imageUrl().trim());b.setLinkUrl(r.linkUrl());b.setSortOrder(r.sortOrder());b.setStatus(r.status());b.setStartsAt(r.startsAt());b.setEndsAt(r.endsAt());return banner(banners.save(b));}
    @Transactional public ContentResponse saveContent(org.springframework.security.core.Authentication auth,String id,ContentRequest r){User actor=current.require(auth);HomepageContent c=id==null?content.findByContentKey(r.contentKey()).orElseGet(HomepageContent::new):content.findById(id).orElseThrow(()->notFound("CONTENT_NOT_FOUND","Homepage content was not found."));c.setContentKey(r.contentKey().trim());c.setTitle(r.title());c.setBody(r.body());c.setImageUrl(r.imageUrl());c.setStatus(r.status());c.setUpdatedBy(actor);return contentResponse(content.save(c));}
    @Transactional public StoreResponse saveStore(String id,StoreRequest r){Store s=id==null?new Store():stores.findById(id).orElseThrow(()->notFound("STORE_NOT_FOUND","Store was not found."));boolean coordinatePair=(r.latitude()==null)==(r.longitude()==null);boolean validCoordinates=(r.latitude()==null&&r.longitude()==null)||(r.latitude()!=null&&r.longitude()!=null&&r.latitude().compareTo(new BigDecimal("-90"))>=0&&r.latitude().compareTo(new BigDecimal("90"))<=0&&r.longitude().compareTo(new BigDecimal("-180"))>=0&&r.longitude().compareTo(new BigDecimal("180"))<=0);boolean validRadius=r.deliveryRadiusKm()!=null&&r.deliveryRadiusKm().signum()>0&&r.deliveryRadiusKm().compareTo(new BigDecimal("10000"))<=0;if(!coordinatePair||!validCoordinates||("ACTIVE".equals(r.status())&&(!validCoordinates||r.latitude()==null||!validRadius))||(r.deliveryRadiusKm()!=null&&!validRadius))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_STORE_DELIVERY_CONFIGURATION","Active stores require valid map coordinates and a delivery radius between 0.01 and 10000 km.");s.setName(r.name().trim());s.setPhone(r.phone());s.setAddress(r.address().trim());s.setCity(r.city().trim());s.setState(r.state().trim());s.setPostalCode(r.postalCode().trim());s.setLatitude(r.latitude());s.setLongitude(r.longitude());s.setDeliveryRadiusKm(r.deliveryRadiusKm());s.setStatus(r.status());return store(stores.save(s));}
    @Transactional public ServiceResponse saveService(String id,ServiceRequest r){ServiceOffering s=id==null?new ServiceOffering():services.findById(id).orElseThrow(()->notFound("SERVICE_NOT_FOUND","Service was not found."));s.setName(r.name().trim());s.setDescription(r.description().trim());s.setStatus(r.status());s.setSortOrder(r.sortOrder());return service(services.save(s));}
    @Transactional(readOnly=true) public List<BannerResponse> publicBanners(){return banners.findByStatusOrderBySortOrderAsc("PUBLISHED").stream().map(this::banner).toList();}
    @Transactional(readOnly=true) public List<ContentResponse> publicContent(){return content.findAll().stream().filter(x->"PUBLISHED".equals(x.getStatus())).map(this::contentResponse).toList();}
    @Transactional(readOnly=true) public List<StoreResponse> publicStores(){return stores.findByStatusOrderByNameAsc("ACTIVE").stream().map(this::store).toList();}
    @Transactional(readOnly=true) public List<StoreResponse> adminStores(){return stores.findAll(Sort.by("name")).stream().map(this::store).toList();}
    @Transactional(readOnly=true) public List<ServiceResponse> publicServices(){return services.findByStatusOrderBySortOrderAsc("ACTIVE").stream().map(this::service).toList();}
    private CustomerResponse customer(User u){return new CustomerResponse(u.getId(),u.getEmail(),u.getPhone(),u.getDisplayName(),u.getStatus(),u.getCreatedAt(),orders.countByUserId(u.getId()));}
    private CouponAdminResponse coupon(Coupon c){return new CouponAdminResponse(c.getId(),c.getCode(),c.getTitle(),c.getDescription(),c.getDiscountType(),c.getDiscountValue(),c.getMinSubtotal(),c.getMaxDiscount(),c.getStartsAt(),c.getEndsAt(),c.getStatus());}
    private BannerResponse banner(Banner b){return new BannerResponse(b.getId(),b.getTitle(),b.getImageUrl(),b.getLinkUrl(),b.getSortOrder(),b.getStatus(),b.getStartsAt(),b.getEndsAt());}
    private ContentResponse contentResponse(HomepageContent c){return new ContentResponse(c.getId(),c.getContentKey(),c.getTitle(),c.getBody(),c.getImageUrl(),c.getStatus());}
    private StoreResponse store(Store s){return new StoreResponse(s.getId(),s.getName(),s.getPhone(),s.getAddress(),s.getCity(),s.getState(),s.getPostalCode(),s.getLatitude(),s.getLongitude(),s.getDeliveryRadiusKm(),s.getStatus());}
    private ServiceResponse service(ServiceOffering s){return new ServiceResponse(s.getId(),s.getName(),s.getDescription(),s.getStatus(),s.getSortOrder());}
    private <T extends RuntimeException> T notFound(String code,String message){throw new ApiException(HttpStatus.NOT_FOUND,code,message);}
}
