package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.habit.CreateHabitRequest;
import com.dcorp.flowvisior.dto.habit.HabitResponse;
import com.dcorp.flowvisior.dto.habit.UpdateHabitRequest;
import com.dcorp.flowvisior.entity.Habit;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.HabitRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
public class HabitService {

    private final HabitRepository habitRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public HabitService(
            HabitRepository habitRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.habitRepository = habitRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    public List<HabitResponse> getHabits() {
        User user = authenticatedUserService.getCurrentUser();

        return habitRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(HabitResponse::new)
                .toList();
    }

    @Transactional
    public HabitResponse createHabit(CreateHabitRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = new Habit(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getDifficulty()
        );

        Habit savedHabit = habitRepository.save(habit);

        return new HabitResponse(savedHabit);
    }

    @Transactional
    public HabitResponse updateHabit(Long id, UpdateHabitRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habit.update(
                request.getTitle(),
                request.getDescription(),
                request.getDifficulty()
        );

        return new HabitResponse(habit);
    }

    @Transactional
    public HabitResponse toggleActive(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habit.toggleActive();

        return new HabitResponse(habit);
    }

    @Transactional
    public void deleteHabit(Long id) {
        User user = authenticatedUserService.getCurrentUser();

        Habit habit = habitRepository.findByIdAndUser(id, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Habit not found"));

        habitRepository.delete(habit);
    }
}