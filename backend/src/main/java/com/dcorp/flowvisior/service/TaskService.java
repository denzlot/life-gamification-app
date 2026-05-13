package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.task.CreateTaskRequest;
import com.dcorp.flowvisior.dto.task.TaskResponse;
import com.dcorp.flowvisior.entity.Task;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.TaskRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Objects;

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

    @Transactional
    public TaskResponse createTask(CreateTaskRequest request) {
        User user = authenticatedUserService.getCurrentUser();

        Task task = new Task(
                user,
                request.getTitle(),
                request.getDescription(),
                request.getDeadlineDate(),
                request.getPlannedTime(),
                request.getDeadlineTime()
        );

        Task savedTask = taskRepository.save(task);

        return new TaskResponse(savedTask);
    }

    @Transactional
    public TaskResponse updateTask(Long id, CreateTaskRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        Task task = taskRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found"));

        if (!Objects.equals(task.getUser().getId(), user.getId())) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Task not found");
        }

        task.update(
                request.getTitle(),
                request.getDescription(),
                request.getDeadlineDate(),
                request.getPlannedTime(),
                request.getDeadlineTime()
        );

        return new TaskResponse(task);
    }
}
