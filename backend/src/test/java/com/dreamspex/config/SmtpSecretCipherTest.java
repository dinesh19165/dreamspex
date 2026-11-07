package com.dreamspex.config;

import org.junit.jupiter.api.Test;
import java.util.Base64;
import static org.junit.jupiter.api.Assertions.*;

class SmtpSecretCipherTest {
    @Test
    void encryptsAndDecryptsWithoutStoringPlaintext() {
        String key = Base64.getEncoder().encodeToString(new byte[32]);
        SmtpSecretCipher cipher = new SmtpSecretCipher(key);
        String encrypted = cipher.encrypt("gmail-app-password");

        assertNotEquals("gmail-app-password", encrypted);
        assertEquals("gmail-app-password", cipher.decrypt(encrypted));
    }

    @Test
    void rejectsMissingEncryptionKey() {
        SmtpSecretCipher cipher = new SmtpSecretCipher("");
        IllegalStateException exception = assertThrows(IllegalStateException.class, () -> cipher.encrypt("secret"));
        assertTrue(exception.getCause().getMessage().contains("DREAMSPEX_SMTP_ENCRYPTION_KEY"));
    }
}
