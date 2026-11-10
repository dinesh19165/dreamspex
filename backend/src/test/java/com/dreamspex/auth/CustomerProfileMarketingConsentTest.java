package com.dreamspex.auth;

import com.dreamspex.auth.entity.CustomerProfile;
import org.junit.jupiter.api.Test;

import java.time.Instant;

import static org.junit.jupiter.api.Assertions.*;

class CustomerProfileMarketingConsentTest {
    @Test
    void whatsappConsentStartsDisabledAndCanBeWithdrawn() {
        CustomerProfile profile = new CustomerProfile();

        assertFalse(profile.isWhatsappMarketingOptIn());
        assertFalse(profile.isWhatsappMarketingOptOut());
        assertNull(profile.getWhatsappConsentAt());
        assertNull(profile.getWhatsappConsentSource());
        profile.setWhatsappMarketingOptIn(true);
        assertTrue(profile.isWhatsappMarketingOptIn());
        assertFalse(profile.isWhatsappMarketingOptOut());
        assertNotNull(profile.getWhatsappConsentAt());
        assertEquals("CUSTOMER_ACCOUNT", profile.getWhatsappConsentSource());

        profile.setWhatsappMarketingOptIn(false);
        assertFalse(profile.isWhatsappMarketingOptIn());
        assertTrue(profile.isWhatsappMarketingOptOut());
        assertNotNull(profile.getWhatsappConsentAt());
        assertEquals("CUSTOMER_ACCOUNT", profile.getWhatsappConsentSource());
    }

    @Test
    void repeatedPreferenceSaveDoesNotChangeConsentTimestamp() {
        CustomerProfile profile = new CustomerProfile();
        profile.setWhatsappMarketingOptIn(true);
        Instant consentAt = profile.getWhatsappConsentAt();

        profile.setWhatsappMarketingOptIn(true);

        assertEquals(consentAt, profile.getWhatsappConsentAt());
    }
}
