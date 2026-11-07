package com.dreamspex.prescription;
import jakarta.validation.Valid; import org.springframework.core.io.InputStreamResource; import org.springframework.http.*; import org.springframework.security.access.prepost.PreAuthorize; import org.springframework.security.core.Authentication; import org.springframework.web.bind.annotation.*; import org.springframework.web.multipart.MultipartFile; import java.io.IOException; import java.util.List; import static com.dreamspex.prescription.PrescriptionDtos.*;
@RestController @RequestMapping("/api/v1/prescriptions") @PreAuthorize("hasRole('CUSTOMER')")
public class PrescriptionController {
 private final PrescriptionService s; public PrescriptionController(PrescriptionService s){this.s=s;}
 @GetMapping List<PrescriptionResponse> list(Authentication a,@RequestParam(required=false) String productId){return s.list(a,productId);}
 @PostMapping @ResponseStatus(HttpStatus.CREATED) PrescriptionResponse create(Authentication a,@Valid @RequestBody PrescriptionRequest r){return s.create(a,r);}
 @GetMapping("/{id}") PrescriptionResponse get(Authentication a,@PathVariable String id){return s.get(a,id);}
 @PatchMapping("/{id}") PrescriptionResponse update(Authentication a,@PathVariable String id,@Valid @RequestBody PrescriptionRequest r){return s.update(a,id,r);}
 @DeleteMapping("/{id}") @ResponseStatus(HttpStatus.NO_CONTENT) void delete(Authentication a,@PathVariable String id){s.delete(a,id);}
 @PostMapping("/{id}/files") @ResponseStatus(HttpStatus.CREATED) FileResponse upload(Authentication a,@PathVariable String id,@RequestParam("file") MultipartFile f){return s.upload(a,id,f);}
 @PostMapping("/{id}/extract") PrescriptionResponse extract(Authentication a,@PathVariable String id,@Valid @RequestBody OcrTextRequest r){return s.extract(a,id,r);}
 @GetMapping("/{id}/recommendations") List<LensOptionResponse> recommendations(Authentication a,@PathVariable String id){return s.recommendations(a,id);}
 @PatchMapping("/{id}/lenses") PrescriptionResponse lenses(Authentication a,@PathVariable String id,@Valid @RequestBody LensSelectionRequest r){return s.selectLenses(a,id,r);}
 @GetMapping("/lens-options") List<LensOptionResponse> lensOptions(){return s.publicLensOptions();}
 @GetMapping("/files/{fileId}") ResponseEntity<InputStreamResource> download(Authentication a,@PathVariable String fileId)throws IOException{PrescriptionFile f=s.file(a,fileId);return ResponseEntity.ok().contentType(MediaType.parseMediaType(f.getContentType())).header(HttpHeaders.CONTENT_DISPOSITION,ContentDisposition.inline().filename(f.getOriginalName(),java.nio.charset.StandardCharsets.UTF_8).build().toString()).header(HttpHeaders.CACHE_CONTROL,"private, no-store").header("X-Content-Type-Options","nosniff").body(new InputStreamResource(s.download(a,fileId)));}
}
