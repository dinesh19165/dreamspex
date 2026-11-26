package com.dreamspex.audit;

import com.dreamspex.security.CurrentUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Locale;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

@Component
public class AdminActivityLogInterceptor implements HandlerInterceptor {
    private static final String ACTOR_ATTRIBUTE = AdminActivityLogInterceptor.class.getName() + ".actor";
    private final CurrentUser currentUser;
    private final AdminActivityLogService service;

    public AdminActivityLogInterceptor(CurrentUser currentUser, AdminActivityLogService service) {
        this.currentUser = currentUser;
        this.service = service;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        String path = request.getRequestURI();
        if (!(handler instanceof HandlerMethod) || !shouldCapture(request.getMethod(), path)) return true;

        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !authentication.isAuthenticated()
                || authentication.getAuthorities().stream().map(GrantedAuthority::getAuthority)
                .noneMatch("ROLE_SUPER_ADMIN"::equals)) {
            return true;
        }

        request.setAttribute(ACTOR_ATTRIBUTE, AdminActivityLogService.actor(currentUser.require(authentication)));
        return true;
    }

    @Override
    public void afterCompletion(HttpServletRequest request, HttpServletResponse response, Object handler,
                                Exception exception) {
        Object value = request.getAttribute(ACTOR_ATTRIBUTE);
        if (!(value instanceof AdminActivityLogService.ActorSnapshot actor)) return;

        String type = activityType(request.getMethod(), request.getRequestURI());
        String module = module(request.getRequestURI());
        String status = response.getStatus() < 400 && exception == null ? "SUCCESS" : "FAILED";
        String description = type.replace('_', ' ') + " in " + module + ".";
        service.recordRequest(actor, type, module, description, status, request);
    }

    private boolean shouldCapture(String method, String path) {
        String normalizedPath = path.toLowerCase(Locale.ROOT);
        if (normalizedPath.startsWith("/api/v1/auth/")
                || normalizedPath.startsWith("/api/v1/admin/activity-logs")) return false;
        return method.equals("POST") || method.equals("PUT") || method.equals("PATCH") || method.equals("DELETE")
                || (method.equals("GET") && normalizedPath.contains("/export"));
    }

    private String activityType(String method, String path) {
        String normalizedPath = path.toLowerCase(Locale.ROOT);
        if (normalizedPath.contains("/import")) return "BULK_IMPORT";
        if (normalizedPath.contains("/export")) return "BULK_EXPORT";
        return switch (method) {
            case "POST" -> "CREATE";
            case "PUT", "PATCH" -> "UPDATE";
            case "DELETE" -> "DELETE";
            default -> "ACTION";
        };
    }

    private String module(String path) {
        String value = path.toLowerCase(Locale.ROOT);
        if (value.contains("product")) return "Products";
        if (value.contains("category") || value.contains("brand") || value.contains("catalog")) return "Catalog";
        if (value.contains("inventory") || value.contains("variant")) return "Inventory";
        if (value.contains("order")) return "Orders";
        if (value.contains("customer")) return "Customers";
        if (value.contains("user") || value.contains("role") || value.contains("permission")) return "Access Control";
        if (value.contains("profile")) return "Admin Profile";
        if (value.contains("store") || value.contains("franchise")) return "Franchises";
        if (value.contains("offer") || value.contains("membership") || value.contains("loyalty")) return "Growth";
        if (value.contains("setting") || value.contains("maintenance") || value.contains("delivery-fee")
                || value.contains("gst") || value.contains("cms")) return "System Management";
        return "Admin";
    }
}
