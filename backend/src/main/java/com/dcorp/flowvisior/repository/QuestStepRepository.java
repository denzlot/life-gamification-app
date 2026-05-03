package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStep;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestStepRepository extends JpaRepository<QuestStep, Long> {

    List<QuestStep> findByQuestOrderByStepNumberAsc(Quest quest);

    Optional<QuestStep> findByIdAndQuest_User(Long id, User user);
}
