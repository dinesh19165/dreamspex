package com.dreamspex.common;

import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Map;

public class ApiException extends RuntimeException {
    private final HttpStatus status;
    private final String code;
    private final List<ProblemResponse.FieldError> fieldErrors;
    private final Map<String, Object> details;

    public ApiException(HttpStatus status, String code, String message) {
        this(status, code, message, List.of(), Map.of());
    }

    public ApiException(HttpStatus status, String code, String message, List<ProblemResponse.FieldError> fieldErrors) {
        this(status, code, message, fieldErrors, Map.of());
    }

    public ApiException(HttpStatus status, String code, String message,
                        List<ProblemResponse.FieldError> fieldErrors, Map<String, Object> details) {
        super(message);
        this.status = status;
        this.code = code;
        this.fieldErrors = fieldErrors;
        this.details = Map.copyOf(details);
    }

    public ApiException(HttpStatus status, String code, String message, Throwable cause) {
        super(message, cause);
        this.status = status;
        this.code = code;
        this.fieldErrors = List.of();
        this.details = Map.of();
    }

    public HttpStatus status() { return status; }
    public String code() { return code; }
    public List<ProblemResponse.FieldError> fieldErrors() { return fieldErrors; }
    public Map<String, Object> details() { return details; }
}
