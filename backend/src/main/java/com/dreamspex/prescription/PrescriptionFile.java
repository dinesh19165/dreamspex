package com.dreamspex.prescription;

import jakarta.persistence.*;
import java.time.Instant;
import java.util.UUID;

@Entity
@Table(name="prescription_files")
public class PrescriptionFile {
    @Id private String id=UUID.randomUUID().toString();
    @ManyToOne(fetch=FetchType.LAZY,optional=false) @JoinColumn(name="prescription_id",nullable=false) private Prescription prescription;
    @Column(name="original_name",nullable=false) private String originalName;
    @Column(name="storage_key",nullable=false,unique=true) private String storageKey;
    @Column(name="content_type",nullable=false) private String contentType;
    @Column(name="size_bytes",nullable=false) private long sizeBytes;
    @Column(nullable=false) private String checksum;
    @Column(name="created_at",nullable=false) private Instant createdAt=Instant.now();
    public String getId(){return id;} public Prescription getPrescription(){return prescription;} public void setPrescription(Prescription v){prescription=v;}
    public String getOriginalName(){return originalName;} public void setOriginalName(String v){originalName=v;}
    public String getStorageKey(){return storageKey;} public void setStorageKey(String v){storageKey=v;}
    public String getContentType(){return contentType;} public void setContentType(String v){contentType=v;}
    public long getSizeBytes(){return sizeBytes;} public void setSizeBytes(long v){sizeBytes=v;}
    public String getChecksum(){return checksum;} public void setChecksum(String v){checksum=v;}
}
