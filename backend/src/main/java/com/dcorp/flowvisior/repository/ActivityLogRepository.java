package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.*;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByUserOrderByCreatedAtDesc(User user);

    List<ActivityLog> findTop100ByUserOrderByCreatedAtDesc(User user);

    Optional<ActivityLog> findTopByDailyPlanItemAndActionNotOrderByCreatedAtDesc(
            DailyPlanItem item, ActivityAction action
    );

    List<ActivityLog> findByDailyPlanOrderByCreatedAtAsc(DailyPlan dailyPlan);
}
