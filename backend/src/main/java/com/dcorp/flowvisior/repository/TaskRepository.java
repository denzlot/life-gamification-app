package com.dcorp.flowvisior.repository;

import com.dcorp.flowvisior.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;

public interface TaskRepository extends JpaRepository<Task, Long> {
}