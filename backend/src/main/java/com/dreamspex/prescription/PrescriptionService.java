package com.dreamspex.prescription;
import com.dreamspex.auth.entity.User;
import com.dreamspex.catalog.entity.Product;
import com.dreamspex.catalog.repository.ProductRepository;
import com.dreamspex.common.ApiException;
import com.dreamspex.notification.NotificationService;
import com.dreamspex.security.CurrentUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import java.io.IOException;
import java.io.InputStream;
import java.time.Instant;
import java.util.*;
import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import static com.dreamspex.prescription.PrescriptionDtos.*;

@Service
public class PrescriptionService {
    private final CurrentUser current;
    private final PrescriptionRepository prescriptions;
    private final PrescriptionFileRepository files;
    private final PrescriptionStorage storage;
    private final NotificationService notifications;
    private final ProductRepository products;
    private final LensOptionRepository lensOptions;
    private final PrescriptionExtractionService extraction = new PrescriptionExtractionService();

    public PrescriptionService(CurrentUser current, PrescriptionRepository prescriptions, PrescriptionFileRepository files,
                               PrescriptionStorage storage, NotificationService notifications,
                               ProductRepository products, LensOptionRepository lensOptions) {
        this.current=current; this.prescriptions=prescriptions; this.files=files; this.storage=storage;
        this.notifications=notifications; this.products=products; this.lensOptions=lensOptions;
    }

