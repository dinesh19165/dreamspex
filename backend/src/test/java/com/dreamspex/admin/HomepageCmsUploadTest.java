package com.dreamspex.admin;


import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.repository.CategoryRepository;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.audit.AuditLogService;import com.dreamspex.common.ApiException;
import com.dreamspex.security.CurrentUser;
import com.dreamspex.admin.HomepageCmsDtos.BannerRequest;
import com.dreamspex.admin.HomepageCmsDtos.UploadResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertArrayEquals;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;

class HomepageCmsUploadTest {
    private static final byte[] IMAGE_BYTES = {1, 2, 3, 4};
    private static final byte[] WEBM_BYTES = {0x1a, 0x45, (byte) 0xdf, (byte) 0xa3, 0x01, 0x02, 0x03, 0x04};
    private static final byte[] MP4_BYTES = {0, 0, 0, 12, 'f', 't', 'y', 'p', 'i', 's', 'o', 'm'};

    @TempDir
    Path tempDirectory;

    private final CurrentUser currentUser = mock(CurrentUser.class);
    private final AuditLogService audit = mock(AuditLogService.class);
    private final User actor = new User();
    private final UsernamePasswordAuthenticationToken authentication =
            new UsernamePasswordAuthenticationToken("admin", null);

    @BeforeEach
    void setUp() {
        when(currentUser.require(authentication)).thenReturn(actor);
    }

    @Test
    void uploadsImageAndServesItFromReturnedUrl() throws Exception {
        HomepageImageStorage storage = storageAt(tempDirectory.resolve("uploads"));
        HomepageCmsService service = service(storage);

        UploadResponse upload = service.upload(authentication, imageFile());
        HomepageImageController controller = new HomepageImageController(Optional.of(storage));
        var response = controller.image(upload.storageKey());
        InputStreamResource resource = response.getBody();

        assertEquals("/api/v1/cms/images/" + upload.storageKey(), upload.url());
        assertEquals("image/webp", response.getHeaders().getContentType().toString());
        assertTrue(upload.storageKey().endsWith(".webp"));
        assertArrayEquals(IMAGE_BYTES, resource.getInputStream().readAllBytes());
        verify(audit).record(actor, "CMS_IMAGE_UPLOADED", "CMS_IMAGE", upload.storageKey());
    }

    @Test
    void uploadsWebmVideoAndServesItFromReturnedUrl() throws Exception {
        HomepageImageStorage storage = storageAt(tempDirectory.resolve("uploads"));
        HomepageCmsService service = service(storage);

        UploadResponse upload = service.uploadVideo(authentication, videoFile());
        HomepageVideoController controller = new HomepageVideoController(Optional.of(storage));
        var response = controller.video(upload.storageKey());

        assertEquals("/api/v1/cms/videos/" + upload.storageKey(), upload.url());
        assertEquals("video/webm", response.getHeaders().getContentType().toString());
        assertTrue(upload.storageKey().endsWith(".webm"));
        assertArrayEquals(WEBM_BYTES, response.getBody().getInputStream().readAllBytes());
        verify(audit).record(actor, "CMS_VIDEO_UPLOADED", "CMS_VIDEO", upload.storageKey());
    }

    @Test
    void uploadsMp4VideoAndServesItFromReturnedUrl() throws Exception {
        HomepageImageStorage storage = storageAt(tempDirectory.resolve("uploads"));
        UploadResponse upload = service(storage).uploadVideo(authentication, mp4File());
        var response = new HomepageVideoController(Optional.of(storage)).video(upload.storageKey());

        assertEquals("/api/v1/cms/videos/" + upload.storageKey(), upload.url());
        assertEquals("video/mp4", response.getHeaders().getContentType().toString());
        assertTrue(upload.storageKey().endsWith(".mp4"));
        assertArrayEquals(MP4_BYTES, response.getBody().getInputStream().readAllBytes());
    }

    @Test
    void rejectsVideoWithInvalidFileSignature() {
        MockMultipartFile file = new MockMultipartFile("file", "banner.mp4", "video/mp4", IMAGE_BYTES);

        ApiException error = assertThrows(ApiException.class, () -> service(mock(HomepageImageStorage.class))
                .uploadVideo(authentication, file));

        assertEquals("INVALID_VIDEO", error.code());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
    }

