package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.ActivitySourceType;
import com.dcorp.flowvisior.entity.FocusSession;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface FocusSessionRepository extends JpaRepository<FocusSession, Long> {

    Optional<FocusSession> findByUserAndSessionId(User user, String sessionId);

    List<FocusSession> findByUserOrderByCompletedAtDesc(User user);

    boolean existsByUserAndSourceTypeAndSourceIdIn(User user, ActivitySourceType sourceType, List<Long> sourceIds);

    @Query("""
            select coalesce(sum(session.creditedDurationSeconds), 0)
            from FocusSession session
            where session.user = :user
            """)
    long sumDurationSeconds(User user);

    @Query("""
            select coalesce(sum(session.plannedDurationSeconds), 0)
            from FocusSession session
            where session.user = :user
            """)
    long sumPlannedDurationSeconds(User user);

    @Query("""
            select coalesce(sum(session.actualElapsedSeconds), 0)
            from FocusSession session
            where session.user = :user
            """)
    long sumActualElapsedSeconds(User user);

    @Query("""
            select coalesce(sum(session.overtimeSeconds), 0)
            from FocusSession session
            where session.user = :user
            """)
    long sumOvertimeSeconds(User user);

    @Query("""
            select coalesce(sum(session.creditedDurationSeconds), 0)
            from FocusSession session
            where session.user = :user
              and session.sourceType = :sourceType
            """)
    long sumDurationSecondsBySourceType(User user, ActivitySourceType sourceType);

    @Query("""
            select coalesce(sum(session.creditedDurationSeconds), 0)
            from FocusSession session
            where session.user = :user
              and session.planDate between :startDate and :endDate
            """)
    long sumDurationSecondsBetween(User user, LocalDate startDate, LocalDate endDate);

    @Query("""
            select coalesce(sum(session.creditedDurationSeconds), 0)
            from FocusSession session
            where session.user = :user
              and session.planDate between :startDate and :endDate
              and session.sourceType = :sourceType
            """)
    long sumDurationSecondsBetweenBySourceType(User user, LocalDate startDate, LocalDate endDate, ActivitySourceType sourceType);
}
