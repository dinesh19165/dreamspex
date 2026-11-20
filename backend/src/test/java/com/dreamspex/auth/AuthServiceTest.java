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
import com.dreamspex.auth.service.RegistrationOtpSettingsService;
import com.dreamspex.notification.Msg91OtpWidgetClient;
import static com.dreamspex.auth.dto.AuthDtos.LoginRequest;
import com.dreamspex.audit.AuditLogService;
import com.dreamspex.common.ApiException;
import com.fasterxml.jackson.databind.ObjectMapper;
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
import java.util.Set;
import java.time.Instant;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;
import static org.junit.jupiter.api.Assertions.assertTrue;
import org.mockito.ArgumentCaptor;
import static org.junit.jupiter.api.Assertions.assertNotEquals;

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
    @Mock Msg91OtpWidgetClient otpWidgetClient;
    @Mock RegistrationOtpSettingsService registrationOtpSettings;
    @Mock AuditLogService auditLogs;
    @Mock FranchiseUserRepository franchiseUsers;
    private AuthService service;

    @BeforeEach
    void setUp() {
        service = new AuthService(users, roles, refreshTokens, challenges, passwordEncoder, jwtService,
                new SecurityProperties("issuer", "12345678901234567890123456789012",
                        "otp-secret-123456789012345678901234", 15, 30,
                        "link-secret-123456789012345678901234"), profiles, otpDelivery, otpWidgetClient, auditLogs,
                registrationOtpSettings);
        ReflectionTestUtils.setField(service, "franchiseUsers", franchiseUsers);
    }

    @Test
    void registrationUsesEmailWhenOnlyEmailOtpIsEnabled() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(true, false, true));
        when(roles.findByCode("CUSTOMER")).thenReturn(Optional.of(role("CUSTOMER")));
        when(passwordEncoder.encode("a secure registration password")).thenReturn("password-hash");
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.RegisterResponse response = service.register(new AuthDtos.RegisterRequest(
                "Customer Name", "customer@example.com", "+14155550123", "a secure registration password",
                null, "EMAIL"));

        assertEquals(Set.of("EMAIL"), response.channels());
        verify(otpDelivery).send(eq("customer@example.com"), eq("EMAIL"), eq("REGISTRATION"),
                eq(response.challengeId()), anyString());
    }

    @Test
    void registrationUsesMobileWhenOnlyMobileOtpIsEnabled() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(false, true, true));
        when(roles.findByCode("CUSTOMER")).thenReturn(Optional.of(role("CUSTOMER")));
        when(passwordEncoder.encode("a secure registration password")).thenReturn("password-hash");
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuthDtos.RegisterResponse response = service.register(new AuthDtos.RegisterRequest(
                "Customer Name", null, "+14155550123", "a secure registration password", null, "SMS"));

        assertEquals(Set.of("SMS"), response.channels());
        verifyNoInteractions(otpWidgetClient);
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void mobileRegistrationCreatesChallengeForBrowserWidgetWithoutServerSend() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(false, true, true));
        when(roles.findByCode("CUSTOMER")).thenReturn(Optional.of(role("CUSTOMER")));
        when(passwordEncoder.encode("a secure registration password")).thenReturn("password-hash");
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.RegisterResponse response = service.register(new AuthDtos.RegisterRequest(
                "Customer Name", null, "+14155550123", "a secure registration password", null, "SMS"));

        assertTrue(response.verificationRequired());
        assertEquals(Set.of("SMS"), response.channels());
        verifyNoInteractions(otpWidgetClient);
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void registrationCanChooseEitherEnabledChannel() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(true, true, true));
        when(roles.findByCode("CUSTOMER")).thenReturn(Optional.of(role("CUSTOMER")));
        when(passwordEncoder.encode("a secure registration password")).thenReturn("password-hash");
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));
        AuthDtos.RegisterResponse response = service.register(new AuthDtos.RegisterRequest(
                "Customer Name", "customer@example.com", "+14155550123", "a secure registration password",
                null, "SMS"));

        assertEquals(Set.of("SMS"), response.channels());
        verifyNoInteractions(otpWidgetClient);
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void registrationIsBlockedWhenBothOtpChannelsAreDisabled() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(false, false, true));

        ApiException exception = assertThrows(ApiException.class, () -> service.register(new AuthDtos.RegisterRequest(
                "Customer Name", "customer@example.com", "+14155550123", "a secure registration password")));

        assertEquals("REGISTRATION_OTP_DISABLED", exception.code());
        verify(users, never()).save(any(User.class));
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void forgotPasswordCreatesWidgetChallengeForPhoneAccount() {
        User user = userWithRole("CUSTOMER");
        user.setPhone("+918328105293");
        when(users.findByPhoneAndDeletedAtIsNull("+918328105293")).thenReturn(Optional.of(user));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ForgotPasswordResponse response =
                service.forgotPassword(new AuthDtos.IdentifierRequest("8328105293"));

        ArgumentCaptor<OtpChallenge> challenge = ArgumentCaptor.forClass(OtpChallenge.class);
        verify(challenges).save(challenge.capture());
        assertEquals(challenge.getValue().getId(), response.challengeId());
        assertEquals("PASSWORD_RESET", challenge.getValue().getPurpose());
        assertEquals("SMS", challenge.getValue().getDeliveryChannel());
        assertEquals(null, challenge.getValue().getCodeHash());
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void pendingRegistrationCanChangeContactAndVerificationChannel() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(true, true, true));
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setEmail("customer@example.com");
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setPurpose("REGISTRATION");
        challenge.setIdentifier(user.getEmail());
        challenge.setDeliveryChannel("EMAIL");
        challenge.setCodeHash("old-hash");
        challenge.setExpiresAt(Instant.now().plusSeconds(600));
        challenge.setLastSentAt(Instant.now().minusSeconds(60));
        when(challenges.findByIdAndPurpose(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("current registration password", "hash")).thenReturn(true);
        when(challenges.save(challenge)).thenReturn(challenge);
        AuthDtos.RegisterResponse response = service.changeRegistrationContact(new AuthDtos.ChangeRegistrationRequest(
                challenge.getId(), "current registration password", null, "+14155550123", "SMS"));

        assertEquals(user.getId(), response.userId());
        assertEquals("+14155550123", user.getPhone());
        assertEquals("SMS", challenge.getDeliveryChannel());
        assertEquals(null, challenge.getProviderRequestId());
        assertEquals(null, challenge.getCodeHash());
        verifyNoInteractions(otpWidgetClient);
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
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
    void loginRequestAcceptsLegacyEmailJsonProperty() throws Exception {
        LoginRequest request = new ObjectMapper().readValue(
                "{\"email\":\"customer@example.com\",\"password\":\"password\"}", LoginRequest.class);

        assertEquals("customer@example.com", request.identifier());
        assertEquals("password", request.password());
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
        user.setEmailVerifiedAt(Instant.now());
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
    void customerLoginNormalizesEmailAndReturnsBothContactFields() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        user.setPhone("+918328105293");
        user.setEmailVerifiedAt(Instant.now());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "hash")).thenReturn(true);
        when(jwtService.issue(user)).thenReturn("access-token");

        AuthDtos.TokenResponse response = service.login(new LoginRequest("  CUSTOMER@EXAMPLE.COM ", "password"));

        assertEquals("access-token", response.accessToken());
        assertEquals("customer@example.com", response.user().email());
        assertEquals("+918328105293", response.user().phone());
    }

    @Test
    void customerLoginFindsIndianPhoneAcrossStoredPrefixes() {
        String[][] cases = {
                {"8328105293", "+918328105293"},
                {"+91 8328 105 293", "918328105293"},
                {"+918328105293", "8328105293"},
        };
        for (String[] loginCase : cases) {
            reset(users, passwordEncoder, jwtService, refreshTokens, auditLogs);
            User user = userWithRole("CUSTOMER");
            user.setPhone(loginCase[1]);
            user.setPhoneVerifiedAt(Instant.now());
            lenient().when(users.findByPhoneAndDeletedAtIsNull(anyString())).thenReturn(Optional.empty());
            when(users.findByPhoneAndDeletedAtIsNull(loginCase[1])).thenReturn(Optional.of(user));
            when(passwordEncoder.matches("password", "hash")).thenReturn(true);
            when(jwtService.issue(user)).thenReturn("access-token");

            AuthDtos.TokenResponse response = service.login(new LoginRequest(loginCase[0], "password"));

            assertEquals("access-token", response.accessToken());
            assertEquals(PhoneNumberNormalizer.normalizeOrOriginal(loginCase[1]), response.user().phone());
        }
    }

    @Test
    void wrongPasswordUsesGenericEmailOrPhoneError() {
        User user = userWithRole("CUSTOMER");
        user.setEmailVerifiedAt(Instant.now());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrong-password", "hash")).thenReturn(false);

        ApiException exception = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("customer@example.com", "wrong-password")));

        assertEquals("INVALID_CREDENTIALS", exception.code());
        assertEquals("Invalid email/phone or password", exception.getMessage());
    }

    @Test
    void unverifiedCustomerLoginReturnsOtpChallengeDetails() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setEmail("customer@example.com");
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        challenge.setUserId(user.getId());
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("password", "hash")).thenReturn(true);
        when(challenges.findFirstByUserIdAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
                user.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.login(new LoginRequest("customer@example.com", "password")));

        assertEquals("NEED_VERIFICATION", exception.code());
        assertEquals("EMAIL", exception.details().get("verificationChannel"));
        assertEquals(challenge.getId(), exception.details().get("challengeId"));
    }

    @Test
    void expiredOtpIsRejectedWithoutConsumingIt() {
        OtpChallenge challenge = challenge(Instant.now().minusSeconds(1), 0);
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setEmail("customer@example.com");
        when(challenges.findByIdAndPurpose("challenge", "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById("registration-user")).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));

        assertEquals("OTP_EXPIRED", exception.code());
        verify(challenges, never()).consumeIfValid(anyString(), anyString(), any());
    }

    @Test
    void invalidOtpIncrementsAttemptsAndLimitIsEnforced() {
        allowEmailRegistrationOtp();
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        when(challenges.findByIdAndPurpose("challenge", "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(challenges.incrementAttempts(anyString(), any())).thenReturn(1);

        ApiException invalid = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));

        assertEquals("OTP_INVALID", invalid.code());
        verify(challenges).incrementAttempts(anyString(), any());

        challenge.setAttempts(5);
        ApiException exhausted = assertThrows(ApiException.class,
                () -> service.verifyOtp(new AuthDtos.VerifyOtpRequest("challenge", "123456")));
        assertEquals("OTP_INVALID", exhausted.code());
    }

    @Test
    void mobileRegistrationRequiresVerifiedWidgetAccessTokenForActivation() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("widget-access-token")).thenReturn("+14155550123");
        when(challenges.consumeWidgetIfValid(eq(challenge.getId()), eq(user.getId()),
                eq("widget-request-id"), any()))
                .thenReturn(1);

        AuthDtos.OtpVerificationResponse response = service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "widget-access-token"));

        assertTrue(response.success());
        assertEquals("OTP_VERIFIED", response.code());
        assertEquals("ACTIVE", user.getStatus());
        assertTrue(user.getPhoneVerifiedAt() != null);
        verify(otpWidgetClient).verifyAccessToken("widget-access-token");
        verify(challenges).consumeWidgetIfValid(eq(challenge.getId()), eq(user.getId()),
                eq("widget-request-id"), any());
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void msg91AlreadyVerifiedOtpStillActivatesRegistration() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 1);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("widget-access-token"))
                .thenThrow(new Msg91OtpWidgetClient.AlreadyVerifiedException());
        when(challenges.consumeWidgetIfValid(eq(challenge.getId()), eq(user.getId()),
                eq("widget-request-id"), any())).thenReturn(1);

        AuthDtos.OtpVerificationResponse response = service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "widget-access-token"));

        assertTrue(response.success());
        assertEquals("OTP_ALREADY_VERIFIED", response.code());
        assertEquals("ACTIVE", user.getStatus());
        assertTrue(user.getPhoneVerifiedAt() != null);
        verify(challenges).consumeWidgetIfValid(eq(challenge.getId()), eq(user.getId()),
                eq("widget-request-id"), any());
    }

    @Test
    void repeatedWidgetVerificationReturnsSuccessWithoutCallingMsg91Again() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("ACTIVE");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        challenge.setVerifiedAt(Instant.now());
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        AuthDtos.OtpVerificationResponse response = service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "reused-access-token"));

        assertTrue(response.success());
        assertEquals("OTP_ALREADY_VERIFIED", response.code());
        assertTrue(user.getPhoneVerifiedAt() != null);
        verifyNoInteractions(otpWidgetClient);
        verify(challenges, never()).consumeWidgetIfValid(anyString(), anyString(), anyString(), any());
    }

    @Test
    void invalidWidgetAccessTokenIncrementsLocalAttemptsAndDoesNotActivateRegistration() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("invalid-access-token"))
                .thenThrow(new Msg91OtpWidgetClient.InvalidAccessTokenException());

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "invalid-access-token")));

        assertEquals("OTP_INVALID", exception.code());
        assertEquals("PENDING_VERIFICATION", user.getStatus());
        assertEquals(1, challenge.getAttempts());
        verify(challenges, never()).incrementAttempts(anyString(), any());
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void providerOtpInvalidIsSuccessWhenChallengeWasAlreadyVerified() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION"))
                .thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("reused-access-token"))
                .thenThrow(new Msg91OtpWidgetClient.InvalidAccessTokenException());
        when(challenges.existsByIdAndVerifiedAtIsNotNull(challenge.getId())).thenReturn(true);

        AuthDtos.OtpVerificationResponse response = service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "reused-access-token"));

        assertTrue(response.success());
        assertEquals("OTP_ALREADY_VERIFIED", response.code());
        assertEquals("ACTIVE", user.getStatus());
        assertTrue(user.getPhoneVerifiedAt() != null);
        verify(challenges, never()).incrementAttempts(anyString(), any());
        verify(challenges, never()).consumeWidgetIfValid(anyString(), anyString(), anyString(), any());
    }

    @Test
    void widgetAuthenticationFailureIsNotReportedAsInvalidOtp() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION"))
                .thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("access-token"))
                .thenThrow(new Msg91OtpWidgetClient.AuthenticationFailureException());

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "access-token")));

        assertEquals("MSG91_AUTHENTICATION_FAILED", exception.code());
        assertTrue(exception.getMessage().contains("Check AuthKey/WidgetId"));
        assertEquals(0, challenge.getAttempts());
        verify(challenges, never()).incrementAttempts(anyString(), any());
    }

    @Test
    void expiredWidgetChallengeIsRejectedBeforeCallingMsg91() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().minusSeconds(1), 0);
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "widget-access-token")));

        assertEquals("OTP_EXPIRED", exception.code());
        assertEquals("PENDING_VERIFICATION", user.getStatus());
        verifyNoInteractions(otpWidgetClient);
        verify(challenges, never()).consumeWidgetIfValid(anyString(), anyString(), anyString(), any());
    }

    @Test
    void supersededWidgetChallengeCannotBeVerified() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge oldChallenge = widgetChallenge(user, "old-request-id", Instant.now().plusSeconds(600), 0);
        OtpChallenge latestChallenge = widgetChallenge(user, "new-request-id", Instant.now().plusSeconds(600), 0);
        when(challenges.findByIdAndPurposeForUpdate(oldChallenge.getId(), "REGISTRATION"))
                .thenReturn(Optional.of(oldChallenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(challenges.findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(oldChallenge.getIdentifier()), eq("REGISTRATION"), any())).thenReturn(Optional.of(latestChallenge));

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(oldChallenge.getId(), "widget-access-token")));

        assertEquals("CHALLENGE_EXPIRED", exception.code());
        verifyNoInteractions(otpWidgetClient);
    }

    @Test
    void widgetTokenForAnotherPhoneCannotActivateRegistration() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        user.setPhone("+14155550123");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        allowMobileOtpSettings();
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(otpWidgetClient.verifyAccessToken("widget-access-token")).thenReturn("+14155550124");

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "widget-access-token")));

        assertEquals("OTP_INVALID", exception.code());
        assertEquals("PENDING_VERIFICATION", user.getStatus());
        verify(challenges, never()).consumeWidgetIfValid(anyString(), anyString(), anyString(), any());
    }

    @Test
    void resendCooldownReturnsGenericAcceptedResponseWithoutSendingOtp() {
        allowEmailOtpSettings();
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        challenge.setLastSentAt(Instant.now().minusSeconds(5));
        when(challenges.findById("challenge")).thenReturn(Optional.of(challenge));

        AuthDtos.ResendOtpResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("challenge"));

        assertEquals(false, response.accepted());
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void resendUnknownChallengeReturnsGenericAcceptedResponse() {
        when(challenges.findById("unknown")).thenReturn(Optional.empty());

        AuthDtos.ResendOtpResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("unknown"));

        assertEquals(false, response.accepted());
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void eligibleResendStillDeliversReplacementOtp() {
        allowEmailOtpSettings();
        OtpChallenge challenge = challenge(Instant.now().plusSeconds(600), 0);
        challenge.setDeliveryChannel("EMAIL");
        challenge.setLastSentAt(Instant.now().minusSeconds(60));
        when(challenges.findById("challenge")).thenReturn(Optional.of(challenge));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ResendOtpResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("challenge"));

        assertTrue(response.accepted());
        assertNotEquals("challenge", response.challengeId());
        verify(otpDelivery).send(eq("customer@example.com"), eq("EMAIL"), eq("REGISTRATION"),
                eq(response.challengeId()), anyString());
        verify(challenges).expirePendingByIdentifierAndPurpose(
                eq("customer@example.com"), eq("REGISTRATION"), any());
    }

    @Test
    void mobileRegistrationResendReservesChallengeForBrowserWidget() {
        allowMobileOtpSettings();
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        challenge.setLastSentAt(Instant.now().minusSeconds(60));
        when(challenges.findByIdAndPurpose(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ResendOtpResponse response = service.resendWidgetOtp(new AuthDtos.ResendOtpRequest(challenge.getId()));

        assertTrue(response.accepted());
        assertNotEquals(challenge.getId(), response.challengeId());
        ArgumentCaptor<OtpChallenge> replacement = ArgumentCaptor.forClass(OtpChallenge.class);
        verify(challenges).save(replacement.capture());
        assertEquals("+14155550123", replacement.getValue().getIdentifier());
        assertEquals("widget-request-id", replacement.getValue().getProviderRequestId());
        assertEquals(1, replacement.getValue().getResendCount());
        verify(challenges).findByIdAndPurpose(challenge.getId(), "REGISTRATION");
        verify(challenges).expirePendingByIdentifierAndPurpose(
                eq("+14155550123"), eq("REGISTRATION"), any());
        verifyNoInteractions(otpWidgetClient);
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void mobileRegistrationResendReturnsNotAllowedDuringCooldown() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        OtpChallenge challenge = widgetChallenge(user, "widget-request-id", Instant.now().plusSeconds(600), 0);
        challenge.setLastSentAt(Instant.now().minusSeconds(5));
        when(challenges.findByIdAndPurpose(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));

        AuthDtos.ResendOtpResponse response = service.resendWidgetOtp(new AuthDtos.ResendOtpRequest(challenge.getId()));

        assertEquals(false, response.accepted());
        assertEquals(0, challenge.getResendCount());
        verify(challenges, never()).save(any(OtpChallenge.class));
        verifyNoInteractions(otpWidgetClient);
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void widgetSendAcknowledgementStartsChallengeAndResendCooldown() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        OtpChallenge challenge = widgetChallenge(user, null, Instant.now().plusSeconds(600), 0);
        when(challenges.findByIdAndPurpose(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));
        when(users.findById(user.getId())).thenReturn(Optional.of(user));
        when(challenges.save(challenge)).thenReturn(challenge);
        allowMobileOtpSettings();

        AuthDtos.SimpleResponse response = service.registrationWidgetSent(
                new AuthDtos.WidgetOtpSentRequest(challenge.getId(), "widget-request-id"));

        assertTrue(response.accepted());
        assertEquals("widget-request-id", challenge.getProviderRequestId());
        assertTrue(challenge.getLastSentAt().isAfter(Instant.now().minusSeconds(5)));
        assertTrue(challenge.getExpiresAt().isAfter(Instant.now().plusSeconds(590)));
        verify(challenges).save(challenge);
    }

    @Test
    void resendIsRejectedUntilWidgetConfirmsInitialSend() {
        User user = userWithRole("CUSTOMER");
        user.setStatus("PENDING_VERIFICATION");
        OtpChallenge challenge = widgetChallenge(user, null, Instant.now().plusSeconds(600), 0);
        when(challenges.findByIdAndPurpose(challenge.getId(), "REGISTRATION")).thenReturn(Optional.of(challenge));

        AuthDtos.ResendOtpResponse response = service.resendWidgetOtp(new AuthDtos.ResendOtpRequest(challenge.getId()));

        assertEquals(false, response.accepted());
        verify(challenges, never()).save(any(OtpChallenge.class));
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void legacyResendEndpointCannotBypassBrowserWidget() {
        OtpChallenge challenge = widgetChallenge(new User(), null, Instant.now().plusSeconds(600), 0);
        when(challenges.findById(challenge.getId())).thenReturn(Optional.of(challenge));

        ApiException exception = assertThrows(ApiException.class,
                () -> service.resendOtp(new AuthDtos.ResendOtpRequest(challenge.getId())));

        assertEquals("OTP_WIDGET_CLIENT_REQUIRED", exception.code());
        verifyNoInteractions(otpWidgetClient);
    }

    @Test
    void expiredOtpCanBeResentWithinTheResendLimit() {
        allowEmailOtpSettings();
        OtpChallenge challenge = challenge(Instant.now().minusSeconds(1), 0);
        challenge.setLastSentAt(Instant.now().minusSeconds(60));
        when(challenges.findById("challenge")).thenReturn(Optional.of(challenge));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ResendOtpResponse response = service.resendOtp(new AuthDtos.ResendOtpRequest("challenge"));

        assertTrue(response.accepted());
        assertNotEquals("challenge", response.challengeId());
        verify(otpDelivery).send(eq("customer@example.com"), eq("EMAIL"), eq("REGISTRATION"),
                eq(response.challengeId()), anyString());
    }

    @Test
    void unknownForgotPasswordIdentifierReturnsAcceptedWithOpaqueDecoyChallengeId() {
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("unknown@example.com")).thenReturn(Optional.empty());
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ForgotPasswordResponse response =
                service.forgotPassword(new AuthDtos.IdentifierRequest("unknown@example.com"));

        assertTrue(response.accepted());
        assertTrue(response.challengeId() != null && !response.challengeId().isBlank());
        assertEquals("EMAIL", response.method());
        assertEquals("CHECK_EMAIL", response.nextStep());
        assertEquals("If an account exists, reset instructions have been sent.", response.message());
        verify(challenges).save(argThat(challenge -> challenge.getUserId() == null
                && "PASSWORD_RESET".equals(challenge.getPurpose())));
        verifyNoInteractions(otpDelivery);
    }

    @Test
    void forgotPasswordSendsAnEmailResetLinkWithoutExposingItsToken() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        user.setEmailVerifiedAt(Instant.now());
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));
        when(challenges.save(any(OtpChallenge.class))).thenReturn(challenge);

        AuthDtos.ForgotPasswordResponse response =
                service.forgotPassword(new AuthDtos.IdentifierRequest("CUSTOMER@EXAMPLE.COM"));

        assertTrue(response.accepted());
        assertEquals("EMAIL", response.method());
        assertEquals("CHECK_EMAIL", response.nextStep());
        assertEquals(challenge.getId(), response.challengeId());
        verify(otpDelivery).sendPasswordResetLink(eq("customer@example.com"), contains("/reset-password?identifier="));
    }

    @Test
    void forgotPasswordUsesTheRegistrationWidgetForPhoneWithoutFlowSms() {
        User user = userWithRole("CUSTOMER");
        user.setEmail(null);
        user.setPhone("+918328105293");
        when(users.findByPhoneAndDeletedAtIsNull("+918328105293")).thenReturn(Optional.of(user));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        for (String identifier : Set.of("8328105293", "+918328105293", "918328105293")) {
            AuthDtos.ForgotPasswordResponse response =
                    service.forgotPassword(new AuthDtos.IdentifierRequest(identifier));
            assertEquals("PHONE", response.method());
            assertEquals("VERIFY_OTP", response.nextStep());
        }
        verifyNoInteractions(otpDelivery);
        verify(challenges, times(3)).save(argThat(challenge ->
                "PASSWORD_RESET".equals(challenge.getPurpose())
                        && "SMS".equals(challenge.getDeliveryChannel())
                        && challenge.getCodeHash() == null));
    }

    @Test
    void passwordResetWidgetAcknowledgesSentRequestAndExchangesProviderToken() {
        User user = userWithRole("CUSTOMER");
        user.setPhone("+918328105293");
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(user.getPhone());
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("SMS");
        challenge.setExpiresAt(Instant.now().plusSeconds(600));
        challenge.setLastSentAt(Instant.now());
        challenge.setProviderRequestId("widget-request");
        when(challenges.findByIdAndPurpose(challenge.getId(), "PASSWORD_RESET"))
                .thenReturn(Optional.of(challenge));
        when(challenges.findByIdAndPurposeForUpdate(challenge.getId(), "PASSWORD_RESET"))
                .thenReturn(Optional.of(challenge));
        when(challenges.findFirstByIdentifierAndPurposeAndExpiresAtAfterOrderByCreatedAtDesc(
                eq(challenge.getIdentifier()), eq(challenge.getPurpose()), any()))
                .thenReturn(Optional.of(challenge));
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(otpWidgetClient.verifyAccessToken("widget-access-token")).thenReturn(user.getPhone());
        when(challenges.consumeResetWidgetIfValid(eq(challenge.getId()), eq("widget-request"), any()))
                .thenReturn(1);

        AuthDtos.SimpleResponse sent = service.passwordResetWidgetSent(
                new AuthDtos.WidgetOtpSentRequest(challenge.getId(), "widget-request"));
        AuthDtos.ResetOtpVerificationResponse verified = service.verifyResetWidgetAccessToken(
                new AuthDtos.WidgetAccessTokenRequest(challenge.getId(), "widget-access-token"));

        assertTrue(sent.accepted());
        assertTrue(verified.verified());
        assertTrue(verified.resetToken().length() >= 40);
        verify(otpWidgetClient).verifyAccessToken("widget-access-token");
        verify(otpDelivery, never()).send(anyString(), anyString(), anyString(), anyString(), anyString());
    }

    @Test
    void verifyResetOtpExchangesAValidPhoneOtpForAShortLivedToken() {
        User user = userWithRole("CUSTOMER");
        user.setEmail(null);
        user.setPhone("+918328105293");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        challenge.setIdentifier(user.getPhone());
        challenge.setDeliveryChannel("SMS");
        when(users.findByPhoneAndDeletedAtIsNull("+918328105293")).thenReturn(Optional.of(user));
        when(challenges.findFirstByIdentifierAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
                user.getPhone(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.consumeIfValid(eq(challenge.getId()), eq(challenge.getCodeHash()), any())).thenReturn(1);
        when(challenges.save(any(OtpChallenge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AuthDtos.ResetOtpVerificationResponse response = service.verifyResetOtp(
                new AuthDtos.VerifyResetOtpRequest("8328105293", "123456"));

        assertTrue(response.verified());
        assertEquals(600, response.expiresInSeconds());
        assertTrue(response.resetToken().length() >= 40);
        assertEquals(hashToken(response.resetToken()), challenge.getCodeHash());
        assertTrue(challenge.getVerifiedAt() != null);
    }

    @Test
    void wrongResetOtpIsRejectedAndCountsTowardTheLockout() {
        User user = userWithRole("CUSTOMER");
        user.setEmail(null);
        user.setPhone("+918328105293");
        OtpChallenge challenge = passwordResetChallenge(user, Instant.now().plusSeconds(600), "123456");
        challenge.setIdentifier(user.getPhone());
        when(users.findByPhoneAndDeletedAtIsNull("+918328105293")).thenReturn(Optional.of(user));
        when(challenges.findFirstByIdentifierAndPurposeAndVerifiedAtIsNullOrderByCreatedAtDesc(
                user.getPhone(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.incrementPasswordResetAttempts(eq(challenge.getId()), any(), any())).thenReturn(1);

        ApiException exception = assertThrows(ApiException.class, () -> service.verifyResetOtp(
                new AuthDtos.VerifyResetOtpRequest("8328105293", "654321")));

        assertEquals("OTP_INVALID", exception.code());
        verify(challenges).incrementPasswordResetAttempts(eq(challenge.getId()), any(), any());
    }

    @Test
    void resetTokenAllowsSubsequentLoginWithEmailAndPhone() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        user.setPhone("+918328105293");
        user.setEmailVerifiedAt(Instant.now());
        user.setPhoneVerifiedAt(Instant.now());
        String resetToken = "opaque-reset-token";
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(user.getPhone());
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("SMS");
        challenge.setCodeHash(hashToken(resetToken));
        challenge.setVerifiedAt(Instant.now());
        challenge.setExpiresAt(Instant.now().plusSeconds(600));
        when(users.findByPhoneAndDeletedAtIsNull(user.getPhone())).thenReturn(Optional.of(user));
        when(challenges.findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(
                user.getPhone(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.consumeResetToken(eq(challenge.getId()), eq(challenge.getCodeHash()), any())).thenReturn(1);
        when(passwordEncoder.encode("NewSecurePassword123!")).thenReturn("new-password-hash");
        when(passwordEncoder.matches("NewSecurePassword123!", "new-password-hash")).thenReturn(true);
        when(jwtService.issue(user)).thenReturn("access-token");
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull("customer@example.com")).thenReturn(Optional.of(user));

        service.resetPassword(new AuthDtos.ResetPasswordRequest(
                user.getPhone(), resetToken, null, null, "NewSecurePassword123!"));

        assertEquals("access-token", service.login(
                new LoginRequest("8328105293", "NewSecurePassword123!")).accessToken());
        assertEquals("access-token", service.login(
                new LoginRequest("customer@example.com", "NewSecurePassword123!")).accessToken());
    }

    @Test
    void emailResetLinkTokenCanResetPassword() {
        User user = userWithRole("CUSTOMER");
        user.setEmail("customer@example.com");
        String resetToken = "email-reset-token";
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier(user.getEmail());
        challenge.setPurpose("PASSWORD_RESET");
        challenge.setDeliveryChannel("EMAIL");
        challenge.setCodeHash(hashToken(resetToken));
        challenge.setExpiresAt(Instant.now().plusSeconds(900));
        when(users.findByEmailIgnoreCaseAndDeletedAtIsNull(user.getEmail())).thenReturn(Optional.of(user));
        when(challenges.findFirstByIdentifierAndPurposeOrderByCreatedAtDesc(
                user.getEmail(), "PASSWORD_RESET")).thenReturn(Optional.of(challenge));
        when(challenges.consumeResetToken(eq(challenge.getId()), eq(challenge.getCodeHash()), any())).thenReturn(1);
        when(passwordEncoder.encode("NewSecurePassword123!")).thenReturn("new-password-hash");

        AuthDtos.ResetPasswordResponse response = service.resetPassword(new AuthDtos.ResetPasswordRequest(
                user.getEmail(), resetToken, null, null, "NewSecurePassword123!"));

        assertTrue(response.reset());
        assertEquals("new-password-hash", user.getPasswordHash());
        verify(challenges).consumeResetToken(eq(challenge.getId()), eq(challenge.getCodeHash()), any());
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
        user.setEmailVerifiedAt(Instant.now());
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
        challenge.setUserId("registration-user");
        challenge.setIdentifier("customer@example.com");
        challenge.setPurpose("REGISTRATION");
        challenge.setDeliveryChannel("EMAIL");
        challenge.setCodeHash("not-the-hash");
        challenge.setExpiresAt(expiresAt);
        challenge.setAttempts(attempts);
        return challenge;
    }

    private OtpChallenge widgetChallenge(User user, String requestId, Instant expiresAt, int attempts) {
        OtpChallenge challenge = new OtpChallenge();
        challenge.setUserId(user.getId());
        challenge.setIdentifier("+14155550123");
        challenge.setPurpose("REGISTRATION");
        challenge.setDeliveryChannel("SMS");
        challenge.setProviderRequestId(requestId);
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

    private String hashToken(String token) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
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

    private Role role(String code) {
        Role role = new Role();
        role.setCode(code);
        return role;
    }

    private void allowEmailRegistrationOtp() {
        allowEmailOtpSettings();
        User pendingUser = userWithRole("CUSTOMER");
        pendingUser.setStatus("PENDING_VERIFICATION");
        pendingUser.setEmail("customer@example.com");
        when(users.findById("registration-user")).thenReturn(Optional.of(pendingUser));
    }

    private void allowEmailOtpSettings() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(true, false, true));
    }

    private void allowMobileOtpSettings() {
        when(registrationOtpSettings.current()).thenReturn(new AuthDtos.RegistrationOtpOptions(false, true, true));
    }
}
