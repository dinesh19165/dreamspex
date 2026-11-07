package com.dreamspex.admin;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.*;

public interface BannerRepository extends JpaRepository<Banner,String> {
 List<Banner> findAllByOrderBySortOrderAsc();
 List<Banner> findByStatusOrderBySortOrderAsc(String status);

 @Lock(LockModeType.PESSIMISTIC_WRITE)
 @Query("select banner from Banner banner where banner.id = :id")
 Optional<Banner> findByIdForUpdate(@Param("id") String id);
}
