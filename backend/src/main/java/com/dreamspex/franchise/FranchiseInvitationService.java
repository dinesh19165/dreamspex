package com.dreamspex.franchise;

import com.dreamspex.config.DynamicSmtpMailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Base64;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class FranchiseInvitationService {
    private final FranchiseUserRepository franchiseUsers;
    private final DynamicSmtpMailService mail;
    private final Environment environment;
    private final SecureRandom random = new SecureRandom();

    public FranchiseInvitationService(FranchiseUserRepository franchiseUsers,
                                      DynamicSmtpMailService mail, Environment environment) {
        this.franchiseUsers = franchiseUsers;
        this.mail = mail;
        this.environment = environment;
    }

    @Transactional
    public void invite(FranchiseUser link) {
        byte[] tokenBytes = new byte[32];
        random.nextBytes(tokenBytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(tokenBytes);
        link.setInvitationTokenHash(hash(token));
        link.setInvitationExpiresAt(Instant.now().plus(48, ChronoUnit.HOURS));
        franchiseUsers.save(link);

        String baseUrl = environment.getProperty("dreamspex.frontend-base-url",
                environment.getProperty("FRONTEND_BASE_URL", "http://localhost:5173")).replaceAll("/+$", "");
        String setupUrl = baseUrl + "/franchise/setup?token=" + token;
        String subject = "Set up your Dream Spex franchise account";
        String text = "Your Dream Spex franchise account is ready. Set your password using this secure link "
                + "(valid for 48 hours): " + setupUrl;
        String html = "<p>Your Dream Spex franchise account is ready.</p>"
                + "<p><a href=\"" + setupUrl + "\">Set up your password</a></p>"
                + "<p>This one-time link expires in 48 hours. If you did not expect this invitation, contact Dream Spex.</p>";
        mail.send(link.getUser().getEmail(), subject, text, html);
    }

    private String hash(String token) {
        try {
            return java.util.HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(token.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception exception) {
            throw new IllegalStateException("Unable to hash franchise invitation token.", exception);
        }
    }
}
