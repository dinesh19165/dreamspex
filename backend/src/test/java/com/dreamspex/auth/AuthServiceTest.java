package com.dreamspex.auth;


import com.dreamspex.auth.dto.AuthDtos;
import com.dreamspex.auth.entity.OtpChallenge;
import com.dreamspex.auth.entity.RefreshToken;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.CustomerProfileRepository;
import com.dreamspex.auth.repository.OtpChallengeRepository;
import com.dreamspex.auth.repository.RefreshTokenRepository;
import com.dreamspex.auth.repository.RoleRepository;
import com.dreamspex.auth.repository.UserRepository;
import com.dreamspex.franchise.FranchiseUser;
import com.dreamspex.franchise.FranchiseUserRepository;
import com.dreamspex.admin.Store;
import com.dreamspex.auth.service.AuthService;
import com.dreamspex.auth.service.OtpDeliveryService;
import static com.dreamspex.auth.dto.AuthDtos.LoginRequest;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.common.ApiException;
import com.dreamspex.config.SecurityProperties;
import com.dreamspex.security.JwtService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.junit.jupiter.api.extension.ExtendWith;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Optional;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.mockito.ArgumentCaptor;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {
    @Mock UserRepository users;
    @Mock RoleRepository roles;
    @Mock RefreshTokenRepository refreshTokens;
    @Mock OtpChallengeRepository challenges;
    @Mock PasswordEncoder passwordEncoder;
    @Mock JwtService jwtService;
    @Mock CustomerProfileRepository profiles;
    @Mock OtpDeliveryService otpDelivery;
    @Mock AuditLogService auditLogs;
    @Mock FranchiseUserRepository franchiseUsers;
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, roles, refreshTokens, challenges, passwordEncoder, jwtService,
                new SecurityProperties("issuer", "12345678901234567890123456789012",
                        "otp-secret-123456789012345678901234", 15, 30,
                        "link-secret-123456789012345678901234"), profiles, otpDelivery, auditLogs);
        ReflectionTestUtils.setField(service, "franchiseUsers", franchiseUsers);
    }

    @Test
    void franchiseInvitationIsHashedConsumedOnceAndRevokesExistingSessions() throws Exception {
        String token = "A".repeat(43);
        String tokenHash = HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(token.getBytes(StandardCharsets.UTF_8)));
        User user = userWithRole("FRANCHISE_ADMIN");
        Store store = new Store();
        store.setFranchiseManaged(true);
        store.setStatus("ACTIVE");
        FranchiseUser link = new FranchiseUser();
        link.setStore(store);
        link.setUser(user);
        link.setInvitationTokenHash(tokenHash);
        link.setInvitationExpiresAt(Instant.now().plusSeconds(600));
        when(franchiseUsers.findByInvitationTokenHashForUpdate(tokenHash)).thenReturn(Optional.of(link));
        when(passwordEncoder.encode("an intentionally secure passphrase")).thenReturn("encoded-password");

        assertTrue(service.setupFranchisePassword(new AuthDtos.FranchiseSetupRequest(
                token, "an intentionally secure passphrase")).reset());

        assertEquals("encoded-password", user.getPasswordHash());
        assertEquals(null, link.getInvitationTokenHash());
        assertEquals(null, link.getInvitationExpiresAt());
        verify(refreshTokens).revokeUserTokens(org.mockito.ArgumentMatchers.eq(user.getId()),
                org.mockito.ArgumentMatchers.any(Instant.class));

        when(franchiseUsers.findByInvitationTokenHashForUpdate(tokenHash)).thenReturn(Optional.empty());
        ApiException error = assertThrows(ApiException.class, () -> service.setupFranchisePassword(
                new AuthDtos.FranchiseSetupRequest(token, "an intentionally secure passphrase")));
        assertEquals("INVALID_INVITATION", error.code());
    }

    @Test
    void customerLoginRejectsSuperAdmin() {
        User user = userWithRole("SUPER_ADMIN");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("admin@example.com")).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("admin@example.com", "password")));

        assertEquals("INVALID_CREDENTIALS", exception.code());
        verify(passwordEncoder, never()).matches(anyString(), anyString());
    }

    @Test
    void adminLoginRejectsCustomer() {
        User user = userWithRole("CUSTOMER");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.adminLogin(new LoginRequest("customer@example.com", "password")));

        assertEquals("INVALID_CREDENTIALS", exception.code());
    }

    @Test
    void loginKeepsFifteenMinuteAccessTokensAndThirtyDayRefreshTokens() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "hash")).thenReturn(true);
        when(jwtService.issue(user)).thenReturn("access-token");

        AuthDtos.TokenResponse response = service.login(new LoginRequest("customer@example.com", "password"));

        ArgumentCaptor<RefreshToken> refreshToken = ArgumentCaptor.forClass(RefreshToken.class);
        verify(refreshTokens).save(refreshToken.capture());
        assertEquals(15 * 60, response.expiresIn());
        assertTrue(refreshToken.getValue().getExpiresAt().isAfter(Instant.now().plus(29, java.time.temporal.ChronoUnit.DAYS)));
        assertTrue(refreshToken.getValue().getExpiresAt().isBefore(Instant.now().plus(31, java.time.temporal.ChronoUnit.DAYS)));
    }

    @Test
    void expiredOtpIsRejectedWithoutConsumingIt() {
        OtpChallenge challenge = challenge(Instant.now().minusSeconds(1), 0);
        when(challenges.findByIdAndPurpose("challenge", "REGISTRATION")).thenReturn(Optional.of(challenge));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));

        assertEquals("INVALID_CHALLENGE", exception.code());
        verify(challenges, never()).consumeIfValid(anyString(), anyString(), any());
    }

    @Test
    void invalidOtpIncrementsAttemptsAndLimitIsEnforced() {
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        when(challenges.findByIdAndPurpose("challenge", "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(challenges.incrementAttempts(anyString(), any())).thenReturn(1);

        ApiException invalid = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));

        assertEquals("INVALID_OTP", invalid.code());
        verify(challenges).incrementAttempts(anyString(), any());

        challenge.setAttempts(5);
        ApiException exhausted = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));
        assertEquals("INVALID_CHALLENGE", exhausted.code());
    }

    @Test
    void resendCooldownReturnsGenericAcceptedResponseWithoutSendingOtp() {
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        challenge.setLastSentAt(Instant.now().minusSeconds(5));
        when(challenges.findById("challenge")).thenReturn(Optional.of(challenge));

        AuthDtos.SimpleResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("challenge"));

        assertTrue(response.accepted());
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void resendUnknownChallengeReturnsGenericAcceptedResponse() {
        when(challenges.findById("unknown")).thenReturn(Optional.empty());

        AuthDtos.SimpleResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("unknown"));

        assertTrue(response.accepted());
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void eligibleResendStillDeliversReplacementOtp() {
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        challenge.setDeliveryChannel("EMAIL");
        challenge.setLastSentAt(Instant.now().minusSeconds(60));
        when(challenges.findById("challenge")).thenReturn(Optional.of(challenge));
        when(challenges.save(challenge)).thenReturn(challenge);

        AuthDtos.SimpleResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("challenge"));

        assertTrue(response.accepted());
        verify(otpDelivery).send(eq("customer@example.com"), eq("EMAIL"), eq("REGISTRATION"),
                eq(challenge.getId()), anyString());
    }

    @Test
    void unknownForgotPasswordIdentifierReturnsAcceptedWithOpaqueDecoyChallengeId() {
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("unknown@example.com")).thenReturn(Optional.empty());

        AuthDtos.ForgotPasswordResponse response =
                service.forgotPassword(new AuthDtos.IdentifierRequest("unknown@example.com"));

        assertTrue(response.accepted());
        assertTrue(response.challengeId() != null && !response.challengeId().isBlank());
        verify(challenges, never()).save(any());
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void forgotPasswordCreatesChallengeAndReturnsItsIdWithoutExposingOtp() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(challenges.save(any(OtpChallenge.class))).thenReturn(challenge);

        AuthDtos.ForgotPasswordResponse response =
                service.forgotPassword(new AuthDtos.IdentifierRequest("CUSTOMER@EXAMPLE.COM"));

        assertTrue(response.accepted());
        assertEquals(challenge.getId(), response.challengeId());
        verify(otpDelivery).send(eq("customer@example.com"), anyString(), eq("PASSWORD_RESET"),
                eq(challenge.getId()), anyString());
    }

    @Test
    void validPasswordResetUsesChallengeIdAndOtpAndRevokesRefreshTokens() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        when(challenges.findByIdAndPurpose(challenge.getId(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.consumeIfValid(eq(challenge.getId()), eq(challenge.getCodeHash()), any())).thenReturn(1);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecurePassword123!")).thenReturn("new-password-hash");

        AuthDtos.ResetPasswordResponse response = service.resetPassword(new AuthDtos.ResetPasswordRequest(
                challenge.getId(), "123456", "NewSecurePassword123!"));

        assertTrue(response.reset());
        assertTrue(response.accepted());
        assertEquals("new-password-hash", user.getPasswordHash());
        verify(refreshTokens).revokeUserTokens(eq(user.getId()), any());
    }

    @Test
    void invalidPasswordResetOtpIsRejected() {
        User user = userWithRole("CUSTOMER");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        when(challenges.findByIdAndPurpose(challenge.getId(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.incrementAttempts(eq(challenge.getId()), any())).thenReturn(1);

        ApiException exception = assertThrows(ApiException.class, () -> service.resetPassword(
                new AuthDtos.ResetPasswordRequest(challenge.getId(), "654321", "NewSecurePassword123!")));

        assertEquals("INVALID_CHALLENGE", exception.code());
        verify(refreshTokens, never()).revokeUserTokens(anyString(), any());
    }

    @Test
    void expiredPasswordResetOtpIsRejected() {
        User user = userWithRole("CUSTOMER");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().minusSeconds(1), "123456");
        when(challenges.findByIdAndPurpose(challenge.getId(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));

        ApiException exception = assertThrows(ApiException.class, () -> service.resetPassword(
                new AuthDtos.ResetPasswordRequest(challenge.getId(), "123456", "NewSecurePassword123!")));

        assertEquals("INVALID_CHALLENGE", exception.code());
        verify(challenges, never()).consumeIfValid(anyString(), anyString(), any());
    }

    @Test
    void wrongChallengePurposeIsRejected() {
        when(challenges.findByIdAndPurpose("registration-challenge", "PASSWORD_RESET"))
                .thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> service.resetPassword(
                new AuthDtos.ResetPasswordRequest("registration-challenge", "123456", "NewSecurePassword123!")));

        assertEquals("INVALID_CHALLENGE", exception.code());
        verifyNoInteractions(passwordEncoder, refreshTokens);
    }

    @Test
    void unknownChallengeIdIsRejected() {
        when(challenges.findByIdAndPurpose("unknown-challenge", "PASSWORD_RESET"))
                .thenReturn(Optional.empty());

        ApiException exception = assertThrows(ApiException.class, () -> service.resetPassword(
                new AuthDtos.ResetPasswordRequest("unknown-challenge", "123456", "NewSecurePassword123!")));

        assertEquals("INVALID_CHALLENGE", exception.code());
        verifyNoInteractions(passwordEncoder, refreshTokens);
    }

    @Test
    void successfulPasswordResetAllowsLoginWithNewPassword() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        when(challenges.findByIdAndPurpose(challenge.getId(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.consumeIfValid(anyString(), anyString(), any())).thenReturn(1);
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.encode("NewSecurePassword123!")).thenReturn("new-password-hash");
        when(passwordEncoder.matches("NewSecurePassword123!", "new-password-hash")).thenReturn(true);
        when(jwtService.issue(user)).thenReturn("access-token");

        service.resetPassword(new AuthDtos.ResetPasswordRequest(
                challenge.getId(), "123456", "NewSecurePassword123!"));
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));

        AuthDtos.TokenResponse response = service.login(
                new LoginRequest("customer@example.com", "NewSecurePassword123!"));

        assertEquals("access-token", response.accessToken());
    }

    private OtpChallenge challenge(Instant expiresAt, int attempts) {
        OtpChallenge challenge = new OtpChallenge();
        challenge.setIdentifier("customer@example.com");
        challenge.setPurpose("REGISTRATION");
        challenge.setCodeHash("not-the-hash");
        challenge.setExpiresAt(expiresAt);
        challenge.setAttempts(attempts);
        return challenge;
    }

    private OtpChallenge passwordResetChallenge(User user, Instant expiresAt, String otp) {
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier("customer@example.com");
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setCodeHash(hashOtp(otp));
        challenge.setExpiresAt(expiresAt);
        return challenge;
    }

    private String hashOtp(String otp) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(
                    "otp-secret-123456789012345678901234".getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
            return HexFormat.of().formatHex(mac.doFinal(otp.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException(exception);
        }
    }

    private User userWithRole(String code) {
        Role role = new Role();
        role.setCode(code);
        User user = new User();
        user.setEmail(code.toLowerCase() + "@example.com");
        user.setPasswordHash("hash");
        user.setStatus("ACTIVE");
        user.getRoles().add(role);
        return user;
    }
}
