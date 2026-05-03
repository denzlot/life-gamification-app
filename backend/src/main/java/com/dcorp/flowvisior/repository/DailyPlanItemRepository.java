package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DailyPlanItemRepository extends JpaRepository<DailyPlanItem, Long> {
    List<DailyPlanItem> findByDailyPlanOrderByCreatedAtAsc(DailyPlan dailyPlan);

    int countByDailyPlan(DailyPlan dailyPlan);

    List<DailyPlanItem> findByDailyPlanIn(List<DailyPlan> plans);

    boolean existsByDailyPlanAndSourceTypeAndSourceId(
            DailyPlan dailyPlan,
            ActivitySourceType sourceType,
            Long sourceId
    );
}
