package com.dreamspex.auth;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class PhoneNumberNormalizerTest {
    @Test
    void normalizesCommonIndianInputsToE164() {
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("9876543210"));
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("98765 43210"));
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("098765-43210"));
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("91 (98765) 43210"));
        assertEquals("+919876543210", PhoneNumberNormalizer.normalize("+91 98765 43210"));
    }

    @Test
    void preservesValidInternationalE164AndRejectsInvalidNumbers() {
        assertEquals("+14155552671", PhoneNumberNormalizer.normalize("+1 (415) 555-2671"));
        assertNull(PhoneNumberNormalizer.normalize("1234567890"));
        assertNull(PhoneNumberNormalizer.normalize("+91 12345 67890"));
        assertNull(PhoneNumberNormalizer.normalize("not a phone"));
        assertNull(PhoneNumberNormalizer.normalize("  "));
    }
}
