package com.dreamspex.returns;

public record ReturnRefundEmail(String recipient, String subject, String text, String html, String orderId) {}
