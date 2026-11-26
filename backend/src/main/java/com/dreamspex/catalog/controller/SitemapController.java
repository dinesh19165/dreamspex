package com.dreamspex.catalog.controller;

import com.dreamspex.catalog.service.CatalogService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.CacheControl;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import static com.dreamspex.catalog.dto.CatalogDtos.CategoryResponse;

@RestController
@RequestMapping("/api/v1")
public class SitemapController {
    private final CatalogService catalog;
    private final String siteUrl;

    public SitemapController(
            CatalogService catalog,
            @Value("${dreamspex.seo.site-url:https://www.dreamspex.in}") String siteUrl) {
        this.catalog = catalog;
        this.siteUrl = siteUrl.replaceAll("/+$", "");
    }

    @GetMapping(value = "/sitemap.xml", produces = MediaType.APPLICATION_XML_VALUE)
    public ResponseEntity<String> sitemap() {
        Set<String> locations = new LinkedHashSet<>();
        for (String path : List.of("/", "/categories", "/about", "/contact", "/services", "/franchise")) {
            locations.add(siteUrl + path);
        }
        for (CategoryResponse category : catalog.publicCategories("CATALOG")) {
            locations.add(siteUrl + "/shop?category=" + encode(category.slug()));
        }
        for (String brand : catalog.productFilterOptions().brands()) {
            locations.add(siteUrl + "/shop?brand=" + encode(brand));
        }
        for (String productId : catalog.publicSitemapProductIds()) {
            locations.add(siteUrl + "/products/" + encode(productId));
        }

        StringBuilder xml = new StringBuilder("<?xml version=\"1.0\" encoding=\"UTF-8\"?>")
                .append("<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">");
        for (String location : locations) {
            xml.append("<url><loc>").append(escapeXml(location)).append("</loc></url>");
        }
        xml.append("</urlset>");

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_XML)
                .cacheControl(CacheControl.maxAge(Duration.ofMinutes(5)).cachePublic())
                .body(xml.toString());
    }

    private static String encode(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }

    private static String escapeXml(String value) {
        return value.replace("&", "&amp;").replace("<", "&lt;")
                .replace(">", "&gt;").replace("\"", "&quot;").replace("'", "&apos;");
    }
}
