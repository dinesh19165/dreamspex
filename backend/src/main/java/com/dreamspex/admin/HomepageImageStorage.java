package com.dreamspex.admin;

import com.dreamspex.prescription.LocalPrescriptionStorage;
import com.dreamspex.prescription.PrescriptionStorage;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;

@Service
public class HomepageImageStorage {
    private final LocalPrescriptionStorage storage;

    public HomepageImageStorage(@Value("${dreamspex.storage.homepage-images-directory:${user.home}/.dream-spex/homepage-images}") String directory) {
        storage = new LocalPrescriptionStorage(directory);
    }

    public PrescriptionStorage.StoredFile store(MultipartFile file) throws IOException {
        return storage.store(file);
    }

    public PrescriptionStorage.StoredFile storeVideo(MultipartFile file) throws IOException {
        return storage.store(file);
    }

    public InputStream load(String key) throws IOException {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}\\.(jpg|png|webp)")) {
            throw new java.io.FileNotFoundException();
        }
        return storage.load(key);
    }

    public InputStream loadVideo(String key) throws IOException {
        if (key == null || !key.matches("[0-9a-fA-F-]{36}\\.(mp4|webm)")) {
            throw new java.io.FileNotFoundException();
        }
        return storage.load(key);
    }
}
