package com.dreamspex.shopping.controller;

import com.dreamspex.shopping.service.ShoppingService;
import jakarta.validation.Valid; import org.springframework.http.HttpStatus; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.catalog.dto.CatalogDtos.*;
@RestController @RequestMapping("/api/v1") @PreAuthorize("hasRole('CUSTOMER')")
public class ShoppingController{
 private final ShoppingService s; public ShoppingController(ShoppingService s){this.s=s;}
 @GetMapping("/cart") CartResponse cart(Authentication a,@RequestParam(required=false) String franchiseId){return s.cart(a,franchiseId);}
 @PostMapping("/cart/items") CartResponse add(Authentication a,@Valid @RequestBody CartItemRequest r){return s.add(a,r);}
 @PatchMapping("/cart/items/{id}") CartResponse update(Authentication a,@PathVariable String id,@RequestParam int quantity,@RequestParam(required=false) String franchiseId){return s.update(a,id,quantity,franchiseId);}
 @DeleteMapping("/cart/items/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void remove(Authentication a,@PathVariable String id){s.remove(a,id);}
 @GetMapping("/wishlist") List<WishlistResponse> wishlist(Authentication a){return s.wishlist(a);}
 @PostMapping("/wishlist/items") @ResponseStatus(HttpStatus.CREATED) WishlistResponse addWish(Authentication a,@Valid @RequestBody WishlistRequest r){return s.addWish(a,r);}
 @DeleteMapping("/wishlist/items/{variantId}") @ResponseStatus(HttpStatus.NO_CONTENT) void removeWish(Authentication a,@PathVariable String variantId){s.removeWish(a,variantId);}
}
