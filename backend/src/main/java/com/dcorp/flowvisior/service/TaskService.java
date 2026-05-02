package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.task.CreateTaskRequest;
import com.dcorp.flowvisior.dto.task.TaskResponse;
import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TaskRepository;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class TaskService {

    private final TaskRepository taskRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public TaskService(
            TaskRepository taskRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.taskRepository = taskRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    public List<TaskResponse> getAllTasks() {
        User user = authenticatedUserService.getCurrentUser();

        return taskRepository.findByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(TaskResponse::new)
                .toList();
    }

    public TaskResponse createTask(CreateTaskRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Task task = new Task(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getDifficulty(),
                request.getDeadlineDate()
        );

        Task savedTask = taskRepository.save(task);

        return new TaskResponse(savedTask);
    }
}