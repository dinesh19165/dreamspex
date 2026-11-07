package com.dreamspex;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.config.SecurityProperties;
import com.dreamspex.security.JwtService;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.http.MediaType;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Date;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class BackendSecurityIntegrationTest {
    @Autowired MockMvc mockMvc;
    @Autowired UserRepository users;
    @Autowired RoleRepository roles;
    @Autowired PasswordEncoder passwordEncoder;
    @Autowired JwtService jwtService;
    @Autowired SecurityProperties securityProperties;
    private User customer;

    @BeforeEach
    void setUp() {
        Role role = roles.findByCode("CUSTOMER").orElseGet(() -> {
            Role value = new Role();
            value.setCode("CUSTOMER");
            value.setName("Customer");
            return roles.save(value);
        });
        customer = new User();
        customer.setEmail("customer-" + System.nanoTime() + "@example.com");
        customer.setPasswordHash(passwordEncoder.encode("password"));
        customer.setDisplayName("Customer");
        customer.setStatus("ACTIVE");
        customer.getRoles().add(role);
        users.save(customer);
    }

    @Test
    void anonymousCannotReadCustomerProfile() throws Exception {
        mockMvc.perform(get("/api/v1/me")).andExpect(status().isUnauthorized());
    }

    @Test
    void expiredBearerTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .header("Authorization", "Bearer " + expiredToken(customer)))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void invalidBearerTokenIsUnauthorized() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .header("Authorization", "Bearer invalid.token.value"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void validBearerTokenAuthenticatesCustomer() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .header("Authorization", "Bearer " + jwtService.issue(customer)))
                .andExpect(status().isOk());
    }

    @Test
    void customerBearerTokenRemainsForbiddenFromAdminEndpoints() throws Exception {
        mockMvc.perform(get("/api/v1/admin/session")
                        .header("Authorization", "Bearer " + jwtService.issue(customer)))
                .andExpect(status().isForbidden());
    }

    @Test
    void healthEndpointIsPublic() throws Exception {
        mockMvc.perform(get("/api/health")).andExpect(status().isOk());
    }

    @Test
    void publicHomepageIncludesPublishedCards() throws Exception {
        mockMvc.perform(get("/api/v1/homepage"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cards").isArray());
    }

    @Test
    void homepageCardManagementRemainsAdminOnly() throws Exception {
        mockMvc.perform(get("/api/v1/admin/cms/cards")).andExpect(status().isUnauthorized());
        mockMvc.perform(get("/api/v1/admin/cms/cards")
                        .with(authentication(new UsernamePasswordAuthenticationToken(customer.getId(), null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCanReadOwnProfileWithCustomerAuthority() throws Exception {
        mockMvc.perform(get("/api/v1/me")
                        .with(authentication(new UsernamePasswordAuthenticationToken(customer.getId(), null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isOk());
    }

    @Test
    void customerCannotReadAdminSession() throws Exception {
        mockMvc.perform(get("/api/v1/admin/session")
                        .with(authentication(new UsernamePasswordAuthenticationToken(customer.getId(), null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isForbidden());
    }

    @Test
    void customerCannotManageLensOptions() throws Exception {
        mockMvc.perform(get("/api/v1/admin/prescriptions/lens-options")
                        .with(authentication(new UsernamePasswordAuthenticationToken(customer.getId(), null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_CUSTOMER"))))))
                .andExpect(status().isForbidden());
    }

    @Test
    void superAdminCanReadManagedLensOptions() throws Exception {
        mockMvc.perform(get("/api/v1/admin/prescriptions/lens-options")
                        .with(authentication(new UsernamePasswordAuthenticationToken("admin", null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"))))))
                .andExpect(status().isOk());
    }

    @Test
    void rejectsInvalidLensOptionPriceAndCategory() throws Exception {
        mockMvc.perform(post("/api/v1/admin/prescriptions/lens-options")
                        .with(authentication(new UsernamePasswordAuthenticationToken("admin", null,
                                java.util.List.of(new SimpleGrantedAuthority("ROLE_SUPER_ADMIN")))))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "code": "INVALID_OPTION",
                                  "name": "Invalid option",
                                  "category": "UNKNOWN",
                                  "benefits": "Invalid test option",
                                  "additionalCost": -1,
                                  "preparationDays": null,
                                  "available": true,
                                  "displayOrder": 0
                                }
                                """))
                .andExpect(status().isUnprocessableEntity());
    }

    @Test
    void orderPreflightAllowsAuthorizationContentTypeAndIdempotencyKey() throws Exception {
        mockMvc.perform(options("/api/v1/orders")
                        .header("Origin", "http://localhost:5173")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers",
                                "authorization,content-type,idempotency-key"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:5173"))
                .andExpect(header().string("Access-Control-Allow-Methods",
                        org.hamcrest.Matchers.containsString("POST")))
                .andExpect(header().string("Access-Control-Allow-Headers",
                        org.hamcrest.Matchers.allOf(
                                org.hamcrest.Matchers.containsString("authorization"),
                                org.hamcrest.Matchers.containsString("content-type"),
                                org.hamcrest.Matchers.containsString("idempotency-key"))))
                .andExpect(header().string("Access-Control-Allow-Credentials", "true"));
    }

    private String expiredToken(User user) {
        var key = Keys.hmacShaKeyFor(securityProperties.jwtSecret().getBytes(StandardCharsets.UTF_8));
        Instant now = Instant.now();
        return Jwts.builder()
                .issuer(securityProperties.jwtIssuer())
                .subject(user.getId())
                .claim("tokenVersion", user.getTokenVersion())
                .issuedAt(Date.from(now.minusSeconds(120)))
                .expiration(Date.from(now.minusSeconds(60)))
                .signWith(key)
                .compact();
    }
}
