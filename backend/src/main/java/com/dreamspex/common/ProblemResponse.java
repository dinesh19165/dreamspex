package com.dreamspex.common;

import java.util.List;

public record ProblemResponse(
        String type,
        String title,
        int status,
        String code,
        String message,
        String requestId,
        List<FieldError> fieldErrors) {
    public record FieldError(String field, String message) {}
}
