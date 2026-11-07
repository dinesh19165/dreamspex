package com.dreamspex.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;

@Component
public class SmtpSecretCipher {
    private static final String ALGORITHM = "AES/GCM/NoPadding";
    private final String configuredKey;
    private final SecureRandom random = new SecureRandom();

    public SmtpSecretCipher(@Value("${DREAMSPEX_SMTP_ENCRYPTION_KEY:}") String configuredKey) {
        this.configuredKey = configuredKey;
    }

    void validateConfiguredKey() {
        key();
    }

    boolean matchesSecret(String secret) {
        return MessageDigest.isEqual(key().getEncoded(), secret.getBytes(StandardCharsets.UTF_8));
    }

    public String encrypt(String value) {
        try {
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            byte[] iv = new byte[12];
            random.nextBytes(iv);
            cipher.init(Cipher.ENCRYPT_MODE, key(), new GCMParameterSpec(128, iv));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] payload = new byte[iv.length + encrypted.length];
            System.arraycopy(iv, 0, payload, 0, iv.length);
            System.arraycopy(encrypted, 0, payload, iv.length, encrypted.length);
            return Base64.getEncoder().encodeToString(payload);
        } catch (Exception exception) {
            throw new IllegalStateException("SMTP encryption failed.", exception);
        }
    }

    public String decrypt(String value) {
        try {
            byte[] payload = Base64.getDecoder().decode(value);
            if (payload.length <= 12) throw new IllegalStateException("SMTP secret is invalid.");
            Cipher cipher = Cipher.getInstance(ALGORITHM);
            cipher.init(Cipher.DECRYPT_MODE, key(), new GCMParameterSpec(128, payload, 0, 12));
            return new String(cipher.doFinal(payload, 12, payload.length - 12), StandardCharsets.UTF_8);
        } catch (Exception exception) {
            throw new IllegalStateException("SMTP decryption failed.", exception);
        }
    }

    private SecretKeySpec key() {
        if (configuredKey == null || configuredKey.isBlank())
            throw new IllegalStateException("DREAMSPEX_SMTP_ENCRYPTION_KEY must be configured to use database SMTP credentials.");
        byte[] bytes;
        try { bytes = Base64.getDecoder().decode(configuredKey); }
        catch (IllegalArgumentException exception) { throw new IllegalStateException("DREAMSPEX_SMTP_ENCRYPTION_KEY must be base64.", exception); }
        if (bytes.length != 32) throw new IllegalStateException("DREAMSPEX_SMTP_ENCRYPTION_KEY must decode to 32 bytes.");
        return new SecretKeySpec(bytes, "AES");
    }
}
