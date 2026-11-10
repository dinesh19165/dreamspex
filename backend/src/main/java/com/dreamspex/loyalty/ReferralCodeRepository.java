package com.dreamspex.loyalty;

import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReferralCodeRepository extends JpaRepository<ReferralCode, String> {
    Optional<ReferralCode> findByCodeIgnoreCase(String code);
}
