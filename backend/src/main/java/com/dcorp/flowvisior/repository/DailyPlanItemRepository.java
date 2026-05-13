package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface DailyPlanItemRepository extends JpaRepository<DailyPlanItem, Long> {
    List<DailyPlanItem> findByDailyPlanOrderByCreatedAtAsc(DailyPlan dailyPlan);

    int countByDailyPlan(DailyPlan dailyPlan);

    List<DailyPlanItem> findByDailyPlanIn(List<DailyPlan> plans);

    List<DailyPlanItem> findBySourceTypeAndSourceId(ActivitySourceType sourceType, Long sourceId);

    @Query("""
            select item
            from DailyPlanItem item
            join fetch item.dailyPlan plan
            join fetch plan.user
            where item.id = :id
            """)
    Optional<DailyPlanItem> findByIdWithDailyPlanAndUser(Long id);

    boolean existsByDailyPlanAndSourceTypeAndSourceId(
            DailyPlan dailyPlan,
            ActivitySourceType sourceType,
            Long sourceId
    );

    boolean existsBySourceTypeAndSourceIdIn(ActivitySourceType sourceType, List<Long> sourceIds);

    void deleteBySourceTypeAndSourceIdIn(ActivitySourceType sourceType, List<Long> sourceIds);
}
