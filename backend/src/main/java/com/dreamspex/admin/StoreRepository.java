package com.dreamspex.admin;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface StoreRepository extends JpaRepository<Store,String>{ List<Store> findByStatusOrderByNameAsc(String status); }
