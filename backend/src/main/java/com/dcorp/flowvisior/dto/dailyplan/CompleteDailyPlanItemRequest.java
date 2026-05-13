package com.dcorp.flowvisior.dto.dailyplan;

import com.dcorp.flowvisior.dto.focus.CreateFocusSessionRequest;
import jakarta.validation.Valid;

public class CompleteDailyPlanItemRequest {

    @Valid
    private CreateFocusSessionRequest focusSession;

    public CreateFocusSessionRequest getFocusSession() { return focusSession; }
}
