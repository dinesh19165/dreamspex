package com.dreamspex.order;

import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.admin.Store;
import com.dreamspex.catalog.entity.Coupon;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.CouponRepository;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.catalog.service.CouponService;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.auth.dto.*; import com.dreamspex.auth.entity.*; import com.dreamspex.auth.repository.*; import com.dreamspex.auth.service.*; import com.dreamspex.auth.controller.*; import com.dreamspex.catalog.dto.*; import com.dreamspex.catalog.entity.*; import com.dreamspex.catalog.repository.*; import com.dreamspex.catalog.service.*; import com.dreamspex.catalog.controller.*; import com.dreamspex.common.ApiException; import com.dreamspex.config.ShippingProperties; import com.dreamspex.membership.Membership; import com.dreamspex.membership.MembershipRepository; import com.dreamspex.notification.NotificationService; import com.dreamspex.prescription.*; import com.dreamspex.security.CurrentUser; import com.dreamspex.shopping.entity.*; import com.dreamspex.shopping.repository.*; import com.dreamspex.shopping.service.*; import com.dreamspex.shopping.controller.*;
import com.dreamspex.gst.GstCalculationService; import com.dreamspex.gst.GstConfiguration; import com.dreamspex.gst.GstConfigurationRepository; import com.dreamspex.gst.GstPriceTreatment;
import com.dreamspex.franchise.FranchiseService;
import com.fasterxml.jackson.core.JsonProcessingException; import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired; import org.springframework.boot.context.properties.EnableConfigurationProperties; import org.springframework.http.HttpStatus; import org.springframework.stereotype.Service; import org.springframework.transaction.annotation.Transactional;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.data.domain.PageRequest;
import java.io.IOException; import java.io.InputStream; import java.math.*; import java.time.Instant; import java.util.*; import static com.dreamspex.order.OrderDtos.*;
import static com.dreamspex.catalog.dto.CatalogDtos.*;

@Service
public class OrderService {
 @Autowired(required=false) private FranchiseService franchiseService;
 private final CurrentUser current; private final AddressRepository addresses; private final CartRepository carts; private final ProductVariantRepository variants; private final OrderRepository orders; private final CouponRepository coupons; private final CouponService couponService; private final MembershipRepository memberships; private final ObjectMapper mapper; private final NotificationService notifications; private final ShippingProperties shipping; private final LensOptionRepository lensOptions; private final PrescriptionFileRepository prescriptionFiles; private final PrescriptionStorage prescriptionStorage; private final DeliveryAvailabilityService deliveryAvailability; private final GstConfigurationRepository gstConfigurations; private final GstCalculationService gstCalculation;
 public OrderService(CurrentUser c,AddressRepository a,CartRepository carts,ProductVariantRepository v,OrderRepository o,CouponRepository coupons,CouponService couponService,MembershipRepository memberships,ObjectMapper mapper,NotificationService n,ShippingProperties shipping,LensOptionRepository lensOptions,PrescriptionFileRepository prescriptionFiles,PrescriptionStorage prescriptionStorage,DeliveryAvailabilityService deliveryAvailability,GstConfigurationRepository gstConfigurations,GstCalculationService gstCalculation){current=c;addresses=a;this.carts=carts;variants=v;orders=o;this.coupons=coupons;this.couponService=couponService;this.memberships=memberships;this.mapper=mapper;notifications=n;this.shipping=shipping;this.lensOptions=lensOptions;this.prescriptionFiles=prescriptionFiles;this.prescriptionStorage=prescriptionStorage;this.deliveryAvailability=deliveryAvailability;this.gstConfigurations=gstConfigurations;this.gstCalculation=gstCalculation;}
 @Transactional(readOnly=true)
 public QuoteResponse quote(org.springframework.security.core.Authentication auth, CheckoutRequest request) {
     User user = current.require(auth);
     Cart cart = activeCart(user);
     String fulfillmentType = fulfillmentType(request);
     Address address = "PICKUP".equals(fulfillmentType) ? null : address(user, request.addressId());
     FranchiseService.StoreSelection selection = franchiseService == null ? null
             : franchiseService.selectFulfillmentStore(address, cart.getItems(), fulfillmentType,
                     request.franchiseId(), false);
     DeliveryAvailabilityService.Evaluation serviceability = selection == null
             ? ("PICKUP".equals(fulfillmentType)
                     ? new DeliveryAvailabilityService.Evaluation(false, "FRANCHISE_REQUIRED", null, null, null,
                             "Select an active franchise for store pickup.")
                     : deliveryAvailability.evaluate(address, request.franchiseId()))
             : new DeliveryAvailabilityService.Evaluation(selection.available(), selection.status(),
                     selection.store(), selection.distanceKm(), selection.radiusKm(), selection.message());
     String couponCode = normalizeCouponCode(request.couponCode());
     Totals totals = totals(cart, couponCode, user, false, serviceability.store(),
             "PICKUP".equals(fulfillmentType), selection != null);
     GstOrderSnapshot gst = serviceability.store() == null ? null
             : gstSnapshot(cart, totals, serviceability.store().getState(),
                     address == null ? serviceability.store().getState() : address.getState());
     return new QuoteResponse(totals.subtotal, totals.discount, totals.couponDiscount, totals.membershipDiscount,
             totals.shipping, totals.total, couponCode, availability(serviceability), gst);
 }

