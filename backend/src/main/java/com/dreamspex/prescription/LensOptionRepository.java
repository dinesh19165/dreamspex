package com.dreamspex.prescription;

import org.springframework.data.jpa.repository.JpaRepository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

public interface LensOptionRepository extends JpaRepository<LensOption, String> {
    List<LensOption> findAllByOrderByCategoryAscDisplayOrderAscNameAsc();
    List<LensOption> findByAvailableTrueAndAdditionalCostGreaterThanEqualOrderByCategoryAscDisplayOrderAscNameAsc(BigDecimal minimumPrice);
    Optional<LensOption> findByCode(String code);
}