    @Transactional(readOnly=true)
    public List<PrescriptionResponse> list(org.springframework.security.core.Authentication auth, String productId) {
        return prescriptions.findByUserIdOrderByCreatedAtDesc(current.require(auth).getId()).stream()
                .filter(p -> productId == null || p.getProduct() != null && productId.equals(p.getProduct().getId()))
                .map(this::response).toList();
    }
    @Transactional
    public PrescriptionResponse create(org.springframework.security.core.Authentication auth, PrescriptionRequest request) {
        User user=current.require(auth); Prescription p=new Prescription(); p.setUser(user); copy(request,p);
        Prescription saved=prescriptions.save(p);
        return response(saved);
    }
    @Transactional(readOnly=true)
    public PrescriptionResponse get(org.springframework.security.core.Authentication auth, String id) {
        return response(owned(auth, id));
    }
    @Transactional
    public PrescriptionResponse update(org.springframework.security.core.Authentication auth,String id,PrescriptionRequest request) {
        Prescription p=owned(auth,id);
        if ("APPROVED".equals(p.getStatus())) throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_LOCKED","Approved prescriptions cannot be edited.");
        copy(request,p);
        if (request.customerConfirmed()) {
            validateForConfirmation(p);
            p.setCustomerConfirmed(true);
            p.setStatus("PENDING_REVIEW");
            notifications.create(p.getUser(),"PRESCRIPTION_CREATED","Prescription submitted","Your prescription was submitted for review.");
        } else {
            p.setCustomerConfirmed(false);
            p.setStatus("DRAFT");
        }
        p.setReviewNote(null);
        return response(prescriptions.save(p));
    }
    @Transactional
    public void delete(org.springframework.security.core.Authentication auth,String id) {
        Prescription p=owned(auth,id);
        if ("APPROVED".equals(p.getStatus())) throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_LOCKED","Approved prescriptions cannot be deleted.");
        prescriptions.delete(p);
    }
    @Transactional
    public FileResponse upload(org.springframework.security.core.Authentication auth,String id,MultipartFile file) {
        Prescription p=owned(auth,id); validateFile(file);
        try {
            validateFileSignature(file.getBytes(), file.getContentType());
            PrescriptionStorage.StoredFile stored=storage.store(file); PrescriptionFile record=new PrescriptionFile();
            record.setPrescription(p); record.setOriginalName(safeFilename(file.getOriginalFilename())); record.setStorageKey(stored.storageKey());
            record.setContentType(file.getContentType()); record.setSizeBytes(stored.sizeBytes()); record.setChecksum(stored.checksum());
            PrescriptionFile saved=files.save(record); notifications.create(p.getUser(),"PRESCRIPTION_FILE_UPLOADED","Prescription file uploaded","A prescription file was added to your prescription."); return fileResponse(saved);
        } catch(IOException e) { throw new ApiException(HttpStatus.BAD_GATEWAY,"FILE_STORAGE_ERROR","Prescription file could not be stored."); }
    }
    @Transactional
    public PrescriptionResponse extract(org.springframework.security.core.Authentication auth, String id, OcrTextRequest request) {
        Prescription p=owned(auth,id);
        if (files.findByPrescriptionId(id).isEmpty()) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"PRESCRIPTION_FILE_REQUIRED","Upload a prescription document before extraction.");
        }
        PrescriptionExtractionService.PrescriptionExtraction result = extraction.extract(request.text(), request.confidence());
        p.setSource("UPLOAD"); p.setExtractionStatus(result.status()); p.setExtractionConfidence(result.confidence());
        p.setCustomerConfirmed(false);
        p.setPatientName(result.patientName() == null ? "" : result.patientName());
        p.setRightSph(result.rightSph()); p.setRightCyl(result.rightCyl()); p.setRightAxis(result.rightAxis()); p.setRightAdd(result.rightAdd());
        p.setLeftSph(result.leftSph()); p.setLeftCyl(result.leftCyl()); p.setLeftAxis(result.leftAxis()); p.setLeftAdd(result.leftAdd());
        p.setPd(result.pd()); p.setRightPd(result.rightPd()); p.setLeftPd(result.leftPd());
        p.setPrescriptionDate(result.prescriptionDate()); p.setExpiryDate(result.expiryDate());
        return response(prescriptions.save(p));
    }
    @Transactional(readOnly=true)
    public List<LensOptionResponse> recommendations(org.springframework.security.core.Authentication auth, String id) {
        Prescription p=owned(auth,id);
        boolean addPresent = positive(p.getRightAdd()) || positive(p.getLeftAdd());
        boolean highPower = maxAbs(p.getRightSph(), p.getLeftSph(), p.getRightCyl(), p.getLeftCyl())
                .compareTo(BigDecimal.valueOf(4)) >= 0;
        return lensOptions.findByAvailableTrueAndAdditionalCostGreaterThanEqualOrderByCategoryAscDisplayOrderAscNameAsc(BigDecimal.ZERO).stream()
                .map(option -> {
                    boolean recommended = isRecommended(option.getCode(), addPresent, highPower);
                    return lensResponse(option, recommended, recommended ? recommendationReason(option.getCode()) : null);
                }).toList();
    }
    @Transactional
    public PrescriptionResponse selectLenses(org.springframework.security.core.Authentication auth, String id, LensSelectionRequest request) {
        Prescription p=owned(auth,id);
        if (!p.isCustomerConfirmed()) throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_CONFIRMATION_REQUIRED","Confirm the prescription values before selecting lenses.");
        List<String> codes = request.codes().stream().map(code -> code.trim().toUpperCase(Locale.ROOT)).distinct().toList();
        if (codes.size() != request.codes().size()) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_LENS_SELECTION","Lens options must not be repeated.");
        List<LensOption> selected = codes.stream().map(code -> lensOptions.findByCode(code)
                .filter(option -> option.isAvailable() && option.getAdditionalCost() != null
                        && option.getAdditionalCost().signum() >= 0)
                .orElseThrow(() -> new ApiException(HttpStatus.CONFLICT,"LENS_UNAVAILABLE","One or more selected lens options are unavailable."))).toList();
        long typeCount=selected.stream().filter(option -> "TYPE".equals(option.getCategory())).count();
        if (typeCount != 1) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_LENS_SELECTION","Select exactly one lens type.");
        p.setSelectedLensCodes(String.join(",", codes));
        return response(prescriptions.save(p));
    }
    @Transactional(readOnly=true)
    public List<LensOptionResponse> adminLensOptions() {
        return lensOptions.findAllByOrderByCategoryAscDisplayOrderAscNameAsc().stream()
                .map(option -> lensResponse(option, false, null)).toList();
    }
    @Transactional(readOnly=true)
    public List<LensOptionResponse> publicLensOptions() {
        return lensOptions.findByAvailableTrueAndAdditionalCostGreaterThanEqualOrderByCategoryAscDisplayOrderAscNameAsc(BigDecimal.ZERO).stream()
                .map(option -> lensResponse(option, false, null)).toList();
    }
    @Transactional
    public LensOptionResponse saveLensOption(String id, LensOptionRequest request) {
        validateLensOptionRequest(request);
        LensOption option = id == null ? new LensOption() : lensOptions.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"LENS_OPTION_NOT_FOUND","Lens option was not found."));
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        lensOptions.findByCode(code).filter(existing -> !existing.getId().equals(option.getId())).ifPresent(existing -> {
            throw new ApiException(HttpStatus.CONFLICT,"LENS_OPTION_CODE_CONFLICT","A lens option with this code already exists.");
        });
        option.setCode(code); option.setName(request.name().trim()); option.setCategory(request.category());
        option.setBenefits(request.benefits().trim()); option.setAdditionalCost(request.additionalCost());
        option.setPreparationDays(request.preparationDays());
        option.setAvailable(request.available());
        option.setDisplayOrder(request.displayOrder());
        return lensResponse(lensOptions.save(option), false, null);
    }
    @Transactional
    public void deleteLensOption(String id) {
        LensOption option = lensOptions.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND,"LENS_OPTION_NOT_FOUND","Lens option was not found."));
        lensOptions.delete(option);
    }
    @Transactional(readOnly=true)
    public PrescriptionFile file(org.springframework.security.core.Authentication auth,String id) {
        return files.findByIdAndPrescriptionUserId(id,current.require(auth).getId())
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"FILE_NOT_FOUND","Prescription file was not found."));
    }
    @Transactional(readOnly=true)
    public PrescriptionFile adminFile(String id) {
        return files.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"FILE_NOT_FOUND","Prescription file was not found."));
    }
    @Transactional(readOnly=true)
    public InputStream download(org.springframework.security.core.Authentication auth,String id) throws IOException {
        return storage.load(file(auth,id).getStorageKey());
    }
    @Transactional(readOnly=true)
    public InputStream adminDownload(String id) throws IOException {
        return storage.load(adminFile(id).getStorageKey());
    }
    @Transactional(readOnly=true)
    public List<PrescriptionResponse> adminList(String status) {
        return prescriptions.findByStatusOrderByCreatedAtAsc(status==null?"PENDING_REVIEW":status).stream().map(this::response).toList();
    }
    @Transactional
    public PrescriptionResponse review(org.springframework.security.core.Authentication auth,String id,PrescriptionReviewRequest request) {
        User reviewer=current.require(auth); Prescription p=prescriptions.findById(id).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRESCRIPTION_NOT_FOUND","Prescription was not found."));
        if ("APPROVED".equals(request.status())) {
            if (!p.isCustomerConfirmed()) {
                throw new ApiException(HttpStatus.CONFLICT,"PRESCRIPTION_CONFIRMATION_REQUIRED","The customer must confirm prescription values before approval.");
            }
            validateForConfirmation(p);
        }
        p.setStatus(request.status()); p.setReviewNote(request.reviewNote()); p.setReviewedBy(reviewer.getId()); p.setReviewedAt(Instant.now());
        Prescription saved=prescriptions.save(p); notifications.create(p.getUser(),"PRESCRIPTION_"+request.status(),"Prescription review updated","Your prescription review status is "+request.status().toLowerCase()+"."); return response(saved);
    }
    private Prescription owned(org.springframework.security.core.Authentication auth,String id){return prescriptions.findByIdAndUserId(id,current.require(auth).getId()).orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRESCRIPTION_NOT_FOUND","Prescription was not found."));}
    private void copy(PrescriptionRequest r,Prescription p){
        p.setPatientName(Objects.requireNonNullElse(r.patientName(),"").trim()); p.setPrescriptionDate(r.prescriptionDate()); p.setExpiryDate(r.expiryDate());
        p.setRightSph(r.rightSph()); p.setRightCyl(r.rightCyl()); p.setRightAxis(r.rightAxis()); p.setRightAdd(r.rightAdd());
        p.setLeftSph(r.leftSph()); p.setLeftCyl(r.leftCyl()); p.setLeftAxis(r.leftAxis()); p.setLeftAdd(r.leftAdd());
        p.setRightPd(r.rightPd()); p.setLeftPd(r.leftPd());
        p.setPd(r.rightPd()!=null && r.leftPd()!=null ? r.rightPd().add(r.leftPd()) : r.pd());
        if (r.source()!=null) p.setSource(r.source());
        if (r.extractionStatus()!=null) p.setExtractionStatus(r.extractionStatus());
        if (r.extractionConfidence()!=null) p.setExtractionConfidence(r.extractionConfidence());
        if (r.productId()!=null) p.setProduct(products.findById(r.productId())
                .orElseThrow(()->new ApiException(HttpStatus.NOT_FOUND,"PRODUCT_NOT_FOUND","Product was not found.")));
        if (r.selectedLensCodes()!=null) p.setSelectedLensCodes(String.join(",",r.selectedLensCodes()));
    }
    private void validateFile(MultipartFile f){
        if(f==null||f.isEmpty()||f.getOriginalFilename()==null||f.getOriginalFilename().isBlank())throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_FILE","A non-empty prescription file is required.");
        if(f.getSize()>10L*1024*1024)throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"FILE_TOO_LARGE","Prescription files must be 10 MB or smaller.");
        if(!List.of("image/jpeg","image/png","application/pdf").contains(f.getContentType()))throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_FILE_TYPE","Only JPEG, PNG, and PDF files are allowed.");
    }
    private void validateFileSignature(byte[] bytes,String contentType) {
        boolean valid = switch (contentType) {
            case "image/jpeg" -> bytes.length >= 3 && (bytes[0]&255)==0xff && (bytes[1]&255)==0xd8 && (bytes[2]&255)==0xff;
            case "image/png" -> bytes.length >= 8 && (bytes[0]&255)==0x89 && bytes[1]=='P' && bytes[2]=='N' && bytes[3]=='G'
                    && bytes[4]==13 && bytes[5]==10 && bytes[6]==26 && bytes[7]==10;
            case "application/pdf" -> bytes.length >= 5 && new String(bytes,0,5,StandardCharsets.US_ASCII).equals("%PDF-");
            default -> false;
        };
        if (!valid) throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_FILE_CONTENT","The uploaded file content does not match its file type.");
    }
    private String safeFilename(String filename) {
        String value=filename.replaceAll("[\\r\\n\\\\/\\p{Cntrl}]","_");
        return value.length()>255?value.substring(value.length()-255):value;
    }
    private void validateForConfirmation(Prescription p) {
        if (p.getPatientName()==null || p.getPatientName().isBlank()
                || p.getRightSph()==null || p.getRightCyl()==null || p.getLeftSph()==null || p.getLeftCyl()==null
                || (p.getRightCyl().compareTo(BigDecimal.ZERO)!=0 && p.getRightAxis()==null)
                || (p.getLeftCyl().compareTo(BigDecimal.ZERO)!=0 && p.getLeftAxis()==null)
                || (p.getPd()==null && (p.getRightPd()==null || p.getLeftPd()==null))) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"PRESCRIPTION_INCOMPLETE","Enter the required SPH, CYL, applicable AXIS, and PD values before confirming.");
        }
        if (p.getPrescriptionDate() != null && p.getExpiryDate() != null
                && p.getExpiryDate().isBefore(p.getPrescriptionDate())) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_PRESCRIPTION_DATES",
                    "Prescription expiry date cannot be before its issue date.");
        }
    }
    private void validateLensOptionRequest(LensOptionRequest request) {
        if (request.additionalCost() == null || request.additionalCost().signum() < 0
                || request.additionalCost().scale() > 2) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_LENS_OPTION_PRICE",
                    "Lens option prices must be non-negative and use no more than two decimal places.");
        }
        if (request.displayOrder() < 0 || request.displayOrder() > 10000) {
            throw new ApiException(HttpStatus.UNPROCESSABLE_ENTITY,"INVALID_LENS_OPTION_ORDER",
                    "Display order must be between 0 and 10000.");
        }
    }
    private LensOptionResponse lensResponse(LensOption option, boolean recommended, String reason) {
        return new LensOptionResponse(option.getId(),option.getCode(),option.getName(),option.getCategory(),
                option.getBenefits(),option.getAdditionalCost(),option.getPreparationDays(),option.isAvailable(),
                option.getDisplayOrder(),recommended,reason);
    }
    private boolean isRecommended(String code, boolean addPresent, boolean highPower) {
        return switch (code) {
            case "SINGLE_VISION" -> !addPresent;
            case "BIFOCAL", "PROGRESSIVE" -> addPresent;
            case "HIGH_INDEX" -> highPower;
            default -> false;
        };
    }
    private String recommendationReason(String code) {
        return switch (code) {
            case "SINGLE_VISION" -> "An option to discuss for prescriptions without ADD values.";
            case "BIFOCAL", "PROGRESSIVE" -> "Your prescription includes ADD values; compare these options with an optician.";
            case "HIGH_INDEX" -> "Your prescription includes higher powers; ask an optician about lens material options.";
            default -> null;
        };
    }
    private boolean positive(BigDecimal value) { return value!=null && value.compareTo(BigDecimal.ZERO)>0; }
    private BigDecimal maxAbs(BigDecimal... values) {
        return Arrays.stream(values).filter(Objects::nonNull).map(BigDecimal::abs).max(BigDecimal::compareTo).orElse(BigDecimal.ZERO);
    }
    private List<String> selectedCodes(Prescription prescription) {
        return prescription.getSelectedLensCodes()==null || prescription.getSelectedLensCodes().isBlank()
                ? List.of() : Arrays.asList(prescription.getSelectedLensCodes().split(","));
    }
    private List<String> missingFields(Prescription p) {
        if (!"UPLOAD".equals(p.getSource()) || "NOT_RUN".equals(p.getExtractionStatus())) return List.of();
        List<String> missing = new ArrayList<>();
        if (p.getPatientName()==null || p.getPatientName().isBlank()) missing.add("patientName");
        if (p.getRightSph()==null) missing.add("rightSph");
        if (p.getRightCyl()==null) missing.add("rightCyl");
        if (p.getRightCyl()!=null && p.getRightCyl().compareTo(BigDecimal.ZERO)!=0 && p.getRightAxis()==null) missing.add("rightAxis");
        if (p.getLeftSph()==null) missing.add("leftSph");
        if (p.getLeftCyl()==null) missing.add("leftCyl");
        if (p.getLeftCyl()!=null && p.getLeftCyl().compareTo(BigDecimal.ZERO)!=0 && p.getLeftAxis()==null) missing.add("leftAxis");
        if (p.getPd()==null) missing.add("pd");
        return missing;
    }
    private FileResponse fileResponse(PrescriptionFile f){return new FileResponse(f.getId(),f.getOriginalName(),f.getContentType(),f.getSizeBytes(),f.getChecksum());}
    private PrescriptionResponse response(Prescription p){return new PrescriptionResponse(p.getId(),p.getPatientName(),p.getPrescriptionDate(),p.getRightSph(),p.getRightCyl(),p.getRightAxis(),p.getRightAdd(),p.getLeftSph(),p.getLeftCyl(),p.getLeftAxis(),p.getLeftAdd(),p.getPd(),p.getStatus(),p.getReviewNote(),files.findByPrescriptionId(p.getId()).stream().map(this::fileResponse).toList(),p.getRightPd(),p.getLeftPd(),p.getExpiryDate(),p.getSource(),p.getExtractionStatus(),p.getExtractionConfidence(),p.isCustomerConfirmed(),p.getProduct()==null?null:p.getProduct().getId(),p.getOrder()==null?null:p.getOrder().getId(),selectedCodes(p),missingFields(p));}
}
