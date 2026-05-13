package com.dcorp.flowvisior;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;

@SpringBootTest(properties = {
		"telegram.bot.token=",
		"telegram.polling.enabled=false"
})
class FlowvisiorApplicationTests {

	@Test
	void contextLoads() {
	}

}
