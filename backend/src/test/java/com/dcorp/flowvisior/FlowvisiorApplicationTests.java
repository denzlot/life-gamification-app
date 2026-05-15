package com.dcorp.flowvisior;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"spring.datasource.url=jdbc:h2:mem:flowvisior-test;MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;NON_KEYWORDS=KEY;DB_CLOSE_DELAY=-1",
		"spring.datasource.driver-class-name=org.h2.Driver",
		"spring.datasource.username=sa",
		"spring.datasource.password=",
		"spring.jpa.hibernate.ddl-auto=create-drop",
		"spring.flyway.enabled=false",
		"telegram.bot.token=",
		"telegram.polling.enabled=false"
})
class FlowvisiorApplicationTests {

	@Test
	void contextLoads() {
	}

}
