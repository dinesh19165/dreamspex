package com.dreamspex.order;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.data.domain.Pageable;
import java.util.*;
public interface OrderRepository extends JpaRepository<Order,String>{
 Optional<Order> findByUserIdAndIdempotencyKey(String userId,String idempotencyKey);
 Optional<Order> findByIdAndUserId(String id,String userId);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select o from Order o where o.id = :id")
 Optional<Order> findByIdForUpdate(@Param("id") String id);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select o from Order o where o.status = 'PENDING_PAYMENT' and o.paymentStatus = 'PENDING' " +
         "and o.reservationExpiresAt is not null and o.reservationExpiresAt <= :now order by o.reservationExpiresAt")
 List<Order> findExpiredReservationsForUpdate(@Param("now") java.time.Instant now, Pageable pageable);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select o from Order o where o.id = :id and o.user.id = :userId")
 Optional<Order> findByIdAndUserIdForUpdate(@Param("id") String id,@Param("userId") String userId);
 List<Order> findByUserIdOrderByCreatedAtDesc(String userId);
 List<Order> findAllByOrderByCreatedAtDesc();
 List<Order> findByFulfillmentStoreIdOrderByCreatedAtDesc(String storeId);
 List<Order> findByFulfillmentStoreIdAndCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(
         String storeId,java.time.Instant from,java.time.Instant to);
 List<Order> findByCreatedAtGreaterThanEqualAndCreatedAtLessThanOrderByCreatedAtAsc(java.time.Instant from,java.time.Instant to);
 long countByUserId(String userId);
 long countByUserIdAndPaymentStatusAndStatusIn(String userId,String paymentStatus,Collection<String> statuses);
 interface UserOrderCount { String getUserId(); long getOrderCount(); }
 @Query("select o.user.id as userId, count(o.id) as orderCount from Order o where o.user.id in :userIds group by o.user.id")
 List<UserOrderCount> countByUserIds(@Param("userIds") Collection<String> userIds);
 long countByCouponCodeIgnoreCase(String couponCode);
 long countByUserIdAndCouponCodeIgnoreCase(String userId,String couponCode);
}
