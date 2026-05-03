package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.quest.CreateQuestRequest;
import com.dcorp.flowvisior.dto.quest.QuestResponse;
import com.dcorp.flowvisior.dto.quest.QuestStepResponse;
import com.dcorp.flowvisior.dto.quest.UpdateQuestRequest;
import com.dcorp.flowvisior.service.QuestService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/quests")
public class QuestController {

    private final QuestService questService;

    public QuestController(QuestService questService) {
        this.questService = questService;
    }

    @GetMapping
    public List<QuestResponse> getQuests() {
        return questService.getQuests();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public QuestResponse createQuest(@Valid @RequestBody CreateQuestRequest request) {
        return questService.createQuest(request);
    }

    @GetMapping("/{id}")
    public QuestResponse getQuest(@PathVariable Long id) {
        return questService.getQuest(id);
    }

    @PatchMapping("/{id}")
    public QuestResponse updateQuest(
            @PathVariable Long id,
            @Valid @RequestBody UpdateQuestRequest request
    ) {
        return questService.updateQuest(id, request);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteQuest(@PathVariable Long id) {
        questService.deleteQuest(id);
    }

    @GetMapping("/{id}/steps")
    public List<QuestStepResponse> getQuestSteps(@PathVariable Long id) {
        return questService.getQuestSteps(id);
    }
}
