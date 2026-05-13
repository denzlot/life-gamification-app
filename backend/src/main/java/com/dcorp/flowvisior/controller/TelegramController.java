package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.telegram.CreateTelegramLinkResponse;
import com.dcorp.flowvisior.dto.telegram.TelegramSettingsRequest;
import com.dcorp.flowvisior.dto.telegram.TelegramSettingsResponse;
import com.dcorp.flowvisior.service.AuthenticatedUserService;
import com.dcorp.flowvisior.service.TelegramLinkService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/telegram")
public class TelegramController {

    private final AuthenticatedUserService authenticatedUserService;
    private final TelegramLinkService telegramLinkService;

    public TelegramController(
            AuthenticatedUserService authenticatedUserService,
            TelegramLinkService telegramLinkService
    ) {
        this.authenticatedUserService = authenticatedUserService;
        this.telegramLinkService = telegramLinkService;
    }

    @PostMapping("/link-code")
    public CreateTelegramLinkResponse createLinkCode() {
        return telegramLinkService.createLinkCode(authenticatedUserService.getCurrentUser());
    }

    @GetMapping("/settings")
    public TelegramSettingsResponse getSettings() {
        return new TelegramSettingsResponse(authenticatedUserService.getCurrentUser());
    }

    @PutMapping("/settings")
    public TelegramSettingsResponse updateSettings(@Valid @RequestBody TelegramSettingsRequest request) {
        return telegramLinkService.updateSettings(authenticatedUserService.getCurrentUser(), request);
    }

    @DeleteMapping("/link")
    public ResponseEntity<Void> unlink() {
        telegramLinkService.unlink(authenticatedUserService.getCurrentUser());
        return ResponseEntity.noContent().build();
    }
}
