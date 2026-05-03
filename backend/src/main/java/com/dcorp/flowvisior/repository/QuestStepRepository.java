package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.QuestStepStatus;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface QuestStepRepository extends JpaRepository<QuestStep, Long> {

    List<QuestStep> findByQuestOrderByStepNumberAsc(Quest quest);

    Optional<QuestStep> findByIdAndQuest_User(Long id, User user);

    int countByQuest(Quest quest);

    int countByQuestAndStatus(Quest quest, QuestStepStatus status);

    Optional<QuestStep> findFirstByQuestAndStatusOrderByScheduledDateAscStepNumberAsc(
            Quest quest,
            QuestStepStatus status
    );

    List<QuestStep> findByQuest_UserAndQuest_StatusAndStatusAndScheduledDateLessThanEqualOrderByScheduledDateAscStepNumberAsc(
            User user,
            QuestStatus questStatus,
            QuestStepStatus status,
            LocalDate scheduledDate
    );

    boolean existsByQuestAndStatusNot(Quest quest, QuestStepStatus status);
}
