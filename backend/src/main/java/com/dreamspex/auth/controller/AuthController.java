package com.dreamspex.auth.controller;


import com.dreamspex.auth.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import static com.dreamspex.auth.dto.AuthDtos.*;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {
    private final AuthService authService;

    public AuthController(AuthService authService) { this.authService = authService; }

    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    RegisterResponse register(@Valid @RequestBody RegisterRequest request) { return authService.register(request); }

    @PostMapping("/login")
    TokenResponse login(@Valid @RequestBody LoginRequest request) { return authService.login(request); }

    @PostMapping("/admin/login")
    TokenResponse adminLogin(@Valid @RequestBody LoginRequest request) { return authService.adminLogin(request); }

    @PostMapping("/franchise/login")
    TokenResponse franchiseLogin(@Valid @RequestBody LoginRequest request) { return authService.franchiseLogin(request); }

    @PostMapping("/verify-otp")
    SimpleResponse verifyOtp(@Valid @RequestBody VerifyOtpRequest request) { return authService.verifyOtp(request); }

    @PostMapping("/resend-otp")
    SimpleResponse resendOtp(@Valid @RequestBody ResendOtpRequest request) { return authService.resendOtp(request); }

    @PostMapping("/forgot-password")
    ForgotPasswordResponse forgotPassword(@Valid @RequestBody IdentifierRequest request) { return authService.forgotPassword(request); }

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
