package com.dreamspex.franchise;

import com.dreamspex.auth.entity.User;
import com.dreamspex.config.DynamicSmtpMailService;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.HexFormat;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.junit.jupiter.api.Test;
import org.springframework.core.env.Environment;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class FranchiseInvitationServiceTest {
    @Test
    void sendsOnlyAHashedOneTimeInvitationWithA48HourExpiry() throws Exception {
        FranchiseUserRepository users = mock(FranchiseUserRepository.class);
        DynamicSmtpMailService mail = mock(DynamicSmtpMailService.class);
        Environment environment = mock(Environment.class);
        when(environment.getProperty("dreamspex.frontend-base-url", "https://store.example/"))
                .thenReturn("https://store.example/");
        when(environment.getProperty("FRONTEND_BASE_URL", "http://localhost:5173"))
                .thenReturn("https://store.example/");
        FranchiseInvitationService service = new FranchiseInvitationService(users, mail, environment);
        User user = new User();
        user.setEmail("owner@example.com");
        FranchiseUser link = new FranchiseUser();
        link.setUser(user);
        Instant before = Instant.now();

        service.invite(link);

        assertTrue(link.getInvitationExpiresAt().isAfter(before.plusSeconds(47 * 3600)));
        assertTrue(link.getInvitationExpiresAt().isBefore(before.plusSeconds(49 * 3600)));
        assertEquals(64, link.getInvitationTokenHash().length());
        verify(users).save(link);
        var message = org.mockito.ArgumentCaptor.forClass(String.class);
        verify(mail).send(eq("owner@example.com"), eq("Set up your Dream Spex franchise account"),
                message.capture(), message.capture());
        Matcher matcher = Pattern.compile("https://store\\.example/franchise/setup\\?token=([A-Za-z0-9_-]+)")
                .matcher(message.getAllValues().get(0));
        assertTrue(matcher.find());
        String rawToken = matcher.group(1);
        String rawHash = HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                .digest(rawToken.getBytes(StandardCharsets.UTF_8)));
        assertEquals(rawHash, link.getInvitationTokenHash());
        assertNotEquals(rawToken, link.getInvitationTokenHash());
    }
}
