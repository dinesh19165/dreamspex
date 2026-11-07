package com.dreamspex.bootstrap;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

import java.io.Console;
import java.util.Locale;

@Component
public class LocalSuperAdminBootstrap implements ApplicationRunner {
    private static final String COMMAND = "--bootstrap-admin";
    private static final String PRODUCTION_PROFILE = "prod";

    private final LocalSuperAdminBootstrapService bootstrapService;
    private final Environment environment;

    public LocalSuperAdminBootstrap(LocalSuperAdminBootstrapService bootstrapService, Environment environment) {
        this.bootstrapService = bootstrapService;
        this.environment = environment;
    }

    @Override
    public void run(ApplicationArguments args) {
        if (!args.containsOption(COMMAND.substring(2))) {
            return;
        }
        if (environment.matchesProfiles(PRODUCTION_PROFILE, "production")) {
            throw new IllegalStateException("The local SUPER_ADMIN bootstrap is disabled under the prod profile.");
        }

        Console console = System.console();
        if (console == null) {
            throw new IllegalStateException("An interactive console is required; password input must not be provided as an argument.");
        }

        String displayName = required(console.readLine("Display name: "), "Display name");
        String email = required(console.readLine("Email: "), "Email").toLowerCase(Locale.ROOT);
        char[] password = console.readPassword("Password: ");
        char[] confirmation = console.readPassword("Confirm password: ");
        try {
            if (password == null || password.length == 0) {
                throw new IllegalArgumentException("Password is required.");
            }
            if (!java.util.Arrays.equals(password, confirmation)) {
                throw new IllegalArgumentException("Passwords do not match.");
            }
            bootstrapService.createAdmin(displayName, email, password);
        } finally {
            if (password != null) java.util.Arrays.fill(password, '\0');
            if (confirmation != null) java.util.Arrays.fill(confirmation, '\0');
        }
        console.writer().println("Local SUPER_ADMIN account created. Do not reuse this bootstrap command for production.");
    }

    private static String required(String value, String field) {
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException(field + " is required.");
        }
        return value.trim();
    }
}
