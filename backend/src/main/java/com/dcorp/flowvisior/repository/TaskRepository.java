package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    List<Task> findByUserOrderByCreatedAtDesc(User user);
}