package com.dreamspex.catalog.repository;

import com.dreamspex.catalog.entity.Coupon;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
import java.util.*;
public interface CouponRepository extends JpaRepository<Coupon,String> {
 Optional<Coupon> findByCodeIgnoreCaseAndStatus(String code,String status);
 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select c from Coupon c where upper(c.code)=upper(:code) and c.status=:status")
 Optional<Coupon> findWithLockByCodeAndStatus(@Param("code") String code,@Param("status") String status);
 List<Coupon> findByStatus(String status);
 long countByCodeIgnoreCaseAndIdNot(String code,String id);
 boolean existsByOfferCategoryIgnoreCase(String offerCategory);
}
