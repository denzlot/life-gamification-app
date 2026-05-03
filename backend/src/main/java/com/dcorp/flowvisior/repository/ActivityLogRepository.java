package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.ActivityAction;
import com.dcorp.flowvisior.entity.ActivityLog;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface ActivityLogRepository extends JpaRepository<ActivityLog, Long> {

    List<ActivityLog> findByUserOrderByCreatedAtDesc(User user);

    Optional<ActivityLog> findTopByDailyPlanItemAndActionNotOrderByCreatedAtDesc(
            DailyPlanItem item, ActivityAction action
    );
}