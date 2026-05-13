package com.dcorp.flowvisior;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FlowvisiorApplication {

	public static void main(String[] args) {
		SpringApplication.run(FlowvisiorApplication.class, args);
	}

}
