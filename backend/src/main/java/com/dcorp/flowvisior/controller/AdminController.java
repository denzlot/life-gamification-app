package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.admin.AdminUserResponse;
import com.dcorp.flowvisior.dto.admin.UpdateGameStatsRequest;
import com.dcorp.flowvisior.dto.admin.UpdateUserStatusRequest;
import com.dcorp.flowvisior.service.AdminService;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin")
public class AdminController {

    private final AdminService adminService;

    public AdminController(AdminService adminService) {
        this.adminService = adminService;
    }

    @GetMapping("/users")
    public List<AdminUserResponse> getAllUsers() {
        return adminService.getAllUsers();
    }

    @PatchMapping("/users/{id}/status")
    public AdminUserResponse updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request
    ) {
        return adminService.updateUserStatus(id, request);
    }

    @PatchMapping("/users/{id}/game-stats")
    public AdminUserResponse updateGameStats(
            @PathVariable Long id,
            @RequestBody UpdateGameStatsRequest request
    ) {
        return adminService.updateGameStats(id, request);
    }
}