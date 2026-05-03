package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.history.HistoryItemResponse;
import com.dcorp.flowvisior.dto.history.HistoryPageResponse;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.ActivityLogRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    public HistoryPageResponse getHistory(int page, int size) {
        User user = authenticatedUserService.getCurrentUser();

        PageRequest pageable = PageRequest.of(
                page, size,
                Sort.by(Sort.Order.desc("createdAt"), Sort.Order.desc("id"))
        );

        Page<HistoryItemResponse> result = activityLogRepository.findByUser(user, pageable)
                .map(HistoryItemResponse::new);

        return new HistoryPageResponse(
                result.getContent(),
                result.getNumber(),
                result.getSize(),
                result.getTotalElements(),
                result.getTotalPages(),
                result.hasNext()
        );
    }
}
