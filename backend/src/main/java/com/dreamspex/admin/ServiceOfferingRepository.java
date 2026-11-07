package com.dreamspex.admin;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface ServiceOfferingRepository extends JpaRepository<ServiceOffering,String>{ List<ServiceOffering> findByStatusOrderBySortOrderAsc(String status); }
