package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.CustomerProfile;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.Collection;
import java.util.List;

public interface CustomerProfileRepository extends JpaRepository<CustomerProfile, String> {
    Optional<CustomerProfile> findByUserId(String userId);
    List<CustomerProfile> findByUserIdIn(Collection<String> userIds);
}
