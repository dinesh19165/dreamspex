package com.dreamspex.maintenance;

import com.dreamspex.common.RequestIdFilter;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.MediaType;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.time.Instant;
import java.util.LinkedHashMap;
import java.util.Map;

@Component
public class MaintenanceRequestFilter extends OncePerRequestFilter {
    private final MaintenanceSettingsRepository settingsRepository;
    private final ObjectMapper objectMapper;

    public MaintenanceRequestFilter(MaintenanceSettingsRepository settingsRepository,
                                    ObjectMapper objectMapper) {
        this.settingsRepository = settingsRepository;
        this.objectMapper = objectMapper;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response,
                                    FilterChain filterChain) throws ServletException, IOException {
        String path = request.getRequestURI();
        if (isAlwaysAllowed(path, request)) {
            filterChain.doFilter(request, response);
            return;
        }

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (isSuperAdmin(authentication)) {
            filterChain.doFilter(request, response);
            return;
        }

        MaintenanceSettings settings = settingsRepository.findByConfigKey("GLOBAL").orElse(null);
        if (settings == null || !effectiveActive(settings, Instant.now())) {
            filterChain.doFilter(request, response);
            return;
        }

        if (shouldBlock(settings, path, request)) {
            writeMaintenanceResponse(response, request, settings);
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isAlwaysAllowed(String path, HttpServletRequest request) {
        return path.equals("/api/v1/maintenance/status")
                || path.startsWith("/api/v1/admin/")
                || path.equals("/api/v1/auth/admin/login")
                || path.equals("/api/v1/auth/refresh")
                || path.equals("/api/v1/auth/logout")
                || path.equals("/api/health")
                || path.equals("/actuator/health")
                || path.startsWith("/api/v1/delivery/batches/")
                || path.startsWith("/api/v1/payments/webhooks/")
                || path.startsWith("/swagger-ui")
                || path.equals("/swagger-ui.html")
                || path.startsWith("/v3/api-docs")
                || "OPTIONS".equalsIgnoreCase(request.getMethod());
    }

    private boolean isSuperAdmin(Authentication authentication) {
        return authentication != null
                && authentication.isAuthenticated()
                && authentication.getAuthorities().contains(
                        new SimpleGrantedAuthority("ROLE_SUPER_ADMIN"));
    }

    private boolean effectiveActive(MaintenanceSettings settings, Instant now) {
        if (!settings.isActive()) return false;
        if (settings.getStartAt() != null && now.isBefore(settings.getStartAt())) return false;
        if (settings.getEndAt() != null && !now.isBefore(settings.getEndAt())) return false;
        return true;
    }

    private boolean shouldBlock(MaintenanceSettings settings, String path,
                               HttpServletRequest request) {
        String type = settings.getMaintenanceType();
        String scope = normalizeScope(settings.getTargetScope());

        if ("FULL_SYSTEM".equals(type) && scopeApplies(scope, request)) return true;
        if ("PAYMENT".equals(type) && isPaymentPath(path)) return true;
        if ("AUTH".equals(type) && isAuthPath(path)) return true;
        if ("CATALOG".equals(type) && isCatalogPath(path)) return true;
        if ("API".equals(type) && "API".equals(scope)) return true;
        if ("API".equals(type) && "ALL".equals(scope) && path.startsWith("/api/")) return true;
        if ("API".equals(type) && "WEB".equals(scope)
                && (request.getHeader("Accept") == null
                        || !request.getHeader("Accept").contains("application/json"))) return true;
        return false;
    }

    private boolean scopeApplies(String scope, HttpServletRequest request) {
        if ("ALL".equals(scope)) return true;
        if ("API".equals(scope)) return true;
        if ("WEB".equals(scope)) {
            String accept = request.getHeader("Accept");
            return accept == null || !accept.contains("application/json");
        }
        return false;
    }

    private String normalizeScope(String scope) {
        if ("APP".equals(scope)) return "WEB";
        return scope;
    }

    private boolean isPaymentPath(String path) {
        return path.startsWith("/api/v1/payments/")
                || path.startsWith("/api/v1/membership-plans/")
                || path.equals("/api/v1/orders");
    }

    private boolean isAuthPath(String path) {
        return path.startsWith("/api/v1/auth/")
                || path.startsWith("/api/v1/me/");
    }

    private boolean isCatalogPath(String path) {
        return path.startsWith("/api/v1/products")
                || path.startsWith("/api/v1/categories")
                || path.startsWith("/api/v1/offers")
                || path.startsWith("/api/v1/cart")
                || path.startsWith("/api/v1/wishlist")
                || path.startsWith("/api/v1/coupons")
                || path.startsWith("/api/v1/membership-plans");
    }

    private void writeMaintenanceResponse(HttpServletResponse response,
                                          HttpServletRequest request,
                                          MaintenanceSettings settings) throws IOException {
        response.setStatus(HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);
        Object requestId = request.getAttribute(RequestIdFilter.REQUEST_ID);
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("type", "https://api.dreamspex.in/problems/maintenance_active");
        body.put("title", "Service Unavailable");
        body.put("status", HttpServletResponse.SC_SERVICE_UNAVAILABLE);
        body.put("code", "MAINTENANCE_ACTIVE");
        body.put("message", settings.getMessage());
        body.put("requestId", requestId == null ? "unassigned" : requestId.toString());
        body.put("fieldErrors", java.util.List.of());
        body.put("details", Map.of(
                "maintenanceType", settings.getMaintenanceType(),
                "targetScope", normalizeScope(settings.getTargetScope()),
                "title", settings.getTitle()));
        objectMapper.writeValue(response.getOutputStream(), body);
    }
}
