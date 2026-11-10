package com.dreamspex.order;
import jakarta.validation.constraints.*;
import java.math.BigDecimal; import java.time.Instant; import java.time.LocalDate; import java.util.List;
public final class OrderDtos {
 private OrderDtos(){}
 public record CheckoutRequest(@NotBlank String addressId,@Size(max=64) String couponCode,@Min(0) @Max(1000000) Integer loyaltyPoints){
  public CheckoutRequest(String addressId,String couponCode){this(addressId,couponCode,0);}
 }
 public record QuoteResponse(BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total,String couponCode,DeliveryAvailability deliveryAvailability,GstOrderSnapshot gstSnapshot,long loyaltyPointsAvailable,int loyaltyPointsRedeemed,BigDecimal loyaltyDiscount,int loyaltyPointsMaxRedeemable){
  public QuoteResponse(BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total,String couponCode,DeliveryAvailability deliveryAvailability,GstOrderSnapshot gstSnapshot){this(subtotal,discount,couponDiscount,membershipDiscount,shipping,total,couponCode,deliveryAvailability,gstSnapshot,0,0,BigDecimal.ZERO,0);}
 }
 public record DeliveryAvailability(boolean available,String status,BigDecimal distanceKm,BigDecimal radiusKm,String storeName,String message){}
 public record OrderResponse(String id,String orderNumber,String status,String paymentStatus,BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total,String couponCode,Instant createdAt,List<ItemResponse> items,List<HistoryResponse> history,GstOrderSnapshot gstSnapshot,int loyaltyPointsRedeemed,BigDecimal loyaltyDiscount){
  public OrderResponse(String id,String orderNumber,String status,String paymentStatus,BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total,String couponCode,Instant createdAt,List<ItemResponse> items,List<HistoryResponse> history,GstOrderSnapshot gstSnapshot){this(id,orderNumber,status,paymentStatus,subtotal,discount,couponDiscount,membershipDiscount,shipping,total,couponCode,createdAt,items,history,gstSnapshot,0,BigDecimal.ZERO);}
 }
 public record AdminOrderResponse(String id,String orderNumber,String status,String paymentStatus,BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total,String couponCode,Instant createdAt,CustomerResponse customer,ShippingAddressResponse shippingAddress,List<AdminOrderItemResponse> items,List<HistoryResponse> history,GstOrderSnapshot gstSnapshot,int loyaltyPointsRedeemed,BigDecimal loyaltyDiscount){}
 public record CustomerResponse(String id,String displayName,String email,String phone){}
 public record ShippingAddressResponse(String recipientName,String phone,String line1,String line2,String city,String state,String postalCode,String countryCode){}
 public record ItemResponse(String id,String productName,String sku,BigDecimal unitPrice,int quantity,BigDecimal lineTotal,
                            LensPreparationProgress lensPreparation){}
 public record LensPreparationProgress(String status,Instant updatedAt){}
 public record AdminOrderItemResponse(String id,String productName,String sku,BigDecimal unitPrice,int quantity,
                                      BigDecimal lineTotal,BigDecimal lensAdditionalPrice,List<String> selectedLensCodes,
                                      AdminPrescriptionDetails prescription,LensPreparationDetails lensPreparation){}
 public record AdminPrescriptionDetails(String id,String patientName,LocalDate prescriptionDate,LocalDate expiryDate,
        BigDecimal rightSph,BigDecimal rightCyl,Integer rightAxis,BigDecimal rightAdd,
        BigDecimal leftSph,BigDecimal leftCyl,Integer leftAxis,BigDecimal leftAdd,BigDecimal pd,
        BigDecimal rightPd,BigDecimal leftPd,String source,List<PrescriptionFileDetails> files,
        List<SelectedLensOption> selectedLenses,Integer preparationDays){}
 public record PrescriptionFileDetails(String id,String originalName,String contentType,long sizeBytes){}
 public record SelectedLensOption(String code,String name,String category,Integer preparationDays){}
 public record LensPreparationDetails(String status,String notes,String updatedBy,Instant updatedAt){}
 public record LensPreparationRequest(@NotBlank @Pattern(regexp="PENDING|IN_PREPARATION|READY_FOR_DISPATCH") String status,
                                      @Size(max=1000) String notes){}
 public record HistoryResponse(String status,String note,Instant createdAt){}
 public record StatusRequest(@NotBlank String status,@Size(max=1000) String note){}
 public record PaymentResponse(String id,String provider,String providerOrderId,String status,BigDecimal amount,String currency,boolean signatureVerified){}
 public record PaymentOrderResponse(PaymentResponse payment,String keyId){}
 public record PaymentVerificationRequest(@NotBlank String providerOrderId,@NotBlank String providerPaymentId,@NotBlank String signature){}
 public record PaymentFailureRequest(@NotBlank String providerOrderId,String providerPaymentId){}
}
