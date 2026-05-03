package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.history.HistoryItemResponse;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
public class HistoryService {

    private final AuthenticatedUserService authenticatedUserService;
    private final ActivityLogRepository activityLogRepository;

    public HistoryService(
            AuthenticatedUserService authenticatedUserService,
            ActivityLogRepository activityLogRepository
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.activityLogRepository = activityLogRepository;
    }

    @Transactional(readOnly = true)
    public List<HistoryItemResponse> getHistory() {
        User user = authenticatedUserService.getCurrentUser();

        return activityLogRepository.findTop100ByUserOrderByCreatedAtDesc(user)
                .stream()
                .map(HistoryItemResponse::new)
                .toList();
    }
}
