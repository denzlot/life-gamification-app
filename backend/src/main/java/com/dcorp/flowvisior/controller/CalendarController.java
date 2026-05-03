package com.dcorp.flowvisior.controller;

import com.dcorp.flowvisior.dto.calendar.CalendarDayResponse;
import com.dcorp.flowvisior.service.CalendarService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/calendar")
public class CalendarController {

    private final CalendarService calendarService;

    public CalendarController(CalendarService calendarService) {
        this.calendarService = calendarService;
    }

    @GetMapping
    public List<CalendarDayResponse> getMonthCalendar(
            @RequestParam(required = false) Integer year,
            @RequestParam(required = false) Integer month
    ) {
        // Если year/month не переданы — берём текущий месяц
        LocalDate now = LocalDate.now();
        int y = year != null ? year : now.getYear();
        int m = month != null ? month : now.getMonthValue();

        return calendarService.getMonthCalendar(y, m);
    }
}