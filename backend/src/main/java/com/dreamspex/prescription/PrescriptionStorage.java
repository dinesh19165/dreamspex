package com.dreamspex.prescription;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException; import java.io.InputStream;
public interface PrescriptionStorage {
 StoredFile store(MultipartFile file) throws IOException;
 InputStream load(String storageKey) throws IOException;
 record StoredFile(String storageKey,String checksum,long sizeBytes){}
}
