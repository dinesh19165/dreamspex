package com.dreamspex.auth.service;


import com.dreamspex.auth.entity.Address;
import com.dreamspex.auth.entity.CustomerProfile;
import com.dreamspex.auth.entity.Role;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.auth.repository.CustomerProfileRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.List;
import java.util.Set;

import static com.dreamspex.auth.dto.AuthDtos.*;

@Service
public class AccountService {
    private final CurrentUser currentUser;
    private final CustomerProfileRepository profiles;
    private final AddressRepository addresses;

    public AccountService(CurrentUser currentUser, CustomerProfileRepository profiles, AddressRepository addresses) {
        this.currentUser = currentUser;
        this.profiles = profiles;
        this.addresses = addresses;
    }

    @Transactional(readOnly = true)
    public ProfileResponse getProfile(org.springframework.security.core.Authentication authentication) {
        User user = currentUser.require(authentication);
        CustomerProfile profile = profiles.findByUserId(user.getId()).orElse(null);
        return profileResponse(user, profile);
    }

    @Transactional
    public ProfileResponse updateProfile(org.springframework.security.core.Authentication authentication,
                                         ProfileUpdateRequest request) {
        User user = currentUser.require(authentication);
        if (request.displayName() != null) {
            String name = request.displayName().trim();
            if (name.isBlank()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "Display name is required.");
            user.setDisplayName(name);
        }
        CustomerProfile profile = profiles.findByUserId(user.getId()).orElseGet(() -> {
            CustomerProfile value = new CustomerProfile();
            value.setUser(user);
            return value;
        });
        if (request.firstName() != null) profile.setFirstName(request.firstName().trim());
        if (request.lastName() != null) profile.setLastName(request.lastName().trim());
        if (request.dateOfBirth() != null) profile.setDateOfBirth(request.dateOfBirth());
        if (request.gender() != null) profile.setGender(request.gender().trim());
        if (request.marketingOptIn() != null) profile.setMarketingOptIn(request.marketingOptIn());
        profiles.save(profile);
        return profileResponse(user, profile);
    }

    @Transactional(readOnly = true)
    public List<AddressResponse> listAddresses(org.springframework.security.core.Authentication authentication) {
        User user = currentUser.require(authentication);
        return addresses.findByUserIdAndDeletedAtIsNullOrderByDefaultAddressDescCreatedAtDesc(user.getId())
                .stream().map(AccountService::addressResponse).toList();
    }

    @Transactional
    public AddressResponse createAddress(org.springframework.security.core.Authentication authentication,
                                         AddressRequest request) {
        User user = currentUser.require(authentication);
        Address address = new Address();
        address.setUser(user);
        copy(request, address);
        if (request.defaultAddress() || addresses.findByUserIdAndDeletedAtIsNullOrderByDefaultAddressDescCreatedAtDesc(user.getId()).isEmpty()) {
            clearDefaults(user.getId());
            address.setDefaultAddress(true);
        }
        return addressResponse(addresses.save(address));
    }

    @Transactional
    public AddressResponse updateAddress(org.springframework.security.core.Authentication authentication,
                                         String id, AddressRequest request) {
        User user = currentUser.require(authentication);
        Address address = addresses.findByIdAndUserIdAndDeletedAtIsNull(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND", "Address was not found."));
        copy(request, address);
        if (request.defaultAddress()) {
            clearDefaults(user.getId());
            address.setDefaultAddress(true);
        }
        return addressResponse(addresses.save(address));
    }

    @Transactional
    public void deleteAddress(org.springframework.security.core.Authentication authentication, String id) {
        User user = currentUser.require(authentication);
        Address address = addresses.findByIdAndUserIdAndDeletedAtIsNull(id, user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "ADDRESS_NOT_FOUND", "Address was not found."));
        address.setDeletedAt(Instant.now());
        address.setDefaultAddress(false);
        addresses.save(address);
    }

    private void clearDefaults(String userId) {
        List<Address> values = addresses.findByUserIdAndDeletedAtIsNullOrderByDefaultAddressDescCreatedAtDesc(userId);
        values.forEach(value -> value.setDefaultAddress(false));
        addresses.saveAll(values);
    }

    private static void copy(AddressRequest request, Address address) {
        if ((request.latitude() == null) != (request.longitude() == null)) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR",
                    "Latitude and longitude must be provided together.");
        }
        address.setLabel(trim(request.label()));
        address.setRecipientName(request.recipientName().trim());
        address.setPhone(request.phone());
        address.setLine1(request.line1().trim());
        address.setLine2(trim(request.line2()));
        address.setCity(request.city().trim());
        address.setState(request.state().trim());
        address.setPostalCode(request.postalCode().trim());
        address.setCountryCode(request.countryCode().toUpperCase());
        address.setLatitude(request.latitude());
        address.setLongitude(request.longitude());
        address.setDefaultAddress(request.defaultAddress());
    }

    private static String trim(String value) { return value == null ? null : value.trim(); }

    private static ProfileResponse profileResponse(User user, CustomerProfile profile) {
        return new ProfileResponse(user.getId(), user.getDisplayName(), user.getEmail(), user.getPhone(),
                profile == null ? null : profile.getFirstName(), profile == null ? null : profile.getLastName(),
                profile == null ? null : profile.getDateOfBirth(), profile == null ? null : profile.getGender(),
                profile != null && profile.isMarketingOptIn(),
                user.getRoles().stream().map(Role::getCode).collect(java.util.stream.Collectors.toSet()));
    }

    private static AddressResponse addressResponse(Address value) {
        return new AddressResponse(value.getId(), value.getLabel(), value.getRecipientName(), value.getPhone(),
                value.getLine1(), value.getLine2(), value.getCity(), value.getState(), value.getPostalCode(),
                value.getCountryCode(), value.isDefaultAddress(), value.getLatitude(), value.getLongitude());
    }
}
