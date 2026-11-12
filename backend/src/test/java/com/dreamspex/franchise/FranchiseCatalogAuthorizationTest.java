package com.dreamspex.franchise;

import com.dreamspex.catalog.controller.ProductController;
import com.dreamspex.catalog.dto.CatalogDtos.ProductRequest;
import java.lang.reflect.Method;
import org.junit.jupiter.api.Test;
import org.springframework.security.access.prepost.PreAuthorize;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class FranchiseCatalogAuthorizationTest {
    @Test
    void catalogCreateEditAndDeleteAreRestrictedToSuperAdmin() throws Exception {
        assertSuperAdminOnly(ProductController.class.getDeclaredMethod("create", ProductRequest.class));
        assertSuperAdminOnly(ProductController.class.getDeclaredMethod("update", String.class, ProductRequest.class));
        assertSuperAdminOnly(ProductController.class.getDeclaredMethod("delete", String.class));
    }

    private void assertSuperAdminOnly(Method method) {
        PreAuthorize access = method.getAnnotation(PreAuthorize.class);
        assertNotNull(access);
        assertEquals("hasRole('SUPER_ADMIN')", access.value());
    }
}
