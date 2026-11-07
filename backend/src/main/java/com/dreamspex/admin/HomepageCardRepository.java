package com.dreamspex.admin;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface HomepageCardRepository extends JpaRepository<HomepageCard, String> {
    List<HomepageCard> findByEnabledTrueAndStatusOrderBySectionKeyAscDisplayOrderAscIdAsc(String status);
    List<HomepageCard> findAllByOrderBySectionKeyAscDisplayOrderAscIdAsc();
    Page<HomepageCard> findBySectionKeyOrderByDisplayOrderAscIdAsc(String sectionKey, Pageable pageable);
    Page<HomepageCard> findAllByOrderBySectionKeyAscDisplayOrderAscIdAsc(Pageable pageable);
}
