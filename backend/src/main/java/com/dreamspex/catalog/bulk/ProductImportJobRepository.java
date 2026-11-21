package com.dreamspex.catalog.bulk;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProductImportJobRepository extends JpaRepository<ProductImportJob, String> {
    List<ProductImportJob> findTop50ByOrderByCreatedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select job from ProductImportJob job where job.id = :id")
    Optional<ProductImportJob> findWithLockById(@Param("id") String id);
}
