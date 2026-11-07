package com.dreamspex.shopping.repository;

import com.dreamspex.shopping.entity.WishlistItem;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface WishlistRepository extends JpaRepository<WishlistItem,String>{List<WishlistItem> findByUserIdOrderByCreatedAtDesc(String userId); Optional<WishlistItem> findByUserIdAndVariantId(String userId,String variantId);}
