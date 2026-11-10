package com.dreamspex.auth;

import java.util.regex.Pattern;

public final class PhoneNumberNormalizer {
    private static final Pattern E164 = Pattern.compile("^\\+[1-9]\\d{7,14}$");
    private static final Pattern INDIAN_LOCAL = Pattern.compile("^[6-9]\\d{9}$");
    private static final Pattern INDIAN_WITH_COUNTRY = Pattern.compile("^91[6-9]\\d{9}$");
    private static final Pattern INDIAN_WITH_TRUNK = Pattern.compile("^0[6-9]\\d{9}$");

    private PhoneNumberNormalizer() {}

    public static String normalize(String value) {
        if (value == null || value.isBlank()) return null;
        String compact = value.trim().replaceAll("[\\s().-]", "");
        if (E164.matcher(compact).matches()) return compact;
        if (INDIAN_LOCAL.matcher(compact).matches()) return "+91" + compact;
        if (INDIAN_WITH_COUNTRY.matcher(compact).matches()) return "+" + compact;
        if (INDIAN_WITH_TRUNK.matcher(compact).matches()) return "+91" + compact.substring(1);
        return null;
    }

    public static String normalizeOrOriginal(String value) {
        String normalized = normalize(value);
        return normalized == null ? value : normalized;
    }
}
