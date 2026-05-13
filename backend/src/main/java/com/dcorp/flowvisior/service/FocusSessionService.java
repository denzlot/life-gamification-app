package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.focus.CreateFocusSessionRequest;
import com.dcorp.flowvisior.dto.focus.FocusCreditedMode;
import com.dcorp.flowvisior.dto.focus.FocusSessionResponse;
import com.dcorp.flowvisior.entity.FocusSession;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.FocusSessionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class FocusSessionService {

    private final AuthenticatedUserService authenticatedUserService;
    private final FocusSessionRepository focusSessionRepository;
    private final AchievementService achievementService;

    public FocusSessionService(
            AuthenticatedUserService authenticatedUserService,
            FocusSessionRepository focusSessionRepository,
            AchievementService achievementService
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.focusSessionRepository = focusSessionRepository;
        this.achievementService = achievementService;
    }

    @Transactional
    public FocusSessionResponse saveCompletedSession(CreateFocusSessionRequest request) {
        User user = authenticatedUserService.getCurrentUser();
        return saveCompletedSession(user, request);
    }

    @Transactional
    public FocusSessionResponse saveCompletedSession(User user, CreateFocusSessionRequest request) {
        String sessionId = request.getSessionId().trim();
        int creditedDurationSeconds = positiveOrFallback(request.getCreditedDurationSeconds(), request.getDurationSeconds());
        int plannedDurationSeconds = positiveOrFallback(request.getPlannedDurationSeconds(), creditedDurationSeconds);
        int actualElapsedSeconds = Math.max(creditedDurationSeconds, positiveOrFallback(request.getActualElapsedSeconds(), creditedDurationSeconds));
        int overtimeSeconds = Math.max(0, request.getOvertimeSeconds() == null ? Math.max(0, actualElapsedSeconds - plannedDurationSeconds) : request.getOvertimeSeconds());
        FocusCreditedMode creditedMode = request.getCreditedMode() == null ? FocusCreditedMode.PLANNED : request.getCreditedMode();

        return focusSessionRepository.findByUserAndSessionId(user, sessionId)
                .map(FocusSessionResponse::new)
                .orElseGet(() -> {
                    FocusSession session = new FocusSession(
                            sessionId,
                            user,
                            request.getSourceType(),
                            request.getSourceId(),
                            request.getTitle().trim(),
                            creditedDurationSeconds,
                            plannedDurationSeconds,
                            actualElapsedSeconds,
                            overtimeSeconds,
                            creditedDurationSeconds,
                            creditedMode,
                            request.getCompletedAt(),
                            request.getPlanDate()
                    );
                    FocusSession saved = focusSessionRepository.save(session);
                    achievementService.checkAndGrant(user);
                    return new FocusSessionResponse(saved);
                });
    }

    @Transactional(readOnly = true)
    public List<FocusSessionResponse> getCompletedSessions() {
        User user = authenticatedUserService.getCurrentUser();
        return focusSessionRepository.findByUserOrderByCompletedAtDesc(user)
                .stream()
                .map(FocusSessionResponse::new)
                .toList();
    }

    private int positiveOrFallback(Integer value, int fallback) {
        return value == null || value <= 0 ? fallback : value;
    }
}
