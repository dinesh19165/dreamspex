package com.dreamspex.returns;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReturnStatusHistoryRepository extends JpaRepository<ReturnStatusHistory, String> {
    List<ReturnStatusHistory> findByReturnRequestIdOrderByCreatedAtAsc(String returnRequestId);
}
