package com.dreamspex.prescription;
import jakarta.validation.Valid; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import java.util.List; import static com.dreamspex.prescription.PrescriptionDtos.*;
import com.dreamspex.audit.AuditLogService; import com.dreamspex.security.CurrentUser;
import org.springframework.core.io.InputStreamResource; import org.springframework.http.*; import java.io.IOException;
@RestController @RequestMapping("/api/v1/admin/prescriptions") @PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminPrescriptionController {
 private final PrescriptionService s; private final CurrentUser current; private final AuditLogService audit; public AdminPrescriptionController(PrescriptionService s,CurrentUser current,AuditLogService audit){this.s=s;this.current=current;this.audit=audit;}
 @GetMapping List<PrescriptionResponse> list(@RequestParam(required=false) String status){return s.adminList(status);}
 @PatchMapping("/{id}/review") PrescriptionResponse review(Authentication a,@PathVariable String id,@Valid @RequestBody PrescriptionReviewRequest r){PrescriptionResponse out=s.review(a,id,r);audit.record(current.require(a),"PRESCRIPTION_REVIEWED","PRESCRIPTION",id);return out;}
 @GetMapping("/files/{fileId}") ResponseEntity<InputStreamResource> download(@PathVariable String fileId)throws IOException{PrescriptionFile f=s.adminFile(fileId);return ResponseEntity.ok().contentType(MediaType.parseMediaType(f.getContentType())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.attachment().filename(f.getOriginalName(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).header(HttpHeaders.CACHE_CONTROL,"private, no-store").header("X-Content-Type-Options","nosniff").body(new InputStreamResource(s.adminDownload(fileId)));}
 @GetMapping("/lens-options") List<LensOptionResponse> lensOptions(){return s.adminLensOptions();}
 @PostMapping("/lens-options") @ResponseStatus(HttpStatus.CREATED)
 LensOptionResponse createLensOption(Authentication a,@Valid @RequestBody LensOptionRequest r){LensOptionResponse out=s.saveLensOption(null,r);audit.record(current.require(a),"LENS_OPTION_CREATED","LENS_OPTION",out.id());return out;}
 @PatchMapping("/lens-options/{id}") LensOptionResponse updateLensOption(Authentication a,@PathVariable String id,@Valid @RequestBody LensOptionRequest r){LensOptionResponse out=s.saveLensOption(id,r);audit.record(current.require(a),"LENS_OPTION_UPDATED","LENS_OPTION",id);return out;}
 @DeleteMapping("/lens-options/{id}") @ResponseStatus(HttpStatus.NO_CONTENT)
 void deleteLensOption(Authentication a,@PathVariable String id){s.deleteLensOption(id);audit.record(current.require(a),"LENS_OPTION_DELETED","LENS_OPTION",id);}
}
