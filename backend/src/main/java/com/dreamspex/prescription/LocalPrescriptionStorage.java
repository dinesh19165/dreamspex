package com.dreamspex.prescription;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.FileNotFoundException;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.DigestOutputStream;
import java.util.HexFormat;
import java.util.UUID;

@Service
public class LocalPrescriptionStorage implements PrescriptionStorage {
    private final Path root;

    public LocalPrescriptionStorage(@Value("${dreamspex.storage.local-directory}") String directory) {
        root = Paths.get(directory).toAbsolutePath().normalize();
    }

    @Override
    public StoredFile store(MultipartFile file) throws IOException {
        Files.createDirectories(root);
        restrictPermissions(root, true);
        String key = UUID.randomUUID() + extension(file.getContentType());
        Path target = root.resolve(key).normalize();
        if (!root.equals(target.getParent())) {
            throw new IOException("Invalid storage path");
        }
        try (InputStream input = file.getInputStream()) {
            Files.copy(input, target);
        }
        restrictPermissions(target, false);
        try (InputStream input = Files.newInputStream(target)) {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            input.transferTo(new DigestOutputStream(OutputStream.nullOutputStream(), digest));
            return new StoredFile(key, HexFormat.of().formatHex(digest.digest()), Files.size(target));
        } catch (NoSuchAlgorithmException exception) {
            throw new IOException("Checksum unavailable", exception);
        }
    }

    @Override
    public InputStream load(String key) throws IOException {
        Path path = root.resolve(key).normalize();
        if (!root.equals(path.getParent())) {
            throw new FileNotFoundException();
        }
        return Files.newInputStream(path);
    }

    private String extension(String contentType) throws IOException {
        if ("image/jpeg".equals(contentType)) return ".jpg";
        if ("image/png".equals(contentType)) return ".png";
        if ("image/webp".equals(contentType)) return ".webp";
        if ("video/mp4".equals(contentType)) return ".mp4";
        if ("video/webm".equals(contentType)) return ".webm";
        if ("application/pdf".equals(contentType)) return ".pdf";
        throw new IOException("Unsupported file media type");
    }

    private void restrictPermissions(Path path, boolean directory) throws IOException {
        try {
            Files.setPosixFilePermissions(path, directory
                    ? java.nio.file.attribute.PosixFilePermissions.fromString("rwx------")
                    : java.nio.file.attribute.PosixFilePermissions.fromString("rw-------"));
        } catch (UnsupportedOperationException ignored) {
            // Windows applies the current account's ACL to newly created private files.
        }
    }
}
