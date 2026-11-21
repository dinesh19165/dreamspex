package com.dreamspex.admin;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.IOException;

public final class AdminReportsH2Functions {
    private static final ObjectMapper MAPPER = new ObjectMapper();

    private AdminReportsH2Functions() {}

    public static String jsonValue(String json, String path) throws IOException {
        if (json == null || path == null || !path.startsWith("$.") || path.length() < 3) {
            return null;
        }
        JsonNode value = MAPPER.readTree(json).path(path.substring(2));
        return value.isMissingNode() || value.isNull() ? null : value.asText();
    }
}
