package com.dreamspex.membership;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.*;
public interface MembershipPlanRepository extends JpaRepository<MembershipPlan,String>{List<MembershipPlan> findByStatusOrderByPriceAsc(String status);}
