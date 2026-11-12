package com.dreamspex.shopping.service;
import static com.dreamspex.catalog.dto.CatalogDtos.*;

import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.ProductImage;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.entity.WishlistItem;
import com.dreamspex.shopping.repository.CartItemRepository;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.shopping.repository.WishlistRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.franchise.FranchiseService;
import com.dreamspex.prescription.LensOption;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.prescription.Prescription;
import com.dreamspex.prescription.PrescriptionRepository;
import com.dreamspex.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Autowired;

@Service
public class ShoppingService {
    @Autowired(required = false)
    private FranchiseService franchiseService;
    private final CurrentUser current;
    private final CartRepository carts;
    private final CartItemRepository items;
    private final WishlistRepository wishlists;
    private final ProductVariantRepository variants;
    private final PrescriptionRepository prescriptions;
    private final LensOptionRepository lensOptions;

    public ShoppingService(CurrentUser current, CartRepository carts, CartItemRepository items,
                           WishlistRepository wishlists, ProductVariantRepository variants,
                           PrescriptionRepository prescriptions, LensOptionRepository lensOptions) {
        this.current=current; this.carts=carts; this.items=items; this.wishlists=wishlists;
        this.variants=variants; this.prescriptions=prescriptions; this.lensOptions=lensOptions;
    }

    @Transactional
    public CartResponse cart(org.springframework.security.core.Authentication auth) {
        return cart(auth, null);
    }

    @Transactional
    public CartResponse cart(org.springframework.security.core.Authentication auth, String franchiseId) {
        return cartResponse(cartEntity(current.require(auth)), franchiseId);
    }

