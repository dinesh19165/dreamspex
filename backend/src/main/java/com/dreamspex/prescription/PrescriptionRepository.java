package com.dreamspex.prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PrescriptionRepository extends JpaRepository<Prescription,String>{
    List<Prescription> findByUserIdOrderByCreatedAtDesc(String userId);
    Optional<Prescription> findByIdAndUserId(String id,String userId);
    List<Prescription> findByStatusOrderByCreatedAtAsc(String status);
}
