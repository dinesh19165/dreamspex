package com.dreamspex.order;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;
import com.dreamspex.order.OrderDtos.CheckoutRequest;

public class CheckoutAddressValidator implements ConstraintValidator<ValidCheckoutAddress, CheckoutRequest> {
    @Override
    public boolean isValid(CheckoutRequest request, ConstraintValidatorContext context) {
        if (request == null || "PICKUP".equals(request.fulfillmentType())) return true;
        if (request.addressId() != null && !request.addressId().isBlank()) return true;
        context.disableDefaultConstraintViolation();
        context.buildConstraintViolationWithTemplate("must not be blank")
                .addPropertyNode("addressId")
                .addConstraintViolation();
        return false;
    }
}
