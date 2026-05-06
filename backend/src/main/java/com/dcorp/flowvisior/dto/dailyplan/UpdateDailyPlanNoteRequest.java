package com.dcorp.flowvisior.dto.dailyplan;

import jakarta.validation.constraints.Size;

public class UpdateDailyPlanNoteRequest {

    @Size(max = 5000)
    private String note;

    public String getNote() {
        return note;
    }
}
