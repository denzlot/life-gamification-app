package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Quest;
import com.dcorp.flowvisior.entity.QuestStatus;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface QuestRepository extends JpaRepository<Quest, Long> {

    List<Quest> findByUserOrderByCreatedAtDesc(User user);

    List<Quest> findByUserAndStatusOrderByCreatedAtDesc(User user, QuestStatus status);

    Optional<Quest> findByIdAndUser(Long id, User user);
}
