package com.dreamspex.admin;
import org.springframework.data.jpa.repository.JpaRepository; import java.util.Optional;
public interface HomepageContentRepository extends JpaRepository<HomepageContent,String>{ Optional<HomepageContent> findByContentKey(String key); }
