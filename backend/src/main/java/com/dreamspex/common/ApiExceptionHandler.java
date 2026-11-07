package com.dreamspex.common;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.multipart.MaxUploadSizeExceededException;
import org.springframework.web.multipart.MultipartException;
import org.springframework.dao.DataIntegrityViolationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;

@RestControllerAdvice
public class ApiExceptionHandler {
    private static final Logger log = LoggerFactory.getLogger(ApiExceptionHandler.class);

    @ExceptionHandler(ApiException.class)
    ResponseEntity<ProblemResponse> handleApi(ApiException exception, HttpServletRequest request) {
        if (exception.getCause() != null) {
            log.error("API request failed code={} exceptionType={} rootCauseType={} requestId={}",
                    exception.code(), exception.getClass().getName(), rootCause(exception).getClass().getName(),
                    requestId(request), exception);
        }
        return response(exception.status(), exception.code(), exception.getMessage(), exception.fieldErrors(), request);
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    ResponseEntity<ProblemResponse> handleValidation(MethodArgumentNotValidException exception, HttpServletRequest request) {
        List<ProblemResponse.FieldError> errors = exception.getBindingResult().getFieldErrors().stream()
                .map(error -> new ProblemResponse.FieldError(error.getField(), error.getDefaultMessage()))
                .toList();
        return response(HttpStatus.UNPROCESSABLE_ENTITY, "VALIDATION_ERROR", "One or more fields are invalid.", errors, request);
    }

    @ExceptionHandler(MaxUploadSizeExceededException.class)
    ResponseEntity<ProblemResponse> handleUploadTooLarge(MaxUploadSizeExceededException exception, HttpServletRequest request) {
        return response(HttpStatus.PAYLOAD_TOO_LARGE, "IMAGE_TOO_LARGE", "Uploaded files must be 10 MB or smaller.", List.of(), request);
    }

    @ExceptionHandler(MultipartException.class)
    ResponseEntity<ProblemResponse> handleInvalidMultipart(MultipartException exception, HttpServletRequest request) {
        return response(HttpStatus.BAD_REQUEST, "INVALID_MULTIPART_REQUEST", "The uploaded file could not be read. Please retry the upload.", List.of(), request);
    }

    @ExceptionHandler(DataIntegrityViolationException.class)
    ResponseEntity<ProblemResponse> handleDataConflict(DataIntegrityViolationException exception, HttpServletRequest request) {
        log.warn("Data integrity conflict exceptionType={} rootCauseType={} requestId={}",
                exception.getClass().getName(), rootCause(exception).getClass().getName(), requestId(request), exception);
        return response(HttpStatus.CONFLICT, "DATA_CONFLICT",
                "The request conflicts with saved data. Refresh and retry, or contact support if the problem continues.",
                List.of(), request);
    }

    @ExceptionHandler(Exception.class)
    ResponseEntity<ProblemResponse> handleUnexpected(Exception exception, HttpServletRequest request) {
        log.error("Unhandled API exception exceptionType={} rootCauseType={} requestId={}",
                exception.getClass().getName(), rootCause(exception).getClass().getName(), requestId(request), exception);
        return response(HttpStatus.INTERNAL_SERVER_ERROR, "INTERNAL_ERROR", "An unexpected error occurred.", List.of(), request);
    }

    private ResponseEntity<ProblemResponse> response(HttpStatus status, String code, String message,
                                                     List<ProblemResponse.FieldError> errors, HttpServletRequest request) {
        String requestId = requestId(request);
        ProblemResponse body = new ProblemResponse(
                "https://api.dreamspex.in/problems/" + code.toLowerCase(),
                status.getReasonPhrase(), status.value(), code, message, requestId, errors);
        return ResponseEntity.status(status).body(body);
    }

    private String requestId(HttpServletRequest request) {
        Object value = request.getAttribute(RequestIdFilter.REQUEST_ID);
        return value == null ? "unassigned" : value.toString();
    }

    private Throwable rootCause(Throwable exception) {
        Throwable root = exception;
        while (root.getCause() != null && root.getCause() != root) {
            root = root.getCause();
        }
        return root;
    }
}
