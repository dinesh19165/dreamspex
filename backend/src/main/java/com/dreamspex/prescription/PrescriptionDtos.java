package com.dreamspex.prescription;

import jakarta.validation.constraints.*;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public final class PrescriptionDtos {
    private PrescriptionDtos(){}
    public record PrescriptionRequest(@Size(max=160) String patientName, LocalDate prescriptionDate,
        @DecimalMin("-30.00") @DecimalMax("30.00") BigDecimal rightSph,
        @DecimalMin("-15.00") @DecimalMax("15.00") BigDecimal rightCyl,
        @Min(0) @Max(180) Integer rightAxis, @DecimalMin("-10.00") @DecimalMax("10.00") BigDecimal rightAdd,
        @DecimalMin("-30.00") @DecimalMax("30.00") BigDecimal leftSph,
        @DecimalMin("-15.00") @DecimalMax("15.00") BigDecimal leftCyl,
        @Min(0) @Max(180) Integer leftAxis, @DecimalMin("-10.00") @DecimalMax("10.00") BigDecimal leftAdd,
        @DecimalMin("20.00") @DecimalMax("80.00") BigDecimal pd,
        @DecimalMin("10.00") @DecimalMax("40.00") BigDecimal rightPd,
        @DecimalMin("10.00") @DecimalMax("40.00") BigDecimal leftPd,
        LocalDate expiryDate, @Pattern(regexp="UPLOAD|MANUAL") String source,
        @Pattern(regexp="NOT_RUN|PROCESSING|COMPLETED|LOW_CONFIDENCE|FAILED") String extractionStatus,
        @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal extractionConfidence,
        boolean customerConfirmed, String productId,
        List<@NotBlank @Pattern(regexp="[A-Z0-9_]{2,64}") String> selectedLensCodes) {}
    public record OcrTextRequest(@NotBlank @Size(max=40000) String text,
                                 @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal confidence) {}
    public record LensOptionRequest(@NotBlank @Pattern(regexp="[A-Z0-9_]{2,64}") String code,
                                    @NotBlank @Size(max=120) String name,
                                    @NotBlank @Pattern(regexp="TYPE|COATING|MATERIAL") String category,
                                    @NotBlank @Size(max=1000) String benefits,
                                    @NotNull @DecimalMin("0.00") @Digits(integer=10, fraction=2) BigDecimal additionalCost,
                                    @Min(1) @Max(365) Integer preparationDays,
                                    boolean available,
                                    @Min(0) @Max(10000) int displayOrder) {}
    public record LensOptionResponse(String id, String code, String name, String category,
                                     String benefits, BigDecimal additionalCost, Integer preparationDays,
                                     boolean available, int displayOrder, boolean recommended, String recommendationReason) {}
    public record LensSelectionRequest(@NotEmpty List<@NotBlank @Pattern(regexp="[A-Z0-9_]{2,64}") String> codes) {}
    public record PrescriptionReviewRequest(@NotBlank @Pattern(regexp="APPROVED|REJECTED") String status,
                                             @Size(max=1000) String reviewNote) {}
    public record PrescriptionResponse(String id,String patientName,LocalDate prescriptionDate,
        BigDecimal rightSph,BigDecimal rightCyl,Integer rightAxis,BigDecimal rightAdd,
        BigDecimal leftSph,BigDecimal leftCyl,Integer leftAxis,BigDecimal leftAdd,BigDecimal pd,
        String status,String reviewNote,List<FileResponse> files, BigDecimal rightPd, BigDecimal leftPd,
        LocalDate expiryDate, String source, String extractionStatus, BigDecimal extractionConfidence,
        boolean customerConfirmed, String productId, String orderId, List<String> selectedLensCodes,
        List<String> missingFields) {}
    public record FileResponse(String id,String originalName,String contentType,long sizeBytes,String checksum){}
    public record PlanRequest(@NotBlank @Size(max=120) String name,@NotBlank @Size(max=1000) String description,
        @NotNull @DecimalMin("0.00") BigDecimal price,@Min(1) @Max(3650) int durationDays,
        List<@NotBlank @Size(max=160) String> perks,String status,
        @NotNull @DecimalMin("0.00") @DecimalMax("100.00") BigDecimal discountPercentage,boolean recommended){}
    public record PlanResponse(String id,String name,String description,BigDecimal price,int durationDays,
                               List<String> perks,String status,BigDecimal discountPercentage,boolean recommended){}
    public record MembershipResponse(String id,String planId,String planName,String status,
                                     java.time.Instant startsAt,java.time.Instant expiresAt){}
    public record NotificationResponse(String id,String type,String title,String message,
                                       java.time.Instant createdAt,java.time.Instant readAt){}
}
