package com.dreamspex.config;

import jakarta.annotation.PostConstruct;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
public class ProfileSelectionValidator {
    private final Environment environment;

    public ProfileSelectionValidator(Environment environment) {
        this.environment = environment;
    }

    @PostConstruct
    public void validate() {
        if (environment.getActiveProfiles().length == 0) {
            throw new IllegalStateException(
                    "Select an application profile explicitly with SPRING_PROFILES_ACTIVE (local, test, staging, prod, or production).");
        }
    }
}
