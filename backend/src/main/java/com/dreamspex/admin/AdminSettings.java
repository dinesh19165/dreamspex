package com.dreamspex.admin;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.Instant;

@Entity
@Table(name = "admin_settings")
public class AdminSettings {
    @Id
    private String id = "global";
    @Column(nullable = false) private String storeName = "Dream Spex";
    @Column(length = 1000) private String logoUrl;
    @Column(length = 1000) private String faviconUrl;
    @Column(nullable = false) private String primaryColor = "#1f6b45";
    @Column(nullable = false) private String secondaryColor = "#f5efe3";
    @Column(nullable = false, length = 3) private String currency = "INR";
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal shippingFee = BigDecimal.ZERO;
    @Column(nullable = false, precision = 12, scale = 2) private BigDecimal freeShippingThreshold = BigDecimal.ZERO;
    @Column(nullable = false) private int sessionTimeoutMinutes = 60;
    @Column(nullable = false) private boolean emailNotifications = true;
    @Column(nullable = false) private boolean orderConfirmationAlerts = true;
    @Column(nullable = false) private boolean paymentAlerts = true;
    @Column(nullable = false) private boolean newCustomerAlerts = true;
    @Column(nullable = false) private boolean lowStockAlerts = true;
    @Column(length = 255) private String smtpHost;
    private Integer smtpPort;
    @Column(length = 255) private String smtpUsername;
    @Column(length = 2000) private String smtpPasswordEncrypted;
    @Column(length = 320) private String fromEmail;
    @Column(length = 180) private String senderDisplayName;
    private boolean smtpTlsEnabled = true;
    private boolean smtpSslEnabled;
    @Column(nullable = false) private Instant updatedAt = Instant.now();

    public String getId() { return id; }
    public String getStoreName() { return storeName; } public void setStoreName(String value) { storeName = value; }
    public String getLogoUrl() { return logoUrl; } public void setLogoUrl(String value) { logoUrl = value; }
    public String getFaviconUrl() { return faviconUrl; } public void setFaviconUrl(String value) { faviconUrl = value; }
    public String getPrimaryColor() { return primaryColor; } public void setPrimaryColor(String value) { primaryColor = value; }
    public String getSecondaryColor() { return secondaryColor; } public void setSecondaryColor(String value) { secondaryColor = value; }
    public String getCurrency() { return currency; } public void setCurrency(String value) { currency = value; }
    public BigDecimal getShippingFee() { return shippingFee; } public void setShippingFee(BigDecimal value) { shippingFee = value; }
    public BigDecimal getFreeShippingThreshold() { return freeShippingThreshold; } public void setFreeShippingThreshold(BigDecimal value) { freeShippingThreshold = value; }
    public int getSessionTimeoutMinutes() { return sessionTimeoutMinutes; } public void setSessionTimeoutMinutes(int value) { sessionTimeoutMinutes = value; }
    public boolean isEmailNotifications() { return emailNotifications; } public void setEmailNotifications(boolean value) { emailNotifications = value; }
    public boolean isOrderConfirmationAlerts() { return orderConfirmationAlerts; } public void setOrderConfirmationAlerts(boolean value) { orderConfirmationAlerts = value; }
    public boolean isPaymentAlerts() { return paymentAlerts; } public void setPaymentAlerts(boolean value) { paymentAlerts = value; }
    public boolean isNewCustomerAlerts() { return newCustomerAlerts; } public void setNewCustomerAlerts(boolean value) { newCustomerAlerts = value; }
    public boolean isLowStockAlerts() { return lowStockAlerts; } public void setLowStockAlerts(boolean value) { lowStockAlerts = value; }
    public Instant getUpdatedAt() { return updatedAt; } public void setUpdatedAt(Instant value) { updatedAt = value; }
    public String getSmtpHost() { return smtpHost; } public void setSmtpHost(String value) { smtpHost = value; }
    public Integer getSmtpPort() { return smtpPort; } public void setSmtpPort(Integer value) { smtpPort = value; }
    public String getSmtpUsername() { return smtpUsername; } public void setSmtpUsername(String value) { smtpUsername = value; }
    public String getSmtpPasswordEncrypted() { return smtpPasswordEncrypted; } public void setSmtpPasswordEncrypted(String value) { smtpPasswordEncrypted = value; }
    public String getFromEmail() { return fromEmail; } public void setFromEmail(String value) { fromEmail = value; }
    public String getSenderDisplayName() { return senderDisplayName; } public void setSenderDisplayName(String value) { senderDisplayName = value; }
    public boolean isSmtpTlsEnabled() { return smtpTlsEnabled; } public void setSmtpTlsEnabled(boolean value) { smtpTlsEnabled = value; }
    public boolean isSmtpSslEnabled() { return smtpSslEnabled; } public void setSmtpSslEnabled(boolean value) { smtpSslEnabled = value; }
    public boolean isSmtpConfigured() { return smtpHost != null && !smtpHost.isBlank() && smtpUsername != null && !smtpUsername.isBlank() && smtpPasswordEncrypted != null && !smtpPasswordEncrypted.isBlank() && fromEmail != null && !fromEmail.isBlank(); }
}