 @Transactional
 public OrderResponse create(org.springframework.security.core.Authentication auth, CheckoutRequest request, String key) {
     if (key == null || key.isBlank() || key.length() > 120) {
         throw new ApiException(HttpStatus.BAD_REQUEST, "IDEMPOTENCY_KEY_REQUIRED", "A valid Idempotency-Key is required.");
     }
     User user = current.require(auth);
     Optional<Order> existing = orders.findByUserIdAndIdempotencyKey(user.getId(), key);
     if (existing.isPresent()) return response(existing.get());
     Cart cart = activeCart(user);
     String fulfillmentType = fulfillmentType(request);
     Address address = "PICKUP".equals(fulfillmentType) ? null : address(user, request.addressId());
     FranchiseService.StoreSelection selection = franchiseService == null ? null
             : franchiseService.selectFulfillmentStore(address, cart.getItems(), fulfillmentType,
                     request.franchiseId(), true);
     DeliveryAvailabilityService.Evaluation serviceability = selection == null
             ? ("PICKUP".equals(fulfillmentType)
                     ? new DeliveryAvailabilityService.Evaluation(false, "FRANCHISE_REQUIRED", null, null, null,
                             "Select an active franchise for store pickup.")
                     : deliveryAvailability.evaluate(address, request.franchiseId()))
             : new DeliveryAvailabilityService.Evaluation(selection.available(), selection.status(),
                     selection.store(), selection.distanceKm(), selection.radiusKm(), selection.message());
     if (!serviceability.available()) throw serviceabilityError(serviceability.status(), serviceability.message());
     String couponCode = normalizeCouponCode(request.couponCode());
     Totals totals = totals(cart, couponCode, user, true, serviceability.store(),
             "PICKUP".equals(fulfillmentType), selection != null);
     GstOrderSnapshot gst = gstSnapshot(cart, totals, serviceability.store().getState(),
             address == null ? serviceability.store().getState() : address.getState());
     boolean franchiseManaged = serviceability.store().isFranchiseManaged();
     Order order = new Order();
     order.setUser(user);
     order.setFulfillmentStore(serviceability.store());
     order.setFulfillmentType(fulfillmentType);
     order.setReservationExpiresAt(Instant.now().plusSeconds(30 * 60));
     order.setAddressId(address == null ? null : address.getId());
     order.setAddressSnapshot(address == null ? null : snapshot(address));
     order.setGstSnapshot(writeGstSnapshot(gst));
     order.setIdempotencyKey(key);
     order.setOrderNumber("DS-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase());
     order.setSubtotal(totals.subtotal);
     order.setDiscountAmount(totals.discount);
     order.setMembershipDiscountAmount(totals.membershipDiscount);
     order.setShippingAmount(totals.shipping);
     order.setTotalAmount(totals.total);
     order.setCouponCode(couponCode);
     for (CartItem item : cart.getItems()) {
         ProductVariant variant = variants.findWithLockByIdAndStatus(item.getVariant().getId(), "ACTIVE")
                 .filter(value -> "PUBLISHED".equals(value.getProduct().getStatus()))
                 .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "STOCK_UNAVAILABLE", "Product stock changed."));
         if (!franchiseManaged && variant.getAvailableQuantity() < item.getQuantity()) {
             throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Requested stock is unavailable.");
         }
         if (!franchiseManaged) variant.setReservedQuantity(variant.getReservedQuantity() + item.getQuantity());
         OrderItem orderItem = new OrderItem();
         orderItem.setOrder(order);
         orderItem.setVariant(variant);
         orderItem.setProductNameSnapshot(variant.getProduct().getName());
         orderItem.setSkuSnapshot(variant.getSku());
         orderItem.setUnitPrice(item.getUnitPriceSnapshot());
         orderItem.setLensAdditionalPrice(item.getLensAdditionalPrice());
         orderItem.setLensPreparationDays(lensPreparationDays(item));
         orderItem.setSelectedLensCodes(item.getSelectedLensCodes());
         orderItem.setPrescription(item.getPrescription());
         orderItem.setQuantity(item.getQuantity());
         orderItem.setLineTotal(orderItem.getUnitPrice().multiply(BigDecimal.valueOf(item.getQuantity())));
         order.getItems().add(orderItem);
     }
     addHistory(order, "PENDING_PAYMENT", null, user);
     Order saved = orders.save(order);
     if (franchiseService != null) franchiseService.reserveOrder(saved);
     for (CartItem item : cart.getItems()) {
         if (item.getPrescription() != null) item.getPrescription().setOrder(saved);
     }
     cart.getItems().clear();
     notifications.create(user, "ORDER_CREATED", "Order created", "Your order " + saved.getOrderNumber() + " was created.");
     notifications.enqueueSms("order:" + saved.getId() + ":ORDER_PLACED", "ORDER_PLACED",
             saved, Map.of("VAR1", saved.getOrderNumber()));
     return response(saved);
 }
 @Transactional(readOnly=true) public List<OrderResponse> customerOrders(org.springframework.security.core.Authentication a){return orders.findByUserIdOrderByCreatedAtDesc(current.require(a).getId()).stream().map(this::response).toList();}
 @Transactional(readOnly=true) public OrderResponse customerOrder(org.springframework.security.core.Authentication a,String id){return response(orders.findByIdAndUserId(id,current.require(a).getId()).orElseThrow(()->notFound()));}
 @Transactional
 public OrderResponse cancel(org.springframework.security.core.Authentication authentication, String id) {
     User user = current.require(authentication);
     Order order = orders.findByIdAndUserId(id, user.getId()).orElseThrow(this::notFound);
     if (!Set.of("PENDING_PAYMENT", "PAID", "PROCESSING").contains(order.getStatus())) {
         throw new ApiException(HttpStatus.CONFLICT, "ORDER_NOT_CANCELLABLE", "Order cannot be cancelled.");
     }
     order.setStatus("CANCELLED");
     addHistory(order, "CANCELLED", "Customer cancellation", user);
     if (!isFranchiseManaged(order)) {
         for (OrderItem item : order.getItems()) {
             ProductVariant variant = variants.findWithLockByIdAndStatus(item.getVariant().getId(), "ACTIVE").orElse(null);
             if (variant != null) variant.setReservedQuantity(Math.max(0, variant.getReservedQuantity() - item.getQuantity()));
         }
     }
     if (franchiseService != null) franchiseService.releaseOrder(order, true);
     notifications.create(user, "ORDER_CANCELLED", "Order cancelled", "Your order " + order.getOrderNumber() + " was cancelled.");
     notifications.enqueueSms("order:" + order.getId() + ":ORDER_CANCELLED", "ORDER_CANCELLED",
             order, Map.of("VAR1", order.getOrderNumber()));
     return response(order);
 }

 @Scheduled(fixedDelayString = "${DREAMSPEX_ORDER_RESERVATION_EXPIRY_POLL_MS:60000}")
 @Transactional
 public void expirePendingReservations() {
     for (Order order : orders.findExpiredReservationsForUpdate(Instant.now(), PageRequest.of(0, 100))) {
         order.setStatus("CANCELLED");
         order.setPaymentStatus("EXPIRED");
         order.setReservationExpiresAt(null);
         addHistory(order, "CANCELLED", "Payment reservation expired.", order.getUser());
         if (franchiseService != null) franchiseService.releaseOrder(order, false);
         if (!isFranchiseManaged(order)) {
             for (OrderItem item : order.getItems()) {
                 ProductVariant variant = variants.findWithLockByIdAndStatus(item.getVariant().getId(), "ACTIVE")
                         .orElse(null);
                 if (variant != null) {
                     variant.setReservedQuantity(Math.max(0, variant.getReservedQuantity() - item.getQuantity()));
                 }
             }
         }
         notifications.create(order.getUser(), "ORDER_CANCELLED", "Order expired",
                 "Your order " + order.getOrderNumber() + " expired because payment was not completed.");
         notifications.enqueueSms("order:" + order.getId() + ":ORDER_EXPIRED", "ORDER_CANCELLED",
                 order, Map.of("VAR1", order.getOrderNumber()));
     }
 }
 @Transactional(readOnly=true) public List<AdminOrderResponse> adminOrders(){return orders.findAllByOrderByCreatedAtDesc().stream().map(order->adminResponse(order,false)).toList();}
 @Transactional(readOnly=true) public AdminOrderResponse adminOrder(String id){return adminResponse(orders.findById(id).orElseThrow(this::notFound),true);}
 @Transactional public LensPreparationDetails updateLensPreparation(org.springframework.security.core.Authentication auth,String orderId,String itemId,LensPreparationRequest request){User admin=current.require(auth);OrderItem item=orderItem(orderId,itemId);if(item.getPrescription()==null||item.getSelectedLensCodes()==null||item.getSelectedLensCodes().isBlank())throw new ApiException(HttpStatus.CONFLICT,"LENS_PREPARATION_NOT_APPLICABLE","This order item has no prescription lens configuration.");item.setLensPreparationStatus(request.status());item.setLensPreparationNotes(request.notes()==null||request.notes().isBlank()?null:request.notes().trim());item.setLensPreparationUpdatedBy(admin);item.setLensPreparationUpdatedAt(Instant.now());return lensPreparation(item);}
 @Transactional(readOnly=true) public PrescriptionFile adminPrescriptionFile(String orderId,String itemId,String fileId){OrderItem item=orderItem(orderId,itemId);Prescription prescription=requiredPrescription(item);return prescriptionFiles.findByIdAndPrescriptionId(fileId,prescription.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"FILE_NOT_FOUND","Prescription file was not found for this order item."));}
 @Transactional(readOnly=true) public InputStream downloadAdminPrescription(String orderId,String itemId,String fileId)throws IOException{return prescriptionStorage.load(adminPrescriptionFile(orderId,itemId,fileId).getStorageKey());}
 @Transactional(readOnly=true) public PrescriptionSummaryPdfFile adminPrescriptionSummary(String orderId,String itemId){Order order=orders.findById(orderId).orElseThrow(this::notFound);OrderItem item=order.getItems().stream().filter(candidate->candidate.getId().equals(itemId)).findFirst().orElseThrow(this::notFound);Prescription prescription=requiredPrescription(item);if(!"MANUAL".equals(prescription.getSource()))throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_SUMMARY_NOT_APPLICABLE","A generated summary is only available for manually entered prescriptions.");return new PrescriptionSummaryPdfFile(order.getOrderNumber(),PrescriptionSummaryPdf.generate(order.getOrderNumber(),prescription,selectedLenses(item),item.getLensAdditionalPrice(),item.getLensPreparationDays()));}
 public record PrescriptionSummaryPdfFile(String orderNumber,byte[] content){}
 @Transactional public OrderResponse adminStatus(org.springframework.security.core.Authentication a,String id,StatusRequest r){
  User admin=current.require(a);
  Order order=orders.findById(id).orElseThrow(()->notFound());
  if(!Set.of("PENDING_PAYMENT","PAID","PROCESSING","SHIPPED","DELIVERED","READY_FOR_PICKUP","PICKED_UP","CANCELLED").contains(r.status()))
   throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_ORDER_STATUS","Invalid order status.");
  if(r.status().equals(order.getStatus()))return response(order);
  if(!OrderWorkflow.canTransition(order.getStatus(),r.status(),order.getFulfillmentType()))
   throw new ApiException(HttpStatus.CONFLICT,"INVALID_ORDER_TRANSITION","Order status cannot move from "+order.getStatus()+" to "+r.status()+" for this fulfillment type.");
  order.setStatus(r.status());
  addHistory(order,r.status(),r.note(),admin);
  if("CANCELLED".equals(r.status())&&franchiseService!=null)franchiseService.releaseOrder(order,true);
  notifications.create(order.getUser(),"ORDER_STATUS","Order status updated",
   "Your order "+order.getOrderNumber()+" is now "+r.status().toLowerCase(Locale.ROOT).replace('_',' ')+".");
  String smsType=switch(r.status()){case "PROCESSING"->"ORDER_CONFIRMED";case "SHIPPED"->"ORDER_SHIPPED";case "DELIVERED"->"ORDER_DELIVERED";case "CANCELLED"->"ORDER_CANCELLED";default->null;};
  if(smsType!=null)notifications.enqueueSms("order:"+order.getId()+":"+smsType,smsType,order,Map.of("VAR1",order.getOrderNumber()));
  return response(order);
 }
 private Address address(User u,String id){return addresses.findByIdAndUserIdAndDeletedAtIsNull(id,u.getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"ADDRESS_NOT_FOUND","Address was not found."));}
 private GstOrderSnapshot gstSnapshot(Cart cart,Totals totals,String sellerState,String deliveryState){
  GstConfiguration configuration=gstConfigurations.findFirstByActiveTrueOrderByUpdatedAtDesc().orElseThrow(()->new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"GST_CONFIGURATION_MISSING","GST configuration is unavailable."));
  if(configuration.isEnabled()&&configuration.getPriceTreatment()!=GstPriceTreatment.INCLUSIVE)throw new ApiException(HttpStatus.CONFLICT,"EXCLUSIVE_GST_NOT_ENABLED","Checkout supports inclusive GST only.");
  List<GstOrderSnapshot.GstLineSnapshot> lines=new ArrayList<>();
  BigDecimal taxable=BigDecimal.ZERO.setScale(2),gst=BigDecimal.ZERO.setScale(2),cgst=BigDecimal.ZERO.setScale(2),sgst=BigDecimal.ZERO.setScale(2),igst=BigDecimal.ZERO.setScale(2);
  BigDecimal allocatedDiscount=BigDecimal.ZERO.setScale(2),observedRate=null;boolean singleRate=true;
  List<CartItem> cartItems=cart.getItems();
  for(int index=0;index<cartItems.size();index++){
   CartItem item=cartItems.get(index);Product product=item.getVariant().getProduct();
   BigDecimal gross=item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())).setScale(2,java.math.RoundingMode.HALF_UP);
   BigDecimal discountShare=index==cartItems.size()-1?totals.discount.subtract(allocatedDiscount):totals.discount.multiply(gross).divide(totals.subtotal,2,java.math.RoundingMode.HALF_UP);
   allocatedDiscount=allocatedDiscount.add(discountShare);
   BigDecimal discountedGross=gross.subtract(discountShare);
   BigDecimal rate=gstCalculation.effectiveRate(product.getGstRate(),product.isGstEnabled(),configuration);
   var calculation=gstCalculation.calculate(discountedGross,rate,GstPriceTreatment.INCLUSIVE,sellerState,deliveryState);
   taxable=taxable.add(calculation.taxableAmount());gst=gst.add(calculation.gstAmount());cgst=cgst.add(calculation.cgstAmount());sgst=sgst.add(calculation.sgstAmount());igst=igst.add(calculation.igstAmount());
   if(observedRate==null)observedRate=rate;else if(observedRate.compareTo(rate)!=0)singleRate=false;
   lines.add(new GstOrderSnapshot.GstLineSnapshot(product.getId(),product.getName(),product.getHsnCode(),rate,calculation.taxableAmount(),calculation.gstAmount(),calculation.cgstAmount(),calculation.sgstAmount(),calculation.igstAmount(),discountedGross));
  }
  return new GstOrderSnapshot(taxable,gst,cgst,sgst,igst,totals.total,singleRate?observedRate:null,GstPriceTreatment.INCLUSIVE,List.copyOf(lines));
 }
 private String writeGstSnapshot(GstOrderSnapshot value){try{return mapper.writeValueAsString(value);}catch(JsonProcessingException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"GST_SNAPSHOT_ERROR","GST breakdown could not be saved.");}}
 private GstOrderSnapshot gstSnapshot(Order order){if(order.getGstSnapshot()==null||order.getGstSnapshot().isBlank())return null;try{return mapper.readValue(order.getGstSnapshot(),GstOrderSnapshot.class);}catch(JsonProcessingException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"GST_SNAPSHOT_ERROR","Saved GST breakdown could not be read.");}}
 private Cart activeCart(User u){return carts.findByUserIdAndStatus(u.getId(),"ACTIVE").orElseThrow(()->new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"CART_EMPTY","Cart is empty."));}
 private String normalizeCouponCode(String code){return code==null||code.isBlank()?null:code.trim().toUpperCase(Locale.ROOT);}
 private Totals totals(Cart cart, String code, User user, boolean lockCoupon, com.dreamspex.admin.Store store,
                       boolean pickup, boolean franchiseCheckout) {
     if (cart.getItems().isEmpty()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "CART_EMPTY", "Cart is empty.");
     boolean franchiseManaged = franchiseCheckout || (store != null && store.isFranchiseManaged());
     BigDecimal subtotal = BigDecimal.ZERO;
     for (CartItem item : cart.getItems()) {
         ProductVariant variant = variants.findByIdAndStatus(item.getVariant().getId(), "ACTIVE")
                 .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT, "STOCK_UNAVAILABLE", "Product is unavailable."));
         if (!franchiseManaged && variant.getAvailableQuantity() < item.getQuantity()) {
             throw new ApiException(HttpStatus.CONFLICT, "INSUFFICIENT_STOCK", "Requested stock is unavailable.");
         }
         validatePrescriptionConfiguration(item);
         subtotal = subtotal.add(item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())));
     }
     BigDecimal couponDiscount = BigDecimal.ZERO;
     BigDecimal membershipDiscount = BigDecimal.ZERO;
     if (code != null && !code.isBlank()) {
         Coupon coupon = (lockCoupon ? coupons.findWithLockByCodeAndStatus(code, "ACTIVE")
                 : coupons.findByCodeIgnoreCaseAndStatus(code, "ACTIVE"))
                 .orElseThrow(() -> new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_COUPON", "Coupon is invalid."));
         couponDiscount = couponService.discountForCart(coupon, user, cart);
     } else {
         membershipDiscount = membershipDiscount(user, subtotal);
     }
     BigDecimal discount = couponDiscount.add(membershipDiscount);
     BigDecimal net = subtotal.subtract(discount);
     BigDecimal shippingAmount = pickup || net.compareTo(shipping.freeThreshold()) >= 0
             ? BigDecimal.ZERO : shipping.charge();
     return new Totals(subtotal, discount, couponDiscount, membershipDiscount, shippingAmount, net.add(shippingAmount));
 }

 private boolean isFranchiseManaged(Order order) {
     return order.getFulfillmentStore() != null && order.getFulfillmentStore().isFranchiseManaged();
 }
 private BigDecimal membershipDiscount(User user,BigDecimal subtotal){return memberships.findFirstByUserIdAndStatusOrderByExpiresAtDesc(user.getId(),"ACTIVE").filter(membership->!membership.getStartsAt().isAfter(Instant.now())&&membership.getExpiresAt().isAfter(Instant.now())).map(Membership::getPlan).map(plan->plan.getDiscountPercentage()==null?BigDecimal.ZERO:subtotal.multiply(plan.getDiscountPercentage()).divide(BigDecimal.valueOf(100),2,java.math.RoundingMode.DOWN)).orElse(BigDecimal.ZERO);}
 private void validatePrescriptionConfiguration(CartItem item){Prescription prescription=item.getPrescription();List<String> codes=item.getSelectedLensCodes()==null||item.getSelectedLensCodes().isBlank()?List.of():Arrays.stream(item.getSelectedLensCodes().split(",")).map(String::trim).map(String::toUpperCase).distinct().sorted().toList();if(prescription==null){if(!codes.isEmpty()||item.getLensAdditionalPrice().signum()!=0)throw new ApiException(HttpStatus.CONFLICT,"INVALID_CART_LENS_CONFIGURATION","Cart lens configuration is invalid.");return;}if(!prescription.isCustomerConfirmed()||prescription.getUser()==null||!prescription.getUser().getId().equals(item.getCart().getUser().getId())||prescription.getProduct()==null||!prescription.getProduct().getId().equals(item.getVariant().getProduct().getId()))throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_CONFIGURATION_INVALID","Prescription is no longer valid for this frame.");List<String> saved=prescription.getSelectedLensCodes()==null||prescription.getSelectedLensCodes().isBlank()?List.of():Arrays.stream(prescription.getSelectedLensCodes().split(",")).map(String::trim).map(String::toUpperCase).distinct().sorted().toList();if(codes.isEmpty()||!codes.equals(saved))throw new ApiException(HttpStatus.CONFLICT,"LENS_SELECTION_MISMATCH","Prescription lens selection changed. Please update your cart.");List<LensOption> options=codes.stream().map(code->lensOptions.findByCode(code).filter(option->option.isAvailable()&&option.getAdditionalCost()!=null&&option.getAdditionalCost().signum()>=0).orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"LENS_UNAVAILABLE","A selected lens option is no longer available."))).toList();if(options.stream().filter(option->"TYPE".equals(option.getCategory())).count()!=1)throw new ApiException(HttpStatus.CONFLICT,"INVALID_LENS_SELECTION","Choose exactly one available lens type.");BigDecimal currentCost=options.stream().map(LensOption::getAdditionalCost).reduce(BigDecimal.ZERO,BigDecimal::add);if(currentCost.compareTo(item.getLensAdditionalPrice())!=0)throw new ApiException(HttpStatus.CONFLICT,"LENS_PRICE_CHANGED","Lens pricing changed. Please select lenses again.");}
 private String snapshot(Address a){try{Map<String,Object> value=new LinkedHashMap<>();value.put("recipientName",a.getRecipientName());value.put("phone",a.getPhone());value.put("line1",a.getLine1());value.put("line2",a.getLine2()==null?"":a.getLine2());value.put("city",a.getCity());value.put("state",a.getState());value.put("postalCode",a.getPostalCode());value.put("countryCode",a.getCountryCode());if(a.getLatitude()!=null&&a.getLongitude()!=null){value.put("latitude",a.getLatitude());value.put("longitude",a.getLongitude());}return mapper.writeValueAsString(value);}catch(JsonProcessingException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"ADDRESS_SNAPSHOT_ERROR","Address could not be saved.");}}
 private void addHistory(Order o,String status,String note,User user){OrderStatusHistory h=new OrderStatusHistory();h.setOrder(o);h.setStatus(status);h.setNote(note);h.setChangedBy(user);o.getHistory().add(h);}
 private ApiException notFound(){return new ApiException(HttpStatus.NOT_FOUND,"ORDER_NOT_FOUND","Order was not found.");}
 private OrderResponse response(Order o){
  BigDecimal membershipDiscount=o.getMembershipDiscountAmount()==null?BigDecimal.ZERO:o.getMembershipDiscountAmount();
  BigDecimal loyaltyDiscount=o.getLoyaltyDiscountAmount()==null?BigDecimal.ZERO:o.getLoyaltyDiscountAmount();
  Store store=o.getFulfillmentStore();
  return new OrderResponse(o.getId(),o.getOrderNumber(),o.getStatus(),o.getPaymentStatus(),o.getSubtotal(),o.getDiscountAmount(),
   o.getDiscountAmount().subtract(membershipDiscount),membershipDiscount,o.getShippingAmount(),o.getTotalAmount(),o.getCouponCode(),
   o.getCreatedAt(),items(o),history(o),gstSnapshot(o),o.getLoyaltyPointsRedeemed(),loyaltyDiscount,o.getFulfillmentType(),
   store==null?null:store.getId(),fulfillmentStore(store));
 }
 private FulfillmentStoreResponse fulfillmentStore(Store store){
  return store==null?null:new FulfillmentStoreResponse(store.getId(),store.getName(),store.getPhone(),store.getAddress(),
   store.getCity(),store.getState(),store.getPostalCode());
 }
 private AdminOrderResponse adminResponse(Order o,boolean includePrescriptionDetails){BigDecimal membershipDiscount=o.getMembershipDiscountAmount()==null?BigDecimal.ZERO:o.getMembershipDiscountAmount();BigDecimal loyaltyDiscount=o.getLoyaltyDiscountAmount()==null?BigDecimal.ZERO:o.getLoyaltyDiscountAmount();Store store=o.getFulfillmentStore();FulfillmentStoreResponse fulfillmentStore=fulfillmentStore(store);return new AdminOrderResponse(o.getId(),o.getOrderNumber(),o.getStatus(),o.getPaymentStatus(),o.getSubtotal(),o.getDiscountAmount(),o.getDiscountAmount().subtract(membershipDiscount),membershipDiscount,o.getShippingAmount(),o.getTotalAmount(),o.getCouponCode(),o.getCreatedAt(),new CustomerResponse(o.getUser().getId(),o.getUser().getDisplayName(),o.getUser().getEmail(),o.getUser().getPhone()),shippingAddress(o.getAddressSnapshot()),o.getFulfillmentType(),store==null?null:store.getId(),fulfillmentStore,adminItems(o,includePrescriptionDetails),history(o),gstSnapshot(o),o.getLoyaltyPointsRedeemed(),loyaltyDiscount);}
 private ShippingAddressResponse shippingAddress(String snapshot){if(snapshot==null||snapshot.isBlank())return null;try{var json=mapper.readTree(snapshot);return new ShippingAddressResponse(text(json,"recipientName"),text(json,"phone"),text(json,"line1"),text(json,"line2"),text(json,"city"),text(json,"state"),text(json,"postalCode"),text(json,"countryCode"));}catch(JsonProcessingException e){throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR,"ADDRESS_SNAPSHOT_ERROR","Order address could not be read.");}}
 private String text(com.fasterxml.jackson.databind.JsonNode json,String field){return json.path(field).isNull()?null:json.path(field).asText(null);}
 private List<ItemResponse> items(Order o){return o.getItems().stream().map(i->new ItemResponse(i.getId(),i.getProductNameSnapshot(),i.getSkuSnapshot(),i.getUnitPrice(),i.getQuantity(),i.getLineTotal(),i.getPrescription()==null||i.getSelectedLensCodes()==null||i.getSelectedLensCodes().isBlank()?null:new LensPreparationProgress(i.getLensPreparationStatus(),i.getLensPreparationUpdatedAt()))).toList();}
 private List<AdminOrderItemResponse> adminItems(Order order,boolean includePrescriptionDetails){return order.getItems().stream().map(item->{Prescription prescription=includePrescriptionDetails?item.getPrescription():null;return new AdminOrderItemResponse(item.getId(),item.getProductNameSnapshot(),item.getSkuSnapshot(),item.getUnitPrice(),item.getQuantity(),item.getLineTotal(),item.getLensAdditionalPrice(),lensCodes(item),prescription==null?null:prescriptionDetails(item,prescription),item.getPrescription()==null?null:lensPreparation(item));}).toList();}
 private AdminPrescriptionDetails prescriptionDetails(OrderItem item,Prescription prescription){List<SelectedLensOption> lenses=selectedLenses(item);List<PrescriptionFileDetails> files=prescriptionFiles.findByPrescriptionId(prescription.getId()).stream().map(file->new PrescriptionFileDetails(file.getId(),file.getOriginalName(),file.getContentType(),file.getSizeBytes())).toList();return new AdminPrescriptionDetails(prescription.getId(),prescription.getPatientName(),prescription.getPrescriptionDate(),prescription.getExpiryDate(),prescription.getRightSph(),prescription.getRightCyl(),prescription.getRightAxis(),prescription.getRightAdd(),prescription.getLeftSph(),prescription.getLeftCyl(),prescription.getLeftAxis(),prescription.getLeftAdd(),prescription.getPd(),prescription.getRightPd(),prescription.getLeftPd(),prescription.getSource(),files,lenses,item.getLensPreparationDays());}
 private List<SelectedLensOption> selectedLenses(OrderItem item){return lensCodes(item).stream().map(code->lensOptions.findByCode(code).map(option->new SelectedLensOption(code,option.getName(),option.getCategory(),option.getPreparationDays())).orElseGet(()->new SelectedLensOption(code,code.replace('_',' '),null,null))).toList();}
 private List<String> lensCodes(OrderItem item){return item.getSelectedLensCodes()==null||item.getSelectedLensCodes().isBlank()?List.of():Arrays.stream(item.getSelectedLensCodes().split(",")).map(String::trim).filter(code->!code.isBlank()).distinct().toList();}
 private Integer lensPreparationDays(CartItem item){return (item.getSelectedLensCodes()==null||item.getSelectedLensCodes().isBlank()?List.<String>of():Arrays.stream(item.getSelectedLensCodes().split(",")).map(String::trim).filter(code->!code.isBlank()).toList()).stream().map(lensOptions::findByCode).flatMap(Optional::stream).map(LensOption::getPreparationDays).filter(Objects::nonNull).max(Integer::compareTo).orElse(null);}
 private LensPreparationDetails lensPreparation(OrderItem item){return new LensPreparationDetails(item.getLensPreparationStatus(),item.getLensPreparationNotes(),item.getLensPreparationUpdatedBy()==null?null:item.getLensPreparationUpdatedBy().getDisplayName(),item.getLensPreparationUpdatedAt());}
 private OrderItem orderItem(String orderId,String itemId){Order order=orders.findById(orderId).orElseThrow(this::notFound);return order.getItems().stream().filter(item->item.getId().equals(itemId)).findFirst().orElseThrow(this::notFound);}
 private Prescription requiredPrescription(OrderItem item){if(item.getPrescription()==null)throw new ApiException(HttpStatus.NOT_FOUND,"PRESCRIPTION_NOT_FOUND","This order item has no prescription.");return item.getPrescription();}
 private DeliveryAvailability availability(DeliveryAvailabilityService.Evaluation result){return new DeliveryAvailability(result.available(),result.status(),result.distanceKm(),result.radiusKm(),result.store()==null?null:result.store().getName(),result.message());}
 private String fulfillmentType(CheckoutRequest request) {
     if (request.fulfillmentType() == null || request.fulfillmentType().isBlank()) return "DELIVERY";
     return switch (request.fulfillmentType()) {
         case "DELIVERY", "HOME_DELIVERY" -> "DELIVERY";
         case "PICKUP", "STORE_PICKUP" -> "PICKUP";
         default -> throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_FULFILLMENT_TYPE",
                 "Fulfillment type must be home delivery or store pickup.");
     };
 }
 private ApiException serviceabilityError(String status,String message){return switch(status){case "LOCATION_REQUIRED"->new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"DELIVERY_LOCATION_REQUIRED",message);case "STORE_CONFIGURATION_REQUIRED"->new ApiException(HttpStatus.SERVICE_UNAVAILABLE,"DELIVERY_CONFIGURATION_UNAVAILABLE",message);case "FRANCHISE_REQUIRED"->new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"FRANCHISE_REQUIRED",message);case "FRANCHISE_STOCK_UNAVAILABLE"->new ApiException(HttpStatus.CONFLICT,"FRANCHISE_STOCK_UNAVAILABLE",message);case "FRANCHISE_UNAVAILABLE"->new ApiException(HttpStatus.CONFLICT,"FRANCHISE_UNAVAILABLE",message);default->new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"DELIVERY_OUTSIDE_AREA",message);};}
 private List<HistoryResponse> history(Order o){return o.getHistory().stream().map(h->new HistoryResponse(h.getStatus(),h.getNote(),h.getCreatedAt())).sorted(Comparator.comparing(HistoryResponse::createdAt)).toList();}
 private record Totals(BigDecimal subtotal,BigDecimal discount,BigDecimal couponDiscount,BigDecimal membershipDiscount,BigDecimal shipping,BigDecimal total){}
}
