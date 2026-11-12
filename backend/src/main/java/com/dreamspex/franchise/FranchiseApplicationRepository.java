package com.dreamspex.franchise;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface FranchiseApplicationRepository extends JpaRepository<FranchiseApplication, String> {
    List<FranchiseApplication> findAllByOrderByCreatedAtDesc();
    boolean existsByReferenceId(String referenceId);
    boolean existsByEmailIgnoreCaseAndPreferredCityIgnoreCaseAndStatusIn(
            String email, String preferredCity, Collection<FranchiseApplicationStatus> statuses);
    boolean existsByMobileNumberAndPreferredCityIgnoreCaseAndStatusIn(
            String mobileNumber, String preferredCity, Collection<FranchiseApplicationStatus> statuses);
}
