package com.dreamspex.admin;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface HomepageSectionRepository extends JpaRepository<HomepageSection,String> {
    List<HomepageSection> findByEnabledTrueAndStatusOrderByDisplayOrderAsc(String status);
    List<HomepageSection> findAllByOrderByDisplayOrderAsc();
    Optional<HomepageSection> findBySlug(String slug);
}
