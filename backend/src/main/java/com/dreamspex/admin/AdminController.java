package com.dreamspex.admin;
import com.dreamspex.auth.dto.AuthDtos.UserResponse;import com.dreamspex.security.CurrentUser;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/admin")
@PreAuthorize("hasRole('SUPER_ADMIN')")
public class AdminController {
    private final CurrentUser currentUser;

    public AdminController(CurrentUser currentUser) { this.currentUser = currentUser; }

    @GetMapping("/session")
    UserResponse session(Authentication authentication) {
        return UserResponse.from(currentUser.require(authentication));
    }
}
