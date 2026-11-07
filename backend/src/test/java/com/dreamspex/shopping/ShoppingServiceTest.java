package com.dreamspex.shopping;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.dto.CatalogDtos;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.entity.ProductVariant;
import com.dreamspex.catalog.repository.ProductVariantRepository;
import com.dreamspex.shopping.entity.Cart;
import com.dreamspex.shopping.entity.CartItem;
import com.dreamspex.shopping.repository.CartItemRepository;
import com.dreamspex.shopping.repository.CartRepository;
import com.dreamspex.shopping.repository.WishlistRepository;
import com.dreamspex.shopping.service.ShoppingService;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.prescription.LensOptionRepository;
import com.dreamspex.prescription.LensOption;
import com.dreamspex.prescription.Prescription;
import com.dreamspex.prescription.PrescriptionRepository;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import java.util.Optional;
import java.math.BigDecimal;
import static com.dreamspex.catalog.dto.CatalogDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ShoppingServiceTest {
    @Mock CurrentUser current;
    @Mock CartRepository carts;
    @Mock CartItemRepository items;
    @Mock WishlistRepository wishlists;
    @Mock ProductVariantRepository variants;
    @Mock PrescriptionRepository prescriptions;
    @Mock LensOptionRepository lensOptions;

    @Test
    void addingBeyondAvailableStockIsRejected() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(java.math.BigDecimal.TEN);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(1);
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(carts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(variants.findByIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.of(variant));

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        ApiException error = assertThrows(ApiException.class,
                () -> service.add(new UsernamePasswordAuthenticationToken("u", null), new CartItemRequest("v", 2, null, null)));

        assertEquals("INSUFFICIENT_STOCK", error.code());
    }

    @Test
    void activeVariantForPublishedProductCanBeAdded() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(java.math.BigDecimal.TEN);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(10);
        variant.setReservedQuantity(0);
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(carts.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        when(variants.findByIdAndStatus("80a7b010-4f15-452c-9c75-26127fda9cd3", "ACTIVE"))
                .thenReturn(Optional.of(variant));
        when(items.findByCartIdAndVariantId(any(), any())).thenReturn(Optional.empty());
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        CartResponse response = service.add(new UsernamePasswordAuthenticationToken("u", null),
                new CartItemRequest("80a7b010-4f15-452c-9c75-26127fda9cd3", 1, null, null));

        assertEquals(java.math.BigDecimal.TEN, response.subtotal());
        verify(items).save(any(CartItem.class));
    }

    @Test
    void addingDifferentPrescriptionDoesNotOverwriteExistingCartConfiguration() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(java.math.BigDecimal.TEN);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(10);
        variant.setReservedQuantity(0);
        Cart cart = new Cart();
        cart.setUser(user);
        CartItem existing = new CartItem();
        Prescription previous = new Prescription();
        previous.setSelectedLensCodes("SINGLE_VISION");
        existing.setPrescription(previous);
        existing.setSelectedLensCodes("SINGLE_VISION");
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.of(cart));
        when(variants.findByIdAndStatus("variant", "ACTIVE")).thenReturn(Optional.of(variant));
        when(items.findByCartIdAndVariantId(cart.getId(), variant.getId())).thenReturn(Optional.of(existing));

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        ApiException error = assertThrows(ApiException.class, () -> service.add(
                new UsernamePasswordAuthenticationToken("u", null),
                new CartItemRequest("variant", 1, "another-prescription", java.util.List.of("SINGLE_VISION"))));

        assertEquals("CART_ITEM_CONFIGURATION_CONFLICT", error.code());
        verify(items, never()).save(any(CartItem.class));
    }

    @Test
    void configuredCartUsesCurrentServerLensPrice() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(new BigDecimal("1000.00"));
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setAdditionalPrice(new BigDecimal("50.00"));
        variant.setQuantity(10);
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(product);
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION");
        LensOption option = new LensOption();
        option.setCode("SINGLE_VISION");
        option.setCategory("TYPE");
        option.setAvailable(true);
        option.setAdditionalCost(new BigDecimal("275.00"));
        Cart cart = new Cart();
        cart.setUser(user);
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(user.getId(), "ACTIVE")).thenReturn(Optional.empty());
        when(carts.save(any())).thenReturn(cart);
        when(variants.findByIdAndStatus("variant", "ACTIVE")).thenReturn(Optional.of(variant));
        when(prescriptions.findByIdAndUserId("prescription", user.getId())).thenReturn(Optional.of(prescription));
        when(lensOptions.findByCode("SINGLE_VISION")).thenReturn(Optional.of(option));
        when(items.findByCartIdAndVariantId(any(), any())).thenReturn(Optional.empty());
        when(items.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        CartResponse response = service.add(new UsernamePasswordAuthenticationToken("u", null),
                new CartItemRequest("variant", 1, "prescription", java.util.List.of("SINGLE_VISION")));

        assertEquals(new BigDecimal("1325.00"), response.items().getFirst().unitPrice());
        assertEquals(new BigDecimal("275.00"), response.items().getFirst().lensAdditionalPrice());
    }

    @Test
    void addToCartRejectsPrescriptionNotOwnedByCustomer() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(BigDecimal.TEN);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(5);
        Cart cart = new Cart();
        cart.setUser(user);
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(carts.save(any())).thenReturn(cart);
        when(variants.findByIdAndStatus("variant", "ACTIVE")).thenReturn(Optional.of(variant));
        when(prescriptions.findByIdAndUserId("not-owned", user.getId())).thenReturn(Optional.empty());

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        ApiException error = assertThrows(ApiException.class, () -> service.add(
                new UsernamePasswordAuthenticationToken("u", null),
                new CartItemRequest("variant", 1, "not-owned", java.util.List.of("SINGLE_VISION"))));

        assertEquals("PRESCRIPTION_NOT_FOUND", error.code());
        verify(items, never()).save(any(CartItem.class));
    }

    @Test
    void addToCartRejectsUnavailableLensWithoutSavingItem() {
        User user = new User();
        Product product = new Product();
        product.setStatus("PUBLISHED");
        product.setBasePrice(BigDecimal.TEN);
        ProductVariant variant = new ProductVariant();
        variant.setProduct(product);
        variant.setQuantity(5);
        Cart cart = new Cart();
        cart.setUser(user);
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setProduct(product);
        prescription.setCustomerConfirmed(true);
        prescription.setSelectedLensCodes("SINGLE_VISION");
        LensOption unavailable = new LensOption();
        unavailable.setCode("SINGLE_VISION");
        unavailable.setCategory("TYPE");
        unavailable.setAvailable(false);
        unavailable.setAdditionalCost(BigDecimal.ZERO);
        when(current.require(any())).thenReturn(user);
        when(carts.findByUserIdAndStatus(any(), eq("ACTIVE"))).thenReturn(Optional.empty());
        when(carts.save(any())).thenReturn(cart);
        when(variants.findByIdAndStatus("variant", "ACTIVE")).thenReturn(Optional.of(variant));
        when(prescriptions.findByIdAndUserId("prescription", user.getId())).thenReturn(Optional.of(prescription));
        when(lensOptions.findByCode("SINGLE_VISION")).thenReturn(Optional.of(unavailable));

        ShoppingService service = new ShoppingService(current, carts, items, wishlists, variants, prescriptions, lensOptions);
        ApiException error = assertThrows(ApiException.class, () -> service.add(
                new UsernamePasswordAuthenticationToken("u", null),
                new CartItemRequest("variant", 1, "prescription", java.util.List.of("SINGLE_VISION"))));

        assertEquals("LENS_UNAVAILABLE", error.code());
        verify(items, never()).save(any(CartItem.class));
    }
}
