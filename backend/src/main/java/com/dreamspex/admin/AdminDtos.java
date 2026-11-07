package com.dreamspex.admin;
import jakarta.validation.constraints.*; import java.math.BigDecimal; import java.time.Instant; import java.util.*;
public final class AdminDtos { private AdminDtos(){}
 public record CustomerResponse(String id,String email,String phone,String displayName,String status,Instant createdAt,long orderCount){}
 public record CustomerPage(List<CustomerResponse> items,int page,int pageSize,long total){}
 public record StatusRequest(@NotBlank @Size(max=24) String status){}
 public record Dashboard(long customers,long activeCustomers,long products,long orders,long pendingOrders,long lowStockVariants,BigDecimal revenue){}
 public record InventoryRequest(@Min(0) int quantity,@Min(0) int reservedQuantity){}
 public record CouponAdminRequest(@NotBlank @Size(max=64) String code,@NotBlank @Size(max=160) String title,@Size(max=2000) String description,@NotBlank String discountType,@NotNull @DecimalMin("0.00") BigDecimal discountValue,@DecimalMin("0.00") BigDecimal minSubtotal,@DecimalMin("0.00") BigDecimal maxDiscount,@NotNull Instant startsAt,Instant endsAt,@NotBlank String status){}
 public record CouponAdminResponse(String id,String code,String title,String description,String discountType,BigDecimal discountValue,BigDecimal minSubtotal,BigDecimal maxDiscount,Instant startsAt,Instant endsAt,String status){}
 public record NotificationRequest(@NotBlank @Size(max=64) String type,@NotBlank @Size(max=180) String title,@NotBlank @Size(max=1000) String message){}
 public record AuditResponse(String id,String action,String resourceType,String resourceId,String requestId,String ipAddress,Instant createdAt){}
 public record BannerRequest(@NotBlank @Size(max=180) String title,@NotBlank @Size(max=1000) String imageUrl,@Size(max=1000) String linkUrl,@Min(0) int sortOrder,@NotBlank String status,Instant startsAt,Instant endsAt){}
 public record BannerResponse(String id,String title,String imageUrl,String linkUrl,int sortOrder,String status,Instant startsAt,Instant endsAt){}
 public record ContentRequest(@NotBlank @Size(max=120) String contentKey,@Size(max=180) String title,@Size(max=10000) String body,@Size(max=1000) String imageUrl,@NotBlank String status){}
 public record ContentResponse(String id,String contentKey,String title,String body,String imageUrl,String status){}
 public record StoreRequest(@NotBlank @Size(max=180) String name,@Size(max=32) String phone,@NotBlank @Size(max=1000) String address,@NotBlank @Size(max=100) String city,@NotBlank @Size(max=100) String state,@NotBlank @Size(max=16) String postalCode,@DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,@DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude,@DecimalMin(value="0.01", inclusive=true) @DecimalMax("10000.00") BigDecimal deliveryRadiusKm,@NotBlank String status){}
 public record StoreResponse(String id,String name,String phone,String address,String city,String state,String postalCode,BigDecimal latitude,BigDecimal longitude,BigDecimal deliveryRadiusKm,String status){}
 public record ServiceRequest(@NotBlank @Size(max=180) String name,@NotBlank @Size(max=2000) String description,@NotBlank String status,@Min(0) int sortOrder){}
 public record ServiceResponse(String id,String name,String description,String status,int sortOrder){}
}
