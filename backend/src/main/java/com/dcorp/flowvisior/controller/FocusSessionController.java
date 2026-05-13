package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.focus.CreateFocusSessionRequest;
import com.dcorp.flowvisior.dto.focus.FocusSessionResponse;
import com.dcorp.flowvisior.service.FocusSessionService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/focus-sessions")
public class FocusSessionController {

    private final FocusSessionService focusSessionService;

    public FocusSessionController(FocusSessionService focusSessionService) {
        this.focusSessionService = focusSessionService;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public FocusSessionResponse saveCompletedSession(@Valid @RequestBody CreateFocusSessionRequest request) {
        return focusSessionService.saveCompletedSession(request);
    }

    @GetMapping
    public List<FocusSessionResponse> getCompletedSessions() {
        return focusSessionService.getCompletedSessions();
    }
}
