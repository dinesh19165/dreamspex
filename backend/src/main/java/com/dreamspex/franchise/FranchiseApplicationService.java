package com.dreamspex.franchise;

import com.dreamspex.auth.PhoneNumberNormalizer;
import com.dreamspex.common.ApiException;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;
import java.util.Set;
import java.util.UUID;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import static com.dreamspex.franchise.FranchiseApplicationDtos.*;

@Service
public class FranchiseApplicationService {
    private static final Set<FranchiseApplicationStatus> ACTIVE_STATUSES = Set.of(
            FranchiseApplicationStatus.PENDING,
            FranchiseApplicationStatus.CONTACTED,
            FranchiseApplicationStatus.UNDER_REVIEW);
    private static final DateTimeFormatter REFERENCE_DATE = DateTimeFormatter.ofPattern("yyyyMMdd");
    private static final ZoneId REFERENCE_ZONE = ZoneId.of("Asia/Kolkata");

    private final FranchiseApplicationRepository applications;

    public FranchiseApplicationService(FranchiseApplicationRepository applications) {
        this.applications = applications;
    }

    @Transactional
    public CreatedResponse submit(CreateRequest request) {
        String mobileNumber = PhoneNumberNormalizer.normalize(request.mobileNumber());
        if (mobileNumber == null) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY, "INVALID_MOBILE_NUMBER",
                    "Enter a valid mobile number.");
        }

        String email = request.email().trim().toLowerCase(Locale.ROOT);
        String city = request.preferredCity().trim();
        if (applications.existsByEmailIgnoreCaseAndPreferredCityIgnoreCaseAndStatusIn(email, city, ACTIVE_STATUSES)
                || applications.existsByMobileNumberAndPreferredCityIgnoreCaseAndStatusIn(
                        mobileNumber, city, ACTIVE_STATUSES)) {
            throw new ApiException(HttpStatus.CONFLICT, "DUPLICATE_FRANCHISE_APPLICATION",
                    "An active application already exists for this contact and city.");
        }

        FranchiseApplication application = new FranchiseApplication();
        application.setReferenceId(nextReferenceId());
        application.setFullName(request.fullName().trim());
        application.setMobileNumber(mobileNumber);
        application.setEmail(email);
        application.setPreferredCity(city);
        application.setState(request.state().trim());
        application.setFullAddress(request.fullAddress().trim());
        application.setInvestmentBudget(request.investmentBudget());
        application.setPreferredStoreFormat(request.preferredStoreFormat().trim());
        application.setAdditionalMessage(blankToNull(request.additionalMessage()));

        FranchiseApplication saved = applications.save(application);
        return new CreatedResponse(saved.getReferenceId(), saved.getStatus(), saved.getCreatedAt());
    }

    @Transactional(readOnly = true)
    public List<AdminResponse> adminList() {
        return applications.findAllByOrderByCreatedAtDesc().stream().map(this::response).toList();
    }

    @Transactional(readOnly = true)
    public AdminResponse adminGet(String id) {
        return response(requireApplication(id));
    }

    @Transactional
    public AdminResponse adminUpdate(String id, AdminUpdateRequest request, String actor) {
        FranchiseApplication application = requireApplication(id);
        application.setStatus(request.status());
        String note = blankToNull(request.internalNote());
        if (note != null) {
            String entry = "[" + Instant.now() + " by " + actor + "] " + note;
            String existingNotes = application.getInternalNotes();
            application.setInternalNotes(existingNotes == null || existingNotes.isBlank()
                    ? entry : existingNotes + "\n" + entry);
        }
        application.setUpdatedAt(Instant.now());
        return response(applications.save(application));
    }

    private FranchiseApplication requireApplication(String id) {
        return applications.findById(id).orElseThrow(() -> new ApiException(
                HttpStatus.NOT_FOUND, "FRANCHISE_APPLICATION_NOT_FOUND", "Franchise application was not found."));
    }

    private String nextReferenceId() {
        String date = LocalDate.now(REFERENCE_ZONE).format(REFERENCE_DATE);
        String reference;
        do {
            reference = "FA-" + date + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT);
        } while (applications.existsByReferenceId(reference));
        return reference;
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private AdminResponse response(FranchiseApplication application) {
        return new AdminResponse(application.getId(), application.getReferenceId(), application.getFullName(),
                application.getMobileNumber(), application.getEmail(), application.getPreferredCity(),
                application.getState(), application.getFullAddress(), application.getInvestmentBudget(),
                application.getPreferredStoreFormat(), application.getAdditionalMessage(), application.getStatus(),
                application.getInternalNotes(), application.getCreatedAt(), application.getUpdatedAt());
    }
}
