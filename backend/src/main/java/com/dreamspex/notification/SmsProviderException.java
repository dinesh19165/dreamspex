package com.dreamspex.notification;

public class SmsProviderException extends RuntimeException {
    private final boolean retryable;

    public SmsProviderException(String message, boolean retryable) {
        super(message);
        this.retryable = retryable;
    }

    public SmsProviderException(String message, boolean retryable, Throwable cause) {
        super(message, cause);
        this.retryable = retryable;
    }

    public boolean isRetryable() { return retryable; }
}
