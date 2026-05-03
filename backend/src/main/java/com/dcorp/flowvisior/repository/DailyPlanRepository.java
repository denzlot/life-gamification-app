package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface DailyPlanRepository extends JpaRepository<DailyPlan, Long> {

    Optional<DailyPlan> findByUserAndPlanDate(User user, LocalDate planDate);

    boolean existsByUserAndPlanDate(User user, LocalDate planDate);

    List<DailyPlan> findByUserOrderByPlanDateAsc(User user);

    List<DailyPlan> findByUserAndPlanDateBetweenOrderByPlanDateAsc(
            User user, LocalDate startDate, LocalDate endDate);
}
