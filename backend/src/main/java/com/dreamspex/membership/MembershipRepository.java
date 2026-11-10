package com.dreamspex.membership;
import org.springframework.data.jpa.repository.*;
import java.util.*;
public interface MembershipRepository extends JpaRepository<Membership,String>{
 Optional<Membership> findFirstByUserIdAndStatusOrderByExpiresAtDesc(String userId,String status);
 List<Membership> findByUserIdOrderByStartsAtDesc(String userId);
 List<Membership> findByUserIdIn(Collection<String> userIds);
 List<Membership> findAllByOrderByCreatedAtDesc();
 List<Membership> findByStatusAndExpiresAtBefore(String status,java.time.Instant expiresAt);
}
