package com.dcorp.flowvisior.dto.admin;

import com.dcorp.flowvisior.entity.UserStatus;
import jakarta.validation.constraints.NotNull;

public class UpdateUserStatusRequest {

    @NotNull
    private UserStatus status;

    public UserStatus getStatus() { return status; }
}