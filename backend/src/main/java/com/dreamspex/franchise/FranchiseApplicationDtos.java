package com.dreamspex.franchise;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.math.BigDecimal;
import java.time.Instant;

public final class FranchiseApplicationDtos {
    private FranchiseApplicationDtos() {}

    public record CreateRequest(
            @NotBlank @Size(max = 160) String fullName,
            @NotBlank @Size(max = 32) @Pattern(regexp = "^[+0-9\\s().-]+$") String mobileNumber,
            @NotBlank @Email @Size(max = 255) String email,
            @NotBlank @Size(max = 100) String preferredCity,
            @NotBlank @Size(max = 100) String state,
            @NotBlank @Size(max = 2000) String fullAddress,
            @NotNull @DecimalMin(value = "1.00") @Digits(integer = 12, fraction = 2) BigDecimal investmentBudget,
            @NotBlank @Size(max = 100) String preferredStoreFormat,
            @Size(max = 2000) String additionalMessage) {}

    public record CreatedResponse(String referenceId, FranchiseApplicationStatus status, Instant createdAt) {}

    public record AdminResponse(
            String id,
            String referenceId,
            String fullName,
            String mobileNumber,
            String email,
            String preferredCity,
            String state,
            String fullAddress,
            BigDecimal investmentBudget,
            String preferredStoreFormat,
            String additionalMessage,
            FranchiseApplicationStatus status,
            String internalNotes,
            Instant createdAt,
            Instant updatedAt) {}

    public record AdminUpdateRequest(
            @NotNull FranchiseApplicationStatus status,
            @Size(max = 2000) String internalNote) {}
}
