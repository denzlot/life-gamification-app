package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.quest.QuestStepResponse;
import com.dcorp.flowvisior.dto.quest.UpdateQuestStepRequest;
import com.dcorp.flowvisior.service.QuestService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/quest-steps")
public class QuestStepController {

    private final QuestService questService;

    public QuestStepController(QuestService questService) {
        this.questService = questService;
    }

    @PatchMapping("/{id}")
    public QuestStepResponse updateQuestStep(
            @PathVariable Long id,
            @Valid @RequestBody UpdateQuestStepRequest request
    ) {
        return questService.updateQuestStep(id, request);
    }
}
