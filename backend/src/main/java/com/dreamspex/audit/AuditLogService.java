package com.dreamspex.audit;
import com.dreamspex.auth.entity.User;
import com.dreamspex.common.RequestIdFilter;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.stereotype.Service;

@Service
public class AuditLogService {
    private final AuditLogRepository repository;

    public AuditLogService(AuditLogRepository repository) { this.repository = repository; }

    public void record(User actor, String action, String resourceType, String resourceId,
                       HttpServletRequest request) {
        AuditLog log = new AuditLog();
        log.setActor(actor);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        log.setRequestId((String) request.getAttribute(RequestIdFilter.REQUEST_ID));
        log.setIpAddress(request.getRemoteAddr());
        log.setUserAgent(request.getHeader("User-Agent"));
        repository.save(log);
    }

    public void record(User actor, String action) {
        AuditLog log = new AuditLog();
        log.setActor(actor);
        log.setAction(action);
        repository.save(log);
    }

    public void record(User actor, String action, String resourceType, String resourceId) {
        AuditLog log = new AuditLog();
        log.setActor(actor);
        log.setAction(action);
        log.setResourceType(resourceType);
        log.setResourceId(resourceId);
        repository.save(log);
    }
}
