package com.dreamspex.notification;

import org.springframework.context.EnvironmentAware;
import org.springframework.core.env.Environment;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "dreamspex.sms")
public class SmsProperties implements EnvironmentAware {
    private String provider = "mock";
    private String msg91AuthKey = "";
    private String msg91FlowUrl = "https://control.msg91.com/api/v5/flow/";
    private String msg91WidgetId = "";
    private String msg91WidgetAuthToken = "";
    private long dispatchDelayMs = 5000;
    private Environment environment;

    public String getProvider() { return provider; }
    public void setProvider(String provider) { this.provider = provider; }
    public String getMsg91AuthKey() { return msg91AuthKey; }
    public void setMsg91AuthKey(String msg91AuthKey) { this.msg91AuthKey = msg91AuthKey; }
    public String getMsg91FlowUrl() { return msg91FlowUrl; }
    public void setMsg91FlowUrl(String msg91FlowUrl) { this.msg91FlowUrl = msg91FlowUrl; }
    public String getMsg91WidgetId() { return msg91WidgetId; }
    public void setMsg91WidgetId(String msg91WidgetId) { this.msg91WidgetId = msg91WidgetId; }
    public String getMsg91WidgetAuthToken() { return msg91WidgetAuthToken; }
    public void setMsg91WidgetAuthToken(String msg91WidgetAuthToken) { this.msg91WidgetAuthToken = msg91WidgetAuthToken; }
    public long getDispatchDelayMs() { return dispatchDelayMs; }
    public void setDispatchDelayMs(long dispatchDelayMs) { this.dispatchDelayMs = dispatchDelayMs; }

    @Override
    public void setEnvironment(Environment environment) {
        this.environment = environment;
    }

    public String templateId(String notificationType) {
        if (environment == null) return null;
        String configured = environment.getProperty("DREAMSPEX_SMS_TEMPLATES_" + notificationType);
        if (configured == null || configured.isBlank()) {
            String propertyName = "dreamspex.sms.templates."
                    + notificationType.toLowerCase(java.util.Locale.ROOT).replace('_', '-');
            configured = environment.getProperty(propertyName);
        }
        return configured == null || configured.isBlank() ? null : configured.trim();
    }
}
