package com.dcorp.flowvisior.dto.dailyplan;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public class CreateManualDailyPlanItemRequest {

    @NotBlank
    @Size(max = 160)
    private String title;

    public String getTitle() {
        return title;
    }
}