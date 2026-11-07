package com.dreamspex.returns;

import com.dreamspex.returns.ReturnDtos.CreateRequest;
import com.dreamspex.returns.ReturnDtos.EvidenceUploadResponse;
import com.dreamspex.returns.ReturnDtos.OrderEligibilityResponse;
import com.dreamspex.returns.ReturnDtos.PolicyResponse;
import com.dreamspex.returns.ReturnDtos.ReturnResponse;
import jakarta.validation.Valid;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.util.List;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.CacheControl;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import static com.dreamspex.returns.ReturnDtos.*;

@RestController
@RequestMapping("/api/v1/returns")
@PreAuthorize("hasRole('CUSTOMER')")
public class ReturnController {
    private final ReturnService returns;

    public ReturnController(ReturnService returns) { this.returns = returns; }

    @GetMapping("/policy")
    PolicyResponse policy() { return returns.customerPolicy(); }

    @GetMapping("/orders/{orderId}/eligibility")
    OrderEligibilityResponse eligibility(Authentication authentication, @PathVariable String orderId) {
        return returns.eligibility(authentication, orderId);
    }

    @GetMapping
    List<ReturnResponse> list(Authentication authentication) { return returns.customerList(authentication); }

    @GetMapping("/{id}")
    ReturnResponse get(Authentication authentication, @PathVariable String id) {
        return returns.customerGet(authentication, id);
    }

    @PostMapping("/orders/{orderId}")
    ReturnResponse create(Authentication authentication, @PathVariable String orderId,
                          @Valid @RequestBody CreateRequest request) {
        return returns.create(authentication, orderId, request);
    }

    @PostMapping("/{id}/cancel")
    ReturnResponse cancel(Authentication authentication, @PathVariable String id) {
        return returns.cancel(authentication, id);
    }

    @PostMapping(value = "/{id}/evidence", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    EvidenceUploadResponse uploadEvidence(Authentication authentication, @PathVariable String id,
                                          @RequestPart("file") MultipartFile file) {
        return returns.uploadEvidence(authentication, id, file);
    }

    @GetMapping("/{id}/evidence/{evidenceId}")
    ResponseEntity<InputStreamResource> evidence(Authentication authentication, @PathVariable String id,
                                                  @PathVariable String evidenceId) throws IOException {
        ReturnService.EvidenceFile file = returns.customerEvidence(authentication, id, evidenceId);
        return privateImage(file);
    }

    static ResponseEntity<InputStreamResource> privateImage(ReturnService.EvidenceFile file) throws IOException {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(file.contentType()))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(file.originalName(), StandardCharsets.UTF_8).build().toString())
                .cacheControl(CacheControl.noStore())
                .header("X-Content-Type-Options", "nosniff")
                .body(new InputStreamResource(file.stream()));
    }
}
