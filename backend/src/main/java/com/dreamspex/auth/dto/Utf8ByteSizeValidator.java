package com.dreamspex.auth.dto;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.nio.charset.StandardCharsets;

public class Utf8ByteSizeValidator implements ConstraintValidator<Utf8ByteSize, CharSequence> {
    private int max;

    @Override
    public void initialize(Utf8ByteSize constraint) {
        max = constraint.max();
    }

    @Override
    public boolean isValid(CharSequence value, ConstraintValidatorContext context) {
        return value == null || value.toString().getBytes(StandardCharsets.UTF_8).length <= max;
    }
}
