package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.Address;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface AddressRepository extends JpaRepository<Address, String> {
    List<Address> findByUserIdAndDeletedAtIsNullOrderByDefaultAddressDescCreatedAtDesc(String userId);
    Optional<Address> findByIdAndUserIdAndDeletedAtIsNull(String id, String userId);
}
