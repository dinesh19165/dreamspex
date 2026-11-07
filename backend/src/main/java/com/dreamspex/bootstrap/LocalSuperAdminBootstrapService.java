package com.dreamspex.bootstrap;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
class LocalSuperAdminBootstrapService {
    private final UserRepository users;
    private final RoleRepository roles;
    private final PasswordEncoder passwordEncoder;

    LocalSuperAdminBootstrapService(UserRepository users, RoleRepository roles, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.roles = roles;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    void createAdmin(String displayName, String email, char[] password) {
        if (users.countByStatusAndDeletedAtIsNullAndRoles_Code("ACTIVE", "SUPER_ADMIN") > 0) {
            throw new IllegalStateException("An active SUPER_ADMIN already exists; no account was created.");
        }
        if (users.findByEmailIgnoreCaseAndDeletedAtIsNull(email).isPresent()) {
            throw new IllegalStateException("That email already belongs to an active account; no account was created.");
        }
        Role role = roles.findByCode("SUPER_ADMIN")
                .orElseThrow(() -> new IllegalStateException("The SUPER_ADMIN role is missing; run Flyway first."));

        User user = new User();
        user.setEmail(email);
        user.setDisplayName(displayName);
        user.setPasswordHash(passwordEncoder.encode(new String(password)));
        user.setStatus("ACTIVE");
        user.setEmailVerifiedAt(Instant.now());
        user.getRoles().add(role);
        users.save(user);
    }
}
