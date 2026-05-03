package com.dcorp.flowvisior.service;

import com.dcorp.flowvisior.dto.calendar.CalendarDayResponse;
import com.dcorp.flowvisior.entity.DailyPlan;
import com.dcorp.flowvisior.entity.DailyPlanItem;
import com.dcorp.flowvisior.entity.DailyPlanItemStatus;
import com.dcorp.flowvisior.entity.User;
import com.dcorp.flowvisior.repository.DailyPlanItemRepository;
import com.dcorp.flowvisior.repository.DailyPlanRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class CalendarService {

    private final DailyPlanRepository dailyPlanRepository;
    private final DailyPlanItemRepository dailyPlanItemRepository;
    private final AuthenticatedUserService authenticatedUserService;

    public CalendarService(
            DailyPlanRepository dailyPlanRepository,
            DailyPlanItemRepository dailyPlanItemRepository,
            AuthenticatedUserService authenticatedUserService
    ) {
        this.dailyPlanRepository = dailyPlanRepository;
        this.dailyPlanItemRepository = dailyPlanItemRepository;
        this.authenticatedUserService = authenticatedUserService;
    }

    @Transactional(readOnly = true)
    public List<CalendarDayResponse> getMonthCalendar(int year, int month) {
        User user = authenticatedUserService.getCurrentUser();

        // 1. Валидируем year и month перед вызовом YearMonth.of
        if (month < 1 || month > 12) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "month must be between 1 and 12");
        }
        if (year < 1900 || year > 2200) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "year must be between 1900 and 2200");
        }

        // 2. Определяем первый и последний день месяца
        YearMonth yearMonth = YearMonth.of(year, month);
        LocalDate startDate = yearMonth.atDay(1);
        LocalDate endDate = yearMonth.atEndOfMonth();

        // 3. Загружаем все планы за этот месяц
        List<DailyPlan> plans = dailyPlanRepository
                .findByUserAndPlanDateBetweenOrderByPlanDateAsc(user, startDate, endDate);

        // 4. Загружаем все items для всех планов одним запросом
        List<DailyPlanItem> allItems = plans.isEmpty()
                ? List.of()
                : dailyPlanItemRepository.findByDailyPlanIn(plans);

        // 5. Предварительно считаем total и completed для каждого плана
        Map<Long, Long> totalCountByPlanId = allItems.stream()
                .collect(Collectors.groupingBy(item -> item.getDailyPlan().getId(), Collectors.counting()));

        Map<Long, Long> completedCountByPlanId = allItems.stream()
                .filter(i -> i.getStatus() == DailyPlanItemStatus.COMPLETED)
                .collect(Collectors.groupingBy(item -> item.getDailyPlan().getId(), Collectors.counting()));

        // 6. Превращаем в Map дата → план для быстрого поиска
        Map<LocalDate, DailyPlan> plansByDate = plans.stream()
                .collect(Collectors.toMap(DailyPlan::getPlanDate, p -> p));

        // 7. Проходим по каждому дню месяца
        List<CalendarDayResponse> result = new ArrayList<>();
        LocalDate current = startDate;

        while (!current.isAfter(endDate)) {
            DailyPlan plan = plansByDate.get(current);

            if (plan != null) {
                int totalCount = totalCountByPlanId.getOrDefault(plan.getId(), 0L).intValue();
                int completedCount = plan.isClosed()
                        ? plan.getCompletedCount()
                        : completedCountByPlanId.getOrDefault(plan.getId(), 0L).intValue();
                result.add(new CalendarDayResponse(plan, completedCount, totalCount));
            } else {
                result.add(new CalendarDayResponse(current));
            }

            current = current.plusDays(1);
        }

        return result;
    }
}