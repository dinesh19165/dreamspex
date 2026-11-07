package com.dreamspex.admin;

import com.dreamspex.common.ApiException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.io.IOException;
import java.io.FileNotFoundException;
import java.nio.file.NoSuchFileException;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/cms/images")
public class HomepageImageController {
    private final Optional<HomepageImageStorage> storage;
    public HomepageImageController(Optional<HomepageImageStorage> storage) { this.storage = storage; }

    @GetMapping("/{key:.+}")
    ResponseEntity<InputStreamResource> image(@PathVariable String key) {
        HomepageImageStorage imageStorage = storage.orElseThrow(() ->
                new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "Image storage is not configured."));
        InputStreamResource resource;
        try {
            resource = new InputStreamResource(imageStorage.load(key));
        } catch (NoSuchFileException | FileNotFoundException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, "IMAGE_NOT_FOUND", "Image was not found.", exception);
        } catch (IOException | SecurityException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "IMAGE_READ_FAILED", "Image could not be read from storage.", exception);
        }
        MediaType type = key.toLowerCase().endsWith(".png") ? MediaType.IMAGE_PNG
                : key.toLowerCase().endsWith(".webp") ? MediaType.parseMediaType("image/webp")
                : MediaType.IMAGE_JPEG;
        return ResponseEntity.ok().contentType(type).cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1))).body(resource);
    }
}
