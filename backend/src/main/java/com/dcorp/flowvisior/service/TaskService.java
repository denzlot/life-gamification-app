package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.task.CreateTaskRequest;
import com.dcorp.flowvisior.dto.task.TaskResponse;
import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;

    public TaskService(TaskRepository taskRepository) {
        this.taskRepository = taskRepository;
    }

    public List<TaskResponse> getAllTasks() {
        return taskRepository.findAll()
                .stream()
                .map(TaskResponse::new)
                .toList();
    }

    public TaskResponse createTask(CreateTaskRequest request) {
        Task task = new Task(
                request.getTitle(),
                request.getDescription(),
                request.getDifficulty(),
                request.getDeadlineDate()
        );

        Task savedTask = taskRepository.save(task);

        return new TaskResponse(savedTask);
    }
}