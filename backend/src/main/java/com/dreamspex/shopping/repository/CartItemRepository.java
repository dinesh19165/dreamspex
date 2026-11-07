package com.dreamspex.shopping.repository;

import com.dreamspex.shopping.entity.CartItem;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface CartItemRepository extends JpaRepository<CartItem,String>{Optional<CartItem> findByIdAndCartUserId(String id,String userId); Optional<CartItem> findByCartIdAndVariantId(String cartId,String variantId);}