    @Test
    void rejectsVideoLargerThanOneHundredMegabytes() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("large.mp4");
        when(file.getContentType()).thenReturn("video/mp4");
        when(file.getSize()).thenReturn(100_000_001L);

        ApiException error = assertThrows(ApiException.class, () -> service(mock(HomepageImageStorage.class))
                .uploadVideo(authentication, file));

        assertEquals("VIDEO_TOO_LARGE", error.code());
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, error.status());
    }

    @Test
    void doesNotServeNonVideoFilesFromPublicVideoEndpoint() {
        HomepageVideoController controller = new HomepageVideoController(Optional.of(storageAt(tempDirectory.resolve("uploads"))));

        ApiException error = assertThrows(ApiException.class, () -> controller.video("a3f16e72-174d-4c8f-aad0-078ab61b6ec8.pdf"));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
    }

    @Test
    void savesLegacyImageBannerAsImageMediaType() {
        BannerRepository banners = mock(BannerRepository.class);
        when(banners.save(any(Banner.class))).thenAnswer(invocation -> invocation.getArgument(0));
        HomepageCmsService service = service(storageAt(tempDirectory.resolve("uploads")), banners);

        var saved = service.saveBanner(authentication, null, bannerRequest(
                "/api/v1/cms/images/existing.webp", null, null, null, null));

        assertEquals("IMAGE", saved.desktopMediaType());
        assertEquals("/api/v1/cms/images/existing.webp", saved.desktopImageUrl());
        verify(audit).record(actor, "CMS_BANNER_SAVED", "BANNER", saved.id());
    }

    @Test
    void updatesAndDeletesVideoBannerWithMobileFallback() {
        BannerRepository banners = mock(BannerRepository.class);
        Banner existing = new Banner();
        existing.setImageUrl("/api/v1/cms/images/old.webp");
        when(banners.findById("banner-id")).thenReturn(Optional.of(existing));
        when(banners.findByIdForUpdate("banner-id")).thenReturn(Optional.of(existing));
        when(banners.save(any(Banner.class))).thenAnswer(invocation -> invocation.getArgument(0));
        HomepageCmsService service = service(storageAt(tempDirectory.resolve("uploads")), banners);
        String videoKey = "a3f16e72-174d-4c8f-aad0-078ab61b6ec8.webm";

        var saved = service.saveBanner(authentication, "banner-id", bannerRequest(
                null,
                "/api/v1/cms/images/mobile.webp",
                "VIDEO",
                "/api/v1/cms/videos/" + videoKey,
                videoKey));
        service.deleteBanner(authentication, "banner-id");

        assertEquals("VIDEO", saved.desktopMediaType());
        assertEquals("/api/v1/cms/images/mobile.webp", saved.desktopImageUrl());
        assertEquals(videoKey, saved.desktopVideoStorageKey());
        verify(banners).delete(existing);
        verify(audit).record(actor, "CMS_BANNER_DELETED", "BANNER", "banner-id");
    }

    @Test
    void deletingMissingBannerReturnsNotFoundWithoutAudit() {
        BannerRepository banners = mock(BannerRepository.class);
        when(banners.findByIdForUpdate("missing-banner")).thenReturn(Optional.empty());
        HomepageCmsService service = service(storageAt(tempDirectory.resolve("uploads")), banners);

        ApiException error = assertThrows(ApiException.class,
                () -> service.deleteBanner(authentication, "missing-banner"));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
        assertEquals("BANNER_NOT_FOUND", error.code());
        verify(banners).findByIdForUpdate("missing-banner");
        verify(banners, org.mockito.Mockito.never()).delete(any(Banner.class));
        verify(audit, org.mockito.Mockito.never()).record(any(), any(), any(), any());
    }

    @Test
    void rejectsVideoBannerWithoutMobileImage() {
        String videoKey = "a3f16e72-174d-4c8f-aad0-078ab61b6ec8.mp4";
        HomepageCmsService service = service(mock(HomepageImageStorage.class));

        ApiException error = assertThrows(ApiException.class, () -> service.saveBanner(
                authentication,
                null,
                bannerRequest(null, null, "VIDEO", "/api/v1/cms/videos/" + videoKey, videoKey)));

        assertEquals("INVALID_BANNER", error.code());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
    }

    @Test
    void rejectsUnsupportedImageFormat() {
        MockMultipartFile file = new MockMultipartFile("file", "banner.svg", "image/svg+xml", IMAGE_BYTES);

        ApiException error = assertThrows(ApiException.class, () -> service(mock(HomepageImageStorage.class))
                .upload(authentication, file));

        assertEquals("INVALID_IMAGE_TYPE", error.code());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
    }

    @Test
    void rejectsEmptyImage() {
        MockMultipartFile file = new MockMultipartFile("file", "banner.jpg", "image/jpeg", new byte[0]);

        ApiException error = assertThrows(ApiException.class, () -> service(mock(HomepageImageStorage.class))
                .upload(authentication, file));

        assertEquals("INVALID_IMAGE", error.code());
        assertEquals(HttpStatus.UNPROCESSABLE_ENTITY, error.status());
    }

    @Test
    void rejectsImageLargerThanTenMegabytes() {
        MultipartFile file = mock(MultipartFile.class);
        when(file.isEmpty()).thenReturn(false);
        when(file.getOriginalFilename()).thenReturn("large.jpg");
        when(file.getSize()).thenReturn(10_000_001L);

        ApiException error = assertThrows(ApiException.class, () -> service(mock(HomepageImageStorage.class))
                .upload(authentication, file));

        assertEquals("IMAGE_TOO_LARGE", error.code());
        assertEquals(HttpStatus.PAYLOAD_TOO_LARGE, error.status());
    }

    @Test
    void reportsStorageWriteFailureAsGatewayError() throws IOException {
        Path occupiedPath = tempDirectory.resolve("not-a-directory");
        Files.writeString(occupiedPath, "occupied");
        HomepageImageStorage storage = storageAt(occupiedPath.resolve("uploads"));

        ApiException error = assertThrows(ApiException.class,
                () -> service(storage).upload(authentication, imageFile()));

        assertEquals("IMAGE_UPLOAD_FAILED", error.code());
        assertEquals(HttpStatus.BAD_GATEWAY, error.status());
        assertTrue(error.getCause() instanceof IOException);
    }

    @Test
    void reportsMissingStoredImageAsNotFound() {
        HomepageImageStorage storage = storageAt(tempDirectory.resolve("uploads"));
        HomepageImageController controller = new HomepageImageController(Optional.of(storage));

        ApiException error = assertThrows(ApiException.class, () -> controller.image("missing.jpg"));

        assertEquals("IMAGE_NOT_FOUND", error.code());
        assertEquals(HttpStatus.NOT_FOUND, error.status());
    }

    @Test
    void doesNotServePrescriptionPdfFromPublicCmsImageEndpoint() {
        HomepageImageController controller = new HomepageImageController(Optional.of(storageAt(tempDirectory.resolve("uploads"))));

        ApiException error = assertThrows(ApiException.class, () -> controller.image("a3f16e72-174d-4c8f-aad0-078ab61b6ec8.pdf"));

        assertEquals(HttpStatus.NOT_FOUND, error.status());
    }

    private HomepageCmsService service(HomepageImageStorage storage) {
        return service(storage, mock(BannerRepository.class));
    }

    private HomepageCmsService service(HomepageImageStorage storage, BannerRepository banners) {
        return new HomepageCmsService(
                banners,
                mock(HomepageSectionRepository.class),
                mock(HomepageCardRepository.class),
                mock(ProductRepository.class),
                mock(CategoryRepository.class),
                currentUser,
                audit,
                Optional.of(storage));
    }

    private HomepageImageStorage storageAt(Path path) {
        return new HomepageImageStorage(path.toString());
    }

    private MockMultipartFile imageFile() {
        return new MockMultipartFile("file", "banner.webp", "image/webp", IMAGE_BYTES);
    }

    private MockMultipartFile videoFile() {
        return new MockMultipartFile("file", "banner.webm", "video/webm", WEBM_BYTES);
    }

    private MockMultipartFile mp4File() {
        return new MockMultipartFile("file", "banner.mp4", "video/mp4", MP4_BYTES);
    }

    private BannerRequest bannerRequest(String desktopImage, String mobileImage, String mediaType, String videoUrl, String videoKey) {
        return new BannerRequest(
                "Homepage banner", null, null, desktopImage, mobileImage, null, null, mediaType, videoUrl, videoKey,
                null, null, null, null, "center", 0, "DRAFT", null, null);
    }
}
