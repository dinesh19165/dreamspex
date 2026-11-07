package com.dreamspex.order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;
public interface OrderRepository extends JpaRepository<Order,String>{
 Optional<Order> findByUserIdAndIdempotencyKey(String userId,String idempotencyKey);
 Optional<Order> findByIdAndUserId(String id,String userId);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select o from Order o where o.id = :id")
 Optional<Order> findByIdForUpdate(@Param("id") String id);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select o from Order o where o.id = :id and o.user.id = :userId")
 Optional<Order> findByIdAndUserIdForUpdate(@Param("id") String id,@Param("userId") String userId);
 List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
 List<Order> findAllByOrderByCreatedAtDesc();
 long countByUserId(String userId);
 long countByCouponCodeIgnoreCase(String couponCode);
 long countByUserIdAndCouponCodeIgnoreCase(String userId,String couponCode);
}
