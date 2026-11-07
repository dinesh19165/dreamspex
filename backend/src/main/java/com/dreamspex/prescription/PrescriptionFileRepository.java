package com.dreamspex.prescription;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;
public interface PrescriptionFileRepository extends JpaRepository<PrescriptionFile,String>{
    Optional<PrescriptionFile> findByIdAndPrescriptionUserId(String id,String userId);
    Optional<PrescriptionFile> findByIdAndPrescriptionId(String id,String prescriptionId);
    List<PrescriptionFile> findByPrescriptionId(String prescriptionId);
}
