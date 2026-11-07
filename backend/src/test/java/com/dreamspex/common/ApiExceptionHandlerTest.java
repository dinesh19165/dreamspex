package com.dreamspex.common;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.junit.jupiter.api.Assertions.assertEquals;

class ApiExceptionHandlerTest {
    @Test
    void mapsDataIntegrityFailuresToConflictAndIncludesRequestId() {
        ApiExceptionHandler handler = new ApiExceptionHandler();
        HttpServletRequest request = new MockHttpServletRequest();
        request.setAttribute(RequestIdFilter.REQUEST_ID, "req_cart_conflict");

        var response = handler.handleDataConflict(new DuplicateKeyException("duplicate cart item"), request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertEquals("DATA_CONFLICT", response.getBody().code());
        assertEquals("req_cart_conflict", response.getBody().requestId());
    }
}