    @Transactional
    public CartResponse add(org.springframework.security.core.Authentication auth, CartItemRequest request) {
        User user=current.require(auth);
        Cart cart=cartEntity(user);
        ProductVariant variant=variants.findByIdAndStatus(request.variantId(),"ACTIVE")
                .filter(item -> "PUBLISHED".equals(item.getProduct().getStatus()))
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"VARIANT_NOT_FOUND","Variant was not found."));
        CartItem item=items.findByCartIdAndVariantId(cart.getId(),variant.getId()).orElse(null);
        if (item != null) {
            ensureConfigurationMatches(item, request);
        } else {
            item = new CartItem();
            item.setCart(cart);
            item.setVariant(variant);
            item.setLensAdditionalPrice(BigDecimal.ZERO);
            item.setUnitPriceSnapshot(variant.getProduct().getBasePrice().add(variant.getAdditionalPrice()));
        }
        if (request.prescriptionId()!=null) {
            configure(item,user,variant,request.prescriptionId(),request.selectedLensCodes());
        } else if (request.selectedLensCodes()!=null && !request.selectedLensCodes().isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"PRESCRIPTION_REQUIRED","Prescription data is required for a lens selection.");
        }
        int quantity=item.getQuantity()+request.quantity();
        if (request.franchiseId() != null && !request.franchiseId().isBlank()) {
            if (franchiseService == null) throw new IllegalStateException("Franchise inventory is unavailable.");
            franchiseService.validateStorefrontCartItem(request.franchiseId(), variant.getId(), quantity);
        } else if(quantity>variant.getAvailableQuantity()) {
            throw new ApiException(HttpStatus.CONFLICT,"INSUFFICIENT_STOCK","Requested quantity is unavailable.");
        }
        item.setQuantity(quantity);
        CartItem savedItem = items.save(item);
        String itemId = savedItem.getId();
        if (cart.getItems().stream().noneMatch(existing -> existing.getId().equals(itemId))) cart.getItems().add(savedItem);
        return cartResponse(cart, request.franchiseId());
    }

    @Transactional
    public CartResponse update(org.springframework.security.core.Authentication auth,String id,int quantity) {
        return update(auth, id, quantity, null);
    }

    @Transactional
    public CartResponse update(org.springframework.security.core.Authentication auth,String id,int quantity,String franchiseId) {
        User user=current.require(auth);
        CartItem item=items.findByIdAndCartUserId(id,user.getId())
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"CART_ITEM_NOT_FOUND","Cart item was not found."));
        int availableQuantity;
        if (franchiseId != null && !franchiseId.isBlank()) {
            if (franchiseService == null) throw new IllegalStateException("Franchise inventory is unavailable.");
            availableQuantity = franchiseService.storefrontAvailableQuantity(franchiseId, item.getVariant().getId());
        } else {
            availableQuantity = item.getVariant().getAvailableQuantity();
        }
        if(quantity<1||quantity>availableQuantity)
            throw new ApiException(HttpStatus.CONFLICT,"INSUFFICIENT_STOCK","Requested quantity is unavailable.");
        item.setQuantity(quantity);
        return cartResponse(item.getCart(), franchiseId);
    }

    @Transactional
    public void remove(org.springframework.security.core.Authentication auth,String id) {
        CartItem item=items.findByIdAndCartUserId(id,current.require(auth).getId())
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"CART_ITEM_NOT_FOUND","Cart item was not found."));
        items.delete(item);
    }

    @Transactional
    public List<WishlistResponse> wishlist(org.springframework.security.core.Authentication auth) {
        return wishlists.findByUserIdOrderByCreatedAtDesc(current.require(auth).getId()).stream().map(this::wish).toList();
    }

    @Transactional
    public WishlistResponse addWish(org.springframework.security.core.Authentication auth,WishlistRequest request) {
        User user=current.require(auth);
        ProductVariant variant=variants.findByIdAndStatus(request.variantId(),"ACTIVE")
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"VARIANT_NOT_FOUND","Variant was not found."));
        if(wishlists.findByUserIdAndVariantId(user.getId(),variant.getId()).isPresent())
            throw new ApiException(HttpStatus.CONFLICT,"WISHLIST_EXISTS","Variant is already in the wishlist.");
        WishlistItem item=new WishlistItem();item.setUser(user);item.setVariant(variant);
        return wish(wishlists.save(item));
    }

    @Transactional
    public void removeWish(org.springframework.security.core.Authentication auth,String variantId) {
        WishlistItem item=wishlists.findByUserIdAndVariantId(current.require(auth).getId(),variantId)
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"WISHLIST_ITEM_NOT_FOUND","Wishlist item was not found."));
        wishlists.delete(item);
    }

    private void configure(CartItem item, User user, ProductVariant variant, String prescriptionId, List<String> codes) {
        Prescription prescription=prescriptions.findByIdAndUserId(prescriptionId,user.getId())
                .filter(Prescription::isCustomerConfirmed)
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRESCRIPTION_NOT_FOUND","Confirmed prescription was not found."));
        if (prescription.getProduct()==null || !prescription.getProduct().getId().equals(variant.getProduct().getId()))
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"PRESCRIPTION_PRODUCT_MISMATCH","Prescription is not linked to this product.");
        List<String> normalized=codes==null?List.of():codes.stream().map(code->code.toUpperCase(Locale.ROOT)).distinct().toList();
        List<String> savedCodes=prescription.getSelectedLensCodes()==null || prescription.getSelectedLensCodes().isBlank()
                ? List.of() : Arrays.asList(prescription.getSelectedLensCodes().split(","));
        if (!savedCodes.containsAll(normalized) || normalized.size()!=savedCodes.size() || normalized.isEmpty())
            throw new ApiException(HttpStatus.CONFLICT,"LENS_SELECTION_MISMATCH","Select available lenses for this prescription before adding to cart.");
        List<LensOption> selected=normalized.stream().map(code->lensOptions.findByCode(code)
                .filter(option->option.isAvailable() && option.getAdditionalCost()!=null
                        && option.getAdditionalCost().signum()>=0)
                .orElseThrow(()->new ApiException(HttpStatus.CONFLICT,"LENS_UNAVAILABLE","One or more selected lens options are unavailable."))).toList();
        if (selected.stream().filter(option->"TYPE".equals(option.getCategory())).count()!=1)
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_LENS_SELECTION","Select exactly one lens type.");
        BigDecimal additional=selected.stream().map(LensOption::getAdditionalCost).reduce(BigDecimal.ZERO,BigDecimal::add);
        item.setPrescription(prescription);
        item.setSelectedLensCodes(String.join(",",normalized));
        item.setLensAdditionalPrice(additional);
        item.setUnitPriceSnapshot(variant.getProduct().getBasePrice().add(variant.getAdditionalPrice()).add(additional));
    }

    private void ensureConfigurationMatches(CartItem item, CartItemRequest request) {
        String currentPrescriptionId = item.getPrescription() == null ? null : item.getPrescription().getId();
        List<String> currentCodes = item.getSelectedLensCodes() == null || item.getSelectedLensCodes().isBlank()
                ? List.of() : Arrays.asList(item.getSelectedLensCodes().split(","));
        List<String> requestedCodes = request.selectedLensCodes() == null ? List.of()
                : request.selectedLensCodes().stream().map(code -> code.toUpperCase(Locale.ROOT)).sorted().toList();
        List<String> normalizedCurrentCodes = currentCodes.stream().map(code -> code.toUpperCase(Locale.ROOT)).sorted().toList();
        if (!Objects.equals(currentPrescriptionId, request.prescriptionId()) || !normalizedCurrentCodes.equals(requestedCodes)) {
            throw new ApiException(HttpStatus.CONFLICT,"CART_ITEM_CONFIGURATION_CONFLICT",
                    "This frame is already in your cart with a different prescription or lens selection. Remove it before adding another configuration.");
        }
    }

    private Cart cartEntity(User user) {
        return carts.findByUserIdAndStatus(user.getId(),"ACTIVE").orElseGet(()->{
            Cart cart=new Cart();cart.setUser(user);return carts.save(cart);
        });
    }

    private CartResponse cartResponse(Cart cart) {
        return cartResponse(cart, null);
    }

    private CartResponse cartResponse(Cart cart, String franchiseId) {
        List<CartItemResponse> values=cart.getItems().stream().map(item->{
            List<String> codes=item.getSelectedLensCodes()==null||item.getSelectedLensCodes().isBlank()
                    ?List.of():Arrays.asList(item.getSelectedLensCodes().split(","));
            String imageUrl=item.getVariant().getProduct().getImages().stream()
                    .filter(image->image.getVariant()==null||image.getVariant().getId().equals(item.getVariant().getId()))
                    .sorted(java.util.Comparator.comparing(com.dreamspex.catalog.entity.ProductImage::isPrimaryImage).reversed()
                            .thenComparingInt(com.dreamspex.catalog.entity.ProductImage::getSortOrder))
                    .map(com.dreamspex.catalog.entity.ProductImage::getImageUrl).findFirst().orElse(null);
            int availableQuantity = franchiseId == null || franchiseId.isBlank() || franchiseService == null
                    ? item.getVariant().getAvailableQuantity()
                    : franchiseService.storefrontAvailableQuantity(franchiseId, item.getVariant().getId());
            return new CartItemResponse(item.getId(),item.getVariant().getId(),item.getVariant().getProduct().getId(),
                    item.getVariant().getProduct().getName(),imageUrl,item.getVariant().getSku(),item.getQuantity(),
                    item.getUnitPriceSnapshot(),item.getUnitPriceSnapshot().multiply(BigDecimal.valueOf(item.getQuantity())),
                    availableQuantity,item.getPrescription()==null?null:item.getPrescription().getId(),
                    codes,item.getLensAdditionalPrice());
        }).toList();
        return new CartResponse(cart.getId(),values,values.stream().map(CartItemResponse::lineTotal).reduce(BigDecimal.ZERO,BigDecimal::add));
    }

    private WishlistResponse wish(WishlistItem item) {
        ProductVariant variant=item.getVariant();
        return new WishlistResponse(item.getId(),variant.getId(),variant.getProduct().getId(),variant.getProduct().getName(),
                variant.getProduct().getBasePrice().add(variant.getAdditionalPrice()),variant.getAvailableQuantity());
    }
}
