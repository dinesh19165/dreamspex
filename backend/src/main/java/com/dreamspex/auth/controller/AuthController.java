package com.dreamspex.auth.controller;


import com.dreamspex.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import static com.dreamspex.auth.dto.AuthDtos.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) { this.authService = authService; }

    @GetMapping("/registration-options")
    RegistrationOtpOptions registrationOtpOptions() { return authService.registrationOtpOptions(); }

    @GetMapping("/registration-widget-config")
    ResponseEntity<RegistrationWidgetConfig> registrationWidgetConfig() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(authService.registrationWidgetConfig());
    }

    @GetMapping("/password-reset-widget-config")
    ResponseEntity<RegistrationWidgetConfig> passwordResetWidgetConfig() {
        return ResponseEntity.ok().cacheControl(CacheControl.noStore()).body(authService.passwordResetWidgetConfig());
    }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    RegisterResponse register(@Valid @RequestBody RegisterRequest request) { return authService.register(request); }

    @PostMapping("/registration/contact")
    RegisterResponse changeRegistrationContact(@Valid @RequestBody ChangeRegistrationRequest request) {
        return authService.changeRegistrationContact(request);
    }

    @PostMapping("/login")
    TokenResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }

    @PostMapping("/admin/login")
    TokenResponse adminLogin(@Valid @RequestBody LoginRequest request) { return authService.adminLogin(request); }

    @PostMapping("/franchise/login")
    TokenResponse franchiseLogin(@Valid @RequestBody LoginRequest request) { return authService.franchiseLogin(request); }

    @PostMapping("/verify-otp")
    OtpVerificationResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request) {
        return authService.verifyOtp(request);
    }

    @PostMapping("/verify-widget-access-token")
    OtpVerificationResponse verifyWidgetAccessToken(@Valid @RequestBody WidgetAccessTokenRequest request) {
        return authService.verifyWidgetAccessToken(request);
    }

    @PostMapping("/registration-widget-sent")
    SimpleResponse registrationWidgetSent(@Valid @RequestBody WidgetOtpSentRequest request) {
        return authService.registrationWidgetSent(request);
    }

    @PostMapping("/password-reset-widget-sent")
    SimpleResponse passwordResetWidgetSent(@Valid @RequestBody WidgetOtpSentRequest request) {
        return authService.passwordResetWidgetSent(request);
    }

    @PostMapping("/resend-otp")
    ResendOtpResponse resendOtp(@Valid @RequestBody ResendOtpRequest request) {
        return authService.resendOtp(request);
    }

    @PostMapping("/resend-widget-otp")
    ResendOtpResponse resendWidgetOtp(@Valid @RequestBody ResendOtpRequest request) {
        return authService.resendWidgetOtp(request);
    }

    @PostMapping("/resend-password-reset-widget-otp")
    ResendOtpResponse resendPasswordResetWidgetOtp(@Valid @RequestBody ResendOtpRequest request) {
        return authService.resendPasswordResetWidgetOtp(request);
    }

    @PostMapping("/forgot-password")
    ForgotPasswordResponse forgotPassword(@Valid @RequestBody IdentifierRequest request) { return authService.forgotPassword(request); }

    @PostMapping("/verify-reset-otp")
    ResetOtpVerificationResponse verifyResetOtp(@Valid @RequestBody VerifyResetOtpRequest request) {
        return authService.verifyResetOtp(request);
    }

    @PostMapping("/verify-reset-widget-access-token")
    ResetOtpVerificationResponse verifyResetWidgetAccessToken(
            @Valid @RequestBody WidgetAccessTokenRequest request) {
        return authService.verifyResetWidgetAccessToken(request);
    }

    @PostMapping("/reset-password")
    ResetPasswordResponse resetPassword(@Valid @RequestBody ResetPasswordRequest request) {
        return authService.resetPassword(request);
    }

    @PostMapping("/franchise/setup")
    ResetPasswordResponse setupFranchisePassword(@Valid @RequestBody FranchiseSetupRequest request) {
        return authService.setupFranchisePassword(request);
    }

    @PostMapping("/refresh")
    TokenResponse refresh(@Valid @RequestBody RefreshRequest request) { return authService.refresh(request); }

    @PostMapping("/logout")
    SimpleResponse logout(@Valid @RequestBody RefreshRequest request) { return authService.logout(request); }
}
