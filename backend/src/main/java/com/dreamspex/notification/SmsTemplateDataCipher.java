package com.dreamspex.notification;

import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Base64;
import javax.crypto.Cipher;
import javax.crypto.spec.GCMParameterSpec;
import javax.crypto.spec.SecretKeySpec;

public class SmsTemplateDataCipher {
    private static final int NONCE_LENGTH = 12;
    private final SecretKeySpec key;
    private final SecureRandom random = new SecureRandom();

    public SmsTemplateDataCipher(String secret) {
        if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32) {
            throw new IllegalStateException("A 32-byte OTP secret is required to encrypt queued SMS template data.");
        }
        try {
            byte[] keyBytes = MessageDigest.getInstance("SHA-256").digest(secret.getBytes(StandardCharsets.UTF_8));
            this.key = new SecretKeySpec(keyBytes, "AES");
        } catch (java.security.NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SMS template encryption could not be initialized.", exception);
        }
    }

    public String encrypt(String value) {
        byte[] nonce = new byte[NONCE_LENGTH];
        random.nextBytes(nonce);
        try {
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] result = new byte[nonce.length + encrypted.length];
            System.arraycopy(nonce, 0, result, 0, nonce.length);
            System.arraycopy(encrypted, 0, result, nonce.length, encrypted.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SMS template data could not be encrypted.", exception);
        }
    }

    public String decrypt(String value) {
        try {
            byte[] encrypted = Base64.getDecoder().decode(value);
            if (encrypted.length <= NONCE_LENGTH) {
                throw new IllegalStateException("Stored SMS template data is invalid.");
            }
            byte[] nonce = java.util.Arrays.copyOfRange(encrypted, 0, NONCE_LENGTH);
            byte[] ciphertext = java.util.Arrays.copyOfRange(encrypted, NONCE_LENGTH, encrypted.length);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, key, new GCMParameterSpec(128, nonce));
            return new String(cipher.doFinal(ciphertext), StandardCharsets.UTF_8);
        } catch (GeneralSecurityException | IllegalArgumentException exception) {
            throw new IllegalStateException("Stored SMS template data could not be decrypted.", exception);
        }
    }
}
