package com.dreamspex.admin;

import com.dreamspex.common.ApiException;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.nio.file.NoSuchFileException;
import java.util.Optional;

@RestController
@RequestMapping("/api/v1/cms/videos")
public class HomepageVideoController {
    private final Optional<HomepageImageStorage> storage;

    public HomepageVideoController(Optional<HomepageImageStorage> storage) {
        this.storage = storage;
    }

    @GetMapping("/{key:.+}")
    ResponseEntity<InputStreamResource> video(@PathVariable String key) {
        HomepageImageStorage videoStorage = storage.orElseThrow(() ->
                new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "STORAGE_UNAVAILABLE", "Video storage is not configured."));
        InputStreamResource resource;
        try {
            resource = new InputStreamResource(videoStorage.loadVideo(key));
        } catch (NoSuchFileException | FileNotFoundException exception) {
            throw new ApiException(HttpStatus.NOT_FOUND, "VIDEO_NOT_FOUND", "Video was not found.", exception);
        } catch (IOException | SecurityException exception) {
            throw new ApiException(HttpStatus.BAD_GATEWAY, "VIDEO_READ_FAILED", "Video could not be read from storage.", exception);
        }
        MediaType type = key.toLowerCase().endsWith(".webm")
                ? MediaType.parseMediaType("video/webm")
                : MediaType.parseMediaType("video/mp4");
        return ResponseEntity.ok()
                .contentType(type)
                .cacheControl(CacheControl.maxAge(java.time.Duration.ofHours(1)))
                .body(resource);
    }
}
