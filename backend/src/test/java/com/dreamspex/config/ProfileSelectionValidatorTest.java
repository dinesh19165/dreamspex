package com.dreamspex.config;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;

class ProfileSelectionValidatorTest {
    @Test
    void requiresAnExplicitActiveProfile() {
        assertThrows(IllegalStateException.class,
                () -> new ProfileSelectionValidator(new MockEnvironment()).validate());
    }

    @Test
    void allowsExplicitLocalDevelopmentProfile() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("local");

        assertDoesNotThrow(() -> new ProfileSelectionValidator(environment).validate());
    }

    @Test
    void allowsExplicitStagingProfile() {
        MockEnvironment environment = new MockEnvironment();
        environment.setActiveProfiles("staging");

        assertDoesNotThrow(() -> new ProfileSelectionValidator(environment).validate());
    }
}
