package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.habit.CreateHabitRequest;
import com.dcorp.flowvisior.dto.habit.HabitResponse;
import com.dcorp.flowvisior.dto.habit.UpdateHabitRequest;
import com.dcorp.flowvisior.service.HabitService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/habits")
public class HabitController {

    private final HabitService habitService;

    public HabitController(HabitService habitService) {
        this.habitService = habitService;
    }

    @GetMapping
    public List<HabitResponse> getHabits() {
        return habitService.getHabits();
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public HabitResponse createHabit(@Valid @RequestBody CreateHabitRequest request) {
        return habitService.createHabit(request);
    }

    @PatchMapping("/{id}")
    public HabitResponse updateHabit(
            @PathVariable Long id,
            @Valid @RequestBody UpdateHabitRequest request
    ) {
        return habitService.updateHabit(id, request);
    }

    @PatchMapping("/{id}/toggle-active")
    public HabitResponse toggleActive(@PathVariable Long id) {
        return habitService.toggleActive(id);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void deleteHabit(@PathVariable Long id) {
        habitService.deleteHabit(id);
    }
}
