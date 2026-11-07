package com.dreamspex.auth.controller;


import com.dreamspex.auth.service.AccountService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

import static com.dreamspex.auth.dto.AuthDtos.*;

@RestController
@RequestMapping("/api/v1/me")
@PreAuthorize("hasRole('CUSTOMER')")
public class AccountController {
    private final AccountService service;

    public AccountController(AccountService service) { this.service = service; }

    @GetMapping
    ProfileResponse getProfile(Authentication authentication) { return service.getProfile(authentication); }

    @PatchMapping
    ProfileResponse updateProfile(Authentication authentication, @Valid @RequestBody ProfileUpdateRequest request) {
        return service.updateProfile(authentication, request);
    }

    @GetMapping("/addresses")
    List<AddressResponse> listAddresses(Authentication authentication) { return service.listAddresses(authentication); }

    @PostMapping("/addresses")
    @ResponseStatus(HttpStatus.CREATED)
    AddressResponse createAddress(Authentication authentication, @Valid @RequestBody AddressRequest request) {
        return service.createAddress(authentication, request);
    }

    @PatchMapping("/addresses/{id}")
    AddressResponse updateAddress(Authentication authentication, @PathVariable String id,
                                  @Valid @RequestBody AddressRequest request) {
        return service.updateAddress(authentication, id, request);
    }

    @DeleteMapping("/addresses/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void deleteAddress(Authentication authentication, @PathVariable String id) {
        service.deleteAddress(authentication, id);
    }
}
