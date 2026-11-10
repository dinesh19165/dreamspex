package com.dreamspex.auth.repository;


import com.dreamspex.auth.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UserRepository extends JpaRepository<User, String> {
    Optional<User> findByEmailIgnoreCaseAndDeletedAtIsNull(String email);
    Optional<User> findByPhoneAndDeletedAtIsNull(String phone);
    Page<User> findByDeletedAtIsNullAndRoles_Code(String code, Pageable pageable);
    Page<User> findByDeletedAtIsNullAndRoles_CodeAndDisplayNameContainingIgnoreCase(String code, String name, Pageable pageable);
    @Query("""
        select distinct u from User u join u.roles r
        where u.deletedAt is null and r.code = :role
          and (lower(u.displayName) like lower(concat('%', :query, '%'))
            or lower(coalesce(u.email, '')) like lower(concat('%', :query, '%'))
            or lower(coalesce(u.phone, '')) like lower(concat('%', :query, '%')))
        """)
    Page<User> searchByRoleAndContact(@Param("role") String role, @Param("query") String query, Pageable pageable);
    long countByDeletedAtIsNullAndRoles_Code(String code);
    long countByDeletedAtIsNullAndRoles_CodeAndPhoneIsNotNull(String code);
    long countByStatusAndDeletedAtIsNullAndRoles_Code(String status, String code);
    long countByStatusAndDeletedAtIsNull(String status);
}
