package com.dreamspex.franchise;

import com.dreamspex.common.ApiException;
import java.math.BigDecimal;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class FranchiseApplicationServiceTest {
    @Mock FranchiseApplicationRepository applications;

    private FranchiseApplicationService service;

    @BeforeEach
    void setUp() {
        service = new FranchiseApplicationService(applications);
    }

    @Test
    void submissionCreatesPendingApplicationWithUniqueReferenceAndNormalizedPhone() {
        when(applications.save(any(FranchiseApplication.class)))
                .thenAnswer(invocation -> invocation.getArgument(0));
        var response = service.submit(request("9876543210", "asha@example.com", "Hyderabad"));

        assertNotNull(response.referenceId());
        assertFalse(response.referenceId().isBlank());
        assertEquals(FranchiseApplicationStatus.PENDING, response.status());
        ArgumentCaptor<FranchiseApplication> saved = ArgumentCaptor.forClass(FranchiseApplication.class);
        verify(applications).save(saved.capture());
        assertEquals("+919876543210", saved.getValue().getMobileNumber());
        assertEquals("asha@example.com", saved.getValue().getEmail());
        assertEquals("Hyderabad", saved.getValue().getPreferredCity());
        assertEquals(new BigDecimal("750000"), saved.getValue().getInvestmentBudget());
        assertEquals("BOUTIQUE", saved.getValue().getPreferredStoreFormat());
    }

    @Test
    void activeDuplicateForTheSameEmailAndCityIsRejected() {
        when(applications.existsByEmailIgnoreCaseAndPreferredCityIgnoreCaseAndStatusIn(
                "asha@example.com", "Hyderabad", java.util.Set.of(
                        FranchiseApplicationStatus.PENDING,
                        FranchiseApplicationStatus.CONTACTED,
                        FranchiseApplicationStatus.UNDER_REVIEW))).thenReturn(true);

        ApiException error = assertThrows(ApiException.class,
                () -> service.submit(request("9876543210", "asha@example.com", "Hyderabad")));

        assertEquals("DUPLICATE_FRANCHISE_APPLICATION", error.code());
        verify(applications, never()).save(any(FranchiseApplication.class));
    }

    @Test
    void invalidMobileNumberIsRejected() {
        ApiException error = assertThrows(ApiException.class,
                () -> service.submit(request("123", "asha@example.com", "Hyderabad")));

        assertEquals("INVALID_MOBILE_NUMBER", error.code());
        verify(applications, never()).save(any(FranchiseApplication.class));
    }

    @Test
    void adminUpdatesStatusAndAppendsInternalNoteWithoutChangingApplicationData() {
        FranchiseApplication application = new FranchiseApplication();
        application.setReferenceId("FA-20261112-AB12CD34");
        application.setFullName("Asha Rao");
        application.setMobileNumber("+919876543210");
        application.setEmail("asha@example.com");
        application.setPreferredCity("Hyderabad");
        application.setState("Telangana");
        application.setFullAddress("12 Main Road");
        application.setInvestmentBudget(new BigDecimal("750000"));
        application.setPreferredStoreFormat("BOUTIQUE");
        when(applications.save(application)).thenReturn(application);
        when(applications.findById(application.getId())).thenReturn(Optional.of(application));

        var response = service.adminUpdate(application.getId(),
                new FranchiseApplicationDtos.AdminUpdateRequest(FranchiseApplicationStatus.CONTACTED, "Called applicant"),
                "admin-user-id");

        assertEquals(FranchiseApplicationStatus.CONTACTED, response.status());
        assertEquals("Asha Rao", response.fullName());
        assertNotNull(response.internalNotes());
        org.junit.jupiter.api.Assertions.assertTrue(response.internalNotes().contains("Called applicant"));
        verify(applications).save(application);
    }

    private static FranchiseApplicationDtos.CreateRequest request(String mobile, String email, String city) {
        return new FranchiseApplicationDtos.CreateRequest(
                "Asha Rao", mobile, email, city, "Telangana", "12 Main Road, Hyderabad",
                new BigDecimal("750000"), "BOUTIQUE", "Interested in a boutique location");
    }
}
