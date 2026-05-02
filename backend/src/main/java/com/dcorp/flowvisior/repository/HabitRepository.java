package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Habit;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface HabitRepository extends JpaRepository<Habit, Long> {

    List<Habit> findByUserOrderByCreatedAtDesc(User user);

    List<Habit> findByUserAndActiveTrueOrderByCreatedAtDesc(User user);

    Optional<Habit> findByIdAndUser(Long id, User user);
}