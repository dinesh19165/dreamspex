package com.dreamspex.franchise;

import com.dreamspex.admin.Store;
import com.dreamspex.admin.StoreRepository;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class FranchiseAdminUsersIntegrationTest {
    @Autowired private MockMvc mockMvc;
    @Autowired private StoreRepository stores;
    @Autowired private UserRepository users;
    @Autowired private RoleRepository roles;
    @Autowired private FranchiseUserRepository franchiseUsers;

    @Test
    void franchiseUsersIncludeOnlyNetworkRolesWithTheirActualAssignments() throws Exception {
        Store store = new Store();
        store.setName("Actual Franchise");
        store.setAddress("12 Main Road");
        store.setCity("Nellore");
        store.setState("Andhra Pradesh");
        store.setPostalCode("524001");
        store.setFranchiseManaged(true);
        store = stores.saveAndFlush(store);

        addUser(store, "FRANCHISE_ADMIN", "Franchise Admin");
        addUser(store, "FRANCHISE_MANAGER", "Franchise Manager");
        addUser(store, "FRANCHISE_STAFF", "Franchise Staff");
        addUser(store, "CUSTOMER", null);
        addUser(store, "SUPER_ADMIN", null);

        var admin = authentication(new UsernamePasswordAuthenticationToken("admin", null,
                List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))));
        mockMvc.perform(get("/api/v1/admin/franchises/{id}/users", store.getId())
                        .with(admin)
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.role == 'Franchise Admin')]").exists())
                .andExpect(jsonPath("$[?(@.role == 'Franchise Manager')]").exists())
                .andExpect(jsonPath("$[?(@.role == 'Franchise Staff')]").exists())
                .andExpect(jsonPath("$[?(@.name == 'Franchise Admin')].email").value("franchise_admin@example.test"))
                .andExpect(jsonPath("$[?(@.name == 'Franchise Admin')].status").value("ACTIVE"));
    }

    private void addUser(Store store, String roleCode, String name) {
        Role role = new Role();
        role.setCode(roleCode);
        role.setName(roleCode);
        role = roles.saveAndFlush(role);

        User user = new User();
        user.setEmail(roleCode.toLowerCase() + "@example.test");
        user.setPasswordHash("test-password-hash");
        user.setDisplayName(name == null ? roleCode : name);
        user.setStatus("ACTIVE");
        user.getRoles().add(role);
        user = users.saveAndFlush(user);

        FranchiseUser link = new FranchiseUser();
        link.setStore(store);
        link.setUser(user);
        franchiseUsers.saveAndFlush(link);
    }
}
