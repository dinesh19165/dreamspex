package com.dreamspex.auth;

import com.dreamspex.auth.entity.CustomerProfile;
import com.dreamspex.auth.entity.User;
import com.dreamspex.auth.repository.AddressRepository;
import com.dreamspex.auth.repository.CustomerProfileRepository;
import com.dreamspex.auth.service.AccountService;
import com.dreamspex.security.CurrentUser;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;

import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class AccountServiceWhatsappConsentTest {
    @Test
    void savesAndReturnsOptInAndWithdrawalWithoutProfileUpdateResettingIt() {
        CurrentUser current = mock(CurrentUser.class);
        CustomerProfileRepository profiles = mock(CustomerProfileRepository.class);
        User user = new User();
        user.setDisplayName("Customer");
        when(current.require(any(Authentication.class))).thenReturn(user);
        CustomerProfile profile = new CustomerProfile();
        profile.setUser(user);
        when(profiles.findByUserId(user.getId())).thenReturn(Optional.of(profile));

        AccountService service = new AccountService(current, profiles, mock(AddressRepository.class));
        Authentication authentication = mock(Authentication.class);

        var optedIn = service.updateWhatsappMarketingConsent(authentication, true);
        assertTrue(optedIn.whatsappMarketingOptIn());
        assertFalse(optedIn.whatsappMarketingOptOut());
        assertNotNull(optedIn.whatsappConsentAt());
        assertEquals("CUSTOMER_ACCOUNT", optedIn.whatsappConsentSource());
        verify(profiles).save(profile);

        service.updateProfile(authentication, new com.dreamspex.auth.dto.AuthDtos.ProfileUpdateRequest(
                null, null, null, null, null, null));
        assertTrue(profile.isWhatsappMarketingOptIn());
        assertFalse(profile.isWhatsappMarketingOptOut());

        var withdrawn = service.updateWhatsappMarketingConsent(authentication, false);
        assertFalse(withdrawn.whatsappMarketingOptIn());
        assertTrue(withdrawn.whatsappMarketingOptOut());
        assertNotNull(withdrawn.whatsappConsentAt());
        assertEquals("CUSTOMER_ACCOUNT", withdrawn.whatsappConsentSource());
        verify(profiles, times(3)).save(profile);
    }
}
