package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.history.HistoryItemResponse;
import com.dcorp.flowvisior.service.HistoryService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/history")
public class HistoryController {

    private final HistoryService historyService;

    public HistoryController(HistoryService historyService) {
        this.historyService = historyService;
    }

    @GetMapping
    public List<HistoryItemResponse> getHistory() {
        return historyService.getHistory();
    }
}
