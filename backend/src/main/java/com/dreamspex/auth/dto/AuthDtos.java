package com.dreamspex.auth.dto;


import com.fasterxml.jackson.annotation.JsonAlias;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.PhoneNumberNormalizer;
import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.util.Set;

public final class AuthDtos {
    private AuthDtos() {}
    public record RegisterRequest(
            @NotBlank @Size(max = 160) String name,
            @Email String email,
            @Size(max = 32) @Pattern(regexp = "^[+0-9\\s().-]*$", message = "Enter a valid phone number") String phone,
            @NotBlank @Size(min = 12, max = 128) @Utf8ByteSize(max = 72) String password,
            @Size(max = 32) @Pattern(regexp = "^[A-Za-z0-9-]*$") String referralCode,
            @Pattern(regexp = "^(EMAIL|SMS)?$") String verificationChannel) {
        public RegisterRequest(String name, String email, String phone, String password) {
            this(name, email, phone, password, null, null);
        }
        public RegisterRequest(String name, String email, String phone, String password, String referralCode) {
            this(name, email, phone, password, referralCode, null);
        }
    }
    public record ChangeRegistrationRequest(
            @NotBlank String challengeId,
            @NotBlank @Size(min = 12, max = 128) @Utf8ByteSize(max = 72) String password,
            @Email String email,
            @Size(max = 32) @Pattern(regexp = "^[+0-9\\s().-]*$", message = "Enter a valid phone number") String phone,
            @NotBlank @Pattern(regexp = "^(EMAIL|SMS)$") String verificationChannel) {}
    public record RegistrationOtpOptions(boolean emailOtpEnabled, boolean mobileOtpEnabled,
                                         boolean smsConfigured) {}
    public record RegistrationWidgetConfig(String widgetId, String tokenAuth) {}
    public record LoginRequest(@NotBlank @JsonAlias("email") String identifier, @NotBlank String password) {}
    public record ResendOtpRequest(@NotBlank String challengeId) {}
    public record WidgetOtpSentRequest(@NotBlank String challengeId,
                                      @NotBlank @Size(max = 256) String requestId) {}
    public record WidgetAccessTokenRequest(@NotBlank String challengeId,
                                           @NotBlank @Size(max = 8192) String accessToken) {}
    public record OtpVerificationResponse(boolean success, String code, String message) {}
    public record ResendOtpResponse(boolean accepted, String challengeId) {}
    public record VerifyOtpRequest(@NotBlank String challengeId, @NotBlank @Pattern(regexp = "^\\d{6}$") String otp) {}
    public record ResetPasswordRequest(String identifier, String resetToken, String challengeId,
                                       @Pattern(regexp = "^\\d{6}$") String otp,
                                       @NotBlank @Size(min = 12, max = 128) @Utf8ByteSize(max = 72) String newPassword) {
        public ResetPasswordRequest(String challengeId, String otp, String newPassword) {
            this(null, null, challengeId, otp, newPassword);
        }
    }
    public record VerifyResetOtpRequest(@NotBlank @JsonAlias("email") String identifier,
                                        @NotBlank @Pattern(regexp = "^\\d{6}$") String otp) {}
    public record FranchiseSetupRequest(@NotBlank @Size(min = 40, max = 200) String token,
                                        @NotBlank @Size(min = 12, max = 128) @Utf8ByteSize(max = 72) String newPassword) {}
    public record IdentifierRequest(@NotBlank @JsonAlias("email") String identifier) {}
    public record RefreshRequest(@NotBlank String refreshToken) {}
    public record RegisterResponse(String userId, boolean verificationRequired, Set<String> channels, String challengeId) {}
    public record TokenResponse(String accessToken, String refreshToken, long expiresIn, UserResponse user) {}
    public record UserResponse(String id, String displayName, String email, String phone, Set<String> roles) {
        public static UserResponse from(User user) {
            return new UserResponse(user.getId(), user.getDisplayName(), user.getEmail(),
                    PhoneNumberNormalizer.normalizeOrOriginal(user.getPhone()),
                    user.getRoles().stream().map(Role::getCode).collect(java.util.stream.Collectors.toSet()));
        }
    }
    public record SimpleResponse(boolean accepted) {}
    public record ForgotPasswordResponse(boolean accepted, String method, String nextStep,
                                         String message, String challengeId) {}
    public record ResetOtpVerificationResponse(boolean verified, String resetToken, long expiresInSeconds) {}
    public record ResetPasswordResponse(boolean reset, boolean accepted) {}
    public record ProfileResponse(String id, String displayName, String email, String phone,
                                  String firstName, String lastName, java.time.LocalDate dateOfBirth,
                                  String gender, boolean marketingOptIn, boolean whatsappMarketingOptIn,
                                  boolean whatsappMarketingOptOut,
                                  java.time.Instant whatsappConsentAt, String whatsappConsentSource, Set<String> roles) {}
    public record ProfileUpdateRequest(@Size(max = 160) String displayName, @Size(max = 80) String firstName,
                                       @Size(max = 80) String lastName, java.time.LocalDate dateOfBirth,
                                       @Size(max = 32) String gender, Boolean marketingOptIn) {}
    public record WhatsappMarketingConsentRequest(@NotNull Boolean optedIn) {}
    public record AddressRequest(@Size(max = 60) String label, @NotBlank @Size(max = 160) String recipientName,
                                 @NotBlank @Pattern(regexp = "^\\+[1-9]\\d{7,14}$") String phone,
                                 @NotBlank @Size(max = 255) String line1, @Size(max = 255) String line2,
                                 @NotBlank @Size(max = 100) String city, @NotBlank @Size(max = 100) String state,
                                 @NotBlank @Size(max = 16) String postalCode,
                                 @NotBlank @Pattern(regexp = "^[A-Za-z]{2}$") String countryCode,
                                 boolean defaultAddress,
                                 @DecimalMin("-90.0") @DecimalMax("90.0") BigDecimal latitude,
                                 @DecimalMin("-180.0") @DecimalMax("180.0") BigDecimal longitude) {}
    public record AddressResponse(String id, String label, String recipientName, String phone, String line1,
                                  String line2, String city, String state, String postalCode, String countryCode,
                                  boolean defaultAddress, BigDecimal latitude, BigDecimal longitude) {}
}
