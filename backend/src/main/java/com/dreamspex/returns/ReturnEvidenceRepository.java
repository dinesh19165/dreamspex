package com.dreamspex.returns;

import java.util.Optional;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnEvidenceRepository extends JpaRepository<ReturnEvidence, String> {
    Optional<ReturnEvidence> findByIdAndReturnRequestId(String id, String returnRequestId);
    List<ReturnEvidence> findByReturnRequestIdOrderByCreatedAtAsc(String returnRequestId);
}
