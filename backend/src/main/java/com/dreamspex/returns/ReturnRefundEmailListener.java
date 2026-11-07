package com.dreamspex.returns;

import com.dreamspex.config.DynamicSmtpMailService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.transaction.event.TransactionPhase;

@Component
public class ReturnRefundEmailListener {
    private static final Logger log = LoggerFactory.getLogger(ReturnRefundEmailListener.class);
    private final DynamicSmtpMailService mail;

    public ReturnRefundEmailListener(DynamicSmtpMailService mail) {
        this.mail = mail;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void send(ReturnRefundEmail email) {
        if (email.recipient() == null || email.recipient().isBlank()) return;
        try {
            if (!mail.configuration().enabled()) {
                log.warn("Return/refund email notifications are disabled orderId={}", email.orderId());
                return;
            }
            mail.send(email.recipient(), email.subject(), email.text(), email.html());
        } catch (IllegalStateException exception) {
            log.error("Return/refund email delivery failed orderId={} errorType={}",
                    email.orderId(), exception.getClass().getName());
        }
    }
}
