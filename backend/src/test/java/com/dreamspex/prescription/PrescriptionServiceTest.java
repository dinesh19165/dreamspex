package com.dreamspex.prescription;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.security.CurrentUser;import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.mock.web.MockMultipartFile;
import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import static com.dreamspex.prescription.PrescriptionDtos.*;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PrescriptionServiceTest {
    @Mock CurrentUser current;
    @Mock PrescriptionRepository prescriptions;
    @Mock PrescriptionFileRepository files;
    @Mock PrescriptionStorage storage;
    @Mock NotificationService notifications;
    @Mock ProductRepository products;
    @Mock LensOptionRepository lensOptions;

    @Test
    void customerCannotReadAnotherUsersPrescription() {
        User user = new User();
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.empty());
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.update(new UsernamePasswordAuthenticationToken("u", null), "other",
                        request()));

        assertEquals("PRESCRIPTION_NOT_FOUND", error.code());
    }

    @Test
    void approvedPrescriptionCannotBeEdited() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setStatus("APPROVED");
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.of(prescription));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.update(new UsernamePasswordAuthenticationToken("u", null), "p1",
                        request()));

        assertEquals("PRESCRIPTION_LOCKED", error.code());
    }

    @Test
    void customerCannotDownloadAnotherUsersDocument() {
        User user = new User();
        when(current.require(any())).thenReturn(user);
        when(files.findByIdAndPrescriptionUserId("private-file", user.getId())).thenReturn(Optional.empty());
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.file(new UsernamePasswordAuthenticationToken("u", null), "private-file"));

        assertEquals("FILE_NOT_FOUND", error.code());
    }

    @Test
    void acceptsJpegPngAndPdfSignaturesAndStoresPrivately() throws Exception {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.of(prescription));
        when(storage.store(any())).thenReturn(new PrescriptionStorage.StoredFile("private-key", "checksum", 8));
        when(files.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        service.upload(auth(), "prescription", new MockMultipartFile("file", "rx.jpg", "image/jpeg",
                new byte[]{(byte) 0xff, (byte) 0xd8, (byte) 0xff}));
        service.upload(auth(), "prescription", new MockMultipartFile("file", "rx.png", "image/png",
                new byte[]{(byte) 0x89, 'P', 'N', 'G', 13, 10, 26, 10}));
        service.upload(auth(), "prescription", new MockMultipartFile("file", "rx.pdf", "application/pdf",
                "%PDF-1".getBytes(java.nio.charset.StandardCharsets.US_ASCII)));

        verify(storage, times(3)).store(any());
    }

    @Test
    void rejectsMismatchedDocumentSignatureBeforeStorage() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.of(prescription));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class, () -> service.upload(auth(), "prescription",
                new MockMultipartFile("file", "rx.png", "image/png", new byte[]{1, 2, 3})));

        assertEquals("INVALID_FILE_CONTENT", error.code());
        verifyNoInteractions(storage);
    }

    @Test
    void rejectsDocumentsLargerThanTenMegabytes() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.of(prescription));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class, () -> service.upload(auth(), "prescription",
                new MockMultipartFile("file", "rx.jpg", "image/jpeg", new byte[10 * 1024 * 1024 + 1])));

        assertEquals("FILE_TOO_LARGE", error.code());
        verifyNoInteractions(storage);
    }

    @Test
    void doesNotConfirmIncompletePrescription() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setStatus("DRAFT");
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId(any(), any())).thenReturn(Optional.of(prescription));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);
        PrescriptionRequest incomplete = new PrescriptionRequest("Patient", null, null, null, null, null,
                null, null, null, null, null, null, null, null, "MANUAL", "NOT_RUN", null, true, null, null);

        ApiException error = assertThrows(ApiException.class, () -> service.update(auth(), "p1", incomplete));

        assertEquals("PRESCRIPTION_INCOMPLETE", error.code());
    }

    @Test
    void doesNotApprovePrescriptionBeforeCustomerConfirmation() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setStatus("DRAFT");
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findById("p1")).thenReturn(Optional.of(prescription));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class, () -> service.review(auth(), "p1",
                new PrescriptionReviewRequest("APPROVED", null)));

        assertEquals("PRESCRIPTION_CONFIRMATION_REQUIRED", error.code());
        verify(prescriptions, never()).save(any());
    }

    @Test
    void extractionDoesNotUseAccountNameAndNeverConfirmsAutomatically() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setUser(user);
        prescription.setPatientName("Account holder");
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId("p1", user.getId())).thenReturn(Optional.of(prescription));
        when(files.findByPrescriptionId("p1")).thenReturn(java.util.List.of(new PrescriptionFile()));
        when(prescriptions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        PrescriptionResponse response = service.extract(auth(), "p1",
                new OcrTextRequest("OD SPH -2.00 CYL 0\nOS SPH +1.00 CYL 0\nPD: 62", null));

        assertEquals("", response.patientName());
        assertEquals(new java.math.BigDecimal("62"), response.pd());
        assertFalse(response.customerConfirmed());
        assertTrue(response.missingFields().contains("patientName"));
    }

    @Test
    void createsLensOptionWithNormalizedCodeAndDisplayOrder() {
        when(lensOptions.findByCode("HIGH_INDEX")).thenReturn(Optional.empty());
        when(lensOptions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        LensOptionResponse saved = service.saveLensOption(null, lensOptionRequest(" high_index ", new BigDecimal("125.50")));

        assertEquals("HIGH_INDEX", saved.code());
        assertEquals(new BigDecimal("125.50"), saved.additionalCost());
        assertEquals(20, saved.displayOrder());
        assertTrue(saved.available());
    }

    @Test
    void rejectsDuplicateLensOptionCodes() {
        LensOption existing = new LensOption();
        existing.setCode("BLUE_LIGHT");
        when(lensOptions.findByCode("BLUE_LIGHT")).thenReturn(Optional.of(existing));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.saveLensOption(null, lensOptionRequest("BLUE_LIGHT", BigDecimal.TEN)));

        assertEquals("LENS_OPTION_CODE_CONFLICT", error.code());
        verify(lensOptions, never()).save(any());
    }

    @Test
    void updatesLensOptionPriceAvailabilityAndOrder() {
        LensOption existing = new LensOption();
        existing.setCode("BLUE_LIGHT");
        existing.setName("Blue Light");
        existing.setCategory("COATING");
        when(lensOptions.findById(existing.getId())).thenReturn(Optional.of(existing));
        when(lensOptions.findByCode("BLUE_LIGHT")).thenReturn(Optional.of(existing));
        when(lensOptions.save(any())).thenAnswer(invocation -> invocation.getArgument(0));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        LensOptionResponse saved = service.saveLensOption(existing.getId(),
                new LensOptionRequest("BLUE_LIGHT", "Blue Light Protection", "COATING", "Filters blue light.",
                        new BigDecimal("99.00"), null, false, 30));

        assertEquals(new BigDecimal("99.00"), saved.additionalCost());
        assertFalse(saved.available());
        assertEquals(30, saved.displayOrder());
    }

    @Test
    void deletesExistingLensOption() {
        LensOption existing = new LensOption();
        when(lensOptions.findById(existing.getId())).thenReturn(Optional.of(existing));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        service.deleteLensOption(existing.getId());

        verify(lensOptions).delete(existing);
    }

    @Test
    void rejectsNegativeLensOptionPrices() {
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.saveLensOption(null, lensOptionRequest("BLUE_LIGHT", new BigDecimal("-0.01"))));

        assertEquals("INVALID_LENS_OPTION_PRICE", error.code());
        verifyNoInteractions(lensOptions);
    }

    @Test
    void publicLensOptionsAreLoadedFromAvailablePricedOptions() {
        LensOption option = new LensOption();
        option.setCode("SINGLE_VISION");
        option.setName("Single Vision");
        option.setCategory("TYPE");
        option.setBenefits("One prescription power.");
        option.setAdditionalCost(BigDecimal.ZERO);
        option.setAvailable(true);
        when(lensOptions.findByAvailableTrueAndAdditionalCostGreaterThanEqualOrderByCategoryAscDisplayOrderAscNameAsc(BigDecimal.ZERO))
                .thenReturn(List.of(option));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        List<LensOptionResponse> options = service.publicLensOptions();

        assertEquals(1, options.size());
        assertEquals("SINGLE_VISION", options.getFirst().code());
        assertEquals(BigDecimal.ZERO, options.getFirst().additionalCost());
    }

    @Test
    void rejectsUnavailableLensOptionSelection() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setCustomerConfirmed(true);
        LensOption option = new LensOption();
        option.setCode("SINGLE_VISION");
        option.setAvailable(false);
        option.setAdditionalCost(BigDecimal.ZERO);
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId("p1", user.getId())).thenReturn(Optional.of(prescription));
        when(lensOptions.findByCode("SINGLE_VISION")).thenReturn(Optional.of(option));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.selectLenses(auth(), "p1", new LensSelectionRequest(List.of("SINGLE_VISION"))));

        assertEquals("LENS_UNAVAILABLE", error.code());
        verify(prescriptions, never()).save(any());
    }

    @Test
    void rejectsUnpricedLensOptionSelection() {
        User user = new User();
        Prescription prescription = new Prescription();
        prescription.setCustomerConfirmed(true);
        LensOption option = new LensOption();
        option.setCode("SINGLE_VISION");
        option.setAvailable(true);
        option.setAdditionalCost(null);
        when(current.require(any())).thenReturn(user);
        when(prescriptions.findByIdAndUserId("p1", user.getId())).thenReturn(Optional.of(prescription));
        when(lensOptions.findByCode("SINGLE_VISION")).thenReturn(Optional.of(option));
        PrescriptionService service = new PrescriptionService(current, prescriptions, files, storage, notifications, products, lensOptions);

        ApiException error = assertThrows(ApiException.class,
                () -> service.selectLenses(auth(), "p1", new LensSelectionRequest(List.of("SINGLE_VISION"))));

        assertEquals("LENS_UNAVAILABLE", error.code());
    }

    private static LensOptionRequest lensOptionRequest(String code, BigDecimal price) {
        return new LensOptionRequest(code, "High Index", "MATERIAL", "Thinner lens material.",
                price, null, true, 20);
    }

    private static PrescriptionRequest request() {
        return new PrescriptionRequest("Patient", null, null, null, null, null, null, null, null, null,
                null, null, null, null, "MANUAL", "NOT_RUN", null, false, null, null);
    }

    private static UsernamePasswordAuthenticationToken auth() {
        return new UsernamePasswordAuthenticationToken("u", null);
    }
}
