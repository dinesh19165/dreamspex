package com.dreamspex.payment;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.razorpay.Refund;
import java.time.Instant;
import java.util.Date;
import org.json.JSONObject;
import org.junit.jupiter.api.Test;

class RazorpayGatewayTest {
    @Test
    void parsesCreatedAtAsTheDateReturnedByTheRazorpaySdk() {
        long createdAtSeconds = 1_793_793_724L;
        Refund sdkRefund = new Refund(new JSONObject()
                .put("id", "rfnd_123")
                .put("payment_id", "pay_456")
                .put("amount", 4500)
                .put("currency", "INR")
                .put("status", "processed")
                .put("receipt", "ret_789")
                .put("created_at", createdAtSeconds));

        Object sdkCreatedAt = sdkRefund.get("created_at");
        assertTrue(sdkCreatedAt instanceof Date);
        assertFalse(sdkCreatedAt.toString().matches("\\d+"));

        RazorpayGateway.RazorpayRefund refund = RazorpayGateway.toRazorpayRefund(sdkRefund);

        assertEquals("rfnd_123", refund.id());
        assertEquals(4500L, refund.amount());
        assertEquals("INR", refund.currency());
        assertEquals("processed", refund.status());
        assertEquals("pay_456", refund.paymentId());
        assertEquals("ret_789", refund.receipt());
        assertEquals(Instant.ofEpochSecond(createdAtSeconds), refund.createdAt());
    }

    @Test
    void missingOrNullCreatedAtDoesNotPreventRefundMapping() {
        JSONObject missingDate = refundJson().put("created_at", JSONObject.NULL);
        JSONObject absentDate = refundJson();
        absentDate.remove("created_at");

        assertNull(RazorpayGateway.toRazorpayRefund(new Refund(missingDate)).createdAt());
        assertNull(RazorpayGateway.toRazorpayRefund(new Refund(absentDate)).createdAt());
    }

    private JSONObject refundJson() {
        return new JSONObject()
                .put("id", "rfnd_123")
                .put("payment_id", "pay_456")
                .put("amount", 4500)
                .put("currency", "INR")
                .put("status", "processed")
                .put("receipt", "ret_789");
    }
}
