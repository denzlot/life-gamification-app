package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.dailyplan.UpdateDailyPlanItemRequest;
import com.dcorp.flowvisior.entity.*;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import com.dcorp.flowvisior.service.GameService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/daily-plan-items")
public class DailyPlanItemController {

    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final AuthenticatedUserService authenticatedUserService;
    private final GameService gameService;

    public DailyPlanItemController(
            DailyPlanItemRepository dailyPlanItemRepository,
            AuthenticatedUserService authenticatedUserService,
            GameService gameService
    ) {
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.authenticatedUserService = authenticatedUserService;
        this.gameService = gameService;
    }

    @PostMapping("/{id}/complete")
    public ResponseEntity<Void> complete(@PathVariable Long id) {
        User user = authenticatedUserService.getCurrentUser();
        DailyPlanItem item = getItemForUser(id, user);
        gameService.complete(item, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/fail")
    public ResponseEntity<Void> fail(@PathVariable Long id) {
        User user = authenticatedUserService.getCurrentUser();
        DailyPlanItem item = getItemForUser(id, user);
        gameService.fail(item, user);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{id}/reset")
    public ResponseEntity<Void> reset(@PathVariable Long id) {
        User user = authenticatedUserService.getCurrentUser();
        DailyPlanItem item = getItemForUser(id, user);
        gameService.reset(item, user);
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{id}")
    public ResponseEntity<Void> update(
            @PathVariable Long id,
            @Valid @RequestBody UpdateDailyPlanItemRequest request
    ) {
        User user = authenticatedUserService.getCurrentUser();
        DailyPlanItem item = getItemForUser(id, user);
        if (item.getDailyPlan().isClosed()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed daily plan item cannot be edited");
        }
        item.update(request.getTitle(), request.getDescription(), request.getPlannedTime(), request.getDeadlineTime());
        dailyPlanItemRepository.save(item);
        return ResponseEntity.noContent().build();
    }

    private DailyPlanItem getItemForUser(Long id, User user) {
        DailyPlanItem item = dailyPlanItemRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND, "Item not found"
                ));

        if (!item.getDailyPlan().getUser().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Item not found");
        }

        return item;
    }
}
