package com.dreamspex;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class DreamSpexApplication {
    public static void main(String[] args) {
        SpringApplication.run(DreamSpexApplication.class, args);
    }
}
