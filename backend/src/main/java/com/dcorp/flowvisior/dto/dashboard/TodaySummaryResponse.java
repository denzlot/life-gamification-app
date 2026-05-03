package com.dcorp.flowvisior.dto.dashboard;

import com.dcorp.flowvisior.entity.DailyPlanStatus;

public class TodaySummaryResponse {

    private final boolean planStarted;
    private final DailyPlanStatus status;
    private final int completed;
    private final int failed;
    private final int pending;
    private final int total;

    public TodaySummaryResponse(
            boolean planStarted,
            DailyPlanStatus status,
            int completed,
            int failed,
            int pending,
            int total
    ) {
        this.planStarted = planStarted;
        this.status = status;
        this.completed = completed;
        this.failed = failed;
        this.pending = pending;
        this.total = total;
    }

    public static TodaySummaryResponse empty() {
        return new TodaySummaryResponse(false, null, 0, 0, 0, 0);
    }

    public boolean isPlanStarted() {
        return planStarted;
    }

    public DailyPlanStatus getStatus() {
        return status;
    }

    public int getCompleted() {
        return completed;
    }

    public int getFailed() {
        return failed;
    }

    public int getPending() {
        return pending;
    }

    public int getTotal() {
        return total;
    }
}
