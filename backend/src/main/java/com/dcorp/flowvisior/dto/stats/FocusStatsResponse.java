package com.dcorp.flowvisior.dto.stats;

public class FocusStatsResponse {

    private final long totalSeconds;
    private final long taskSeconds;
    private final long habitSeconds;
    private final long questSeconds;
    private final long plannedSeconds;
    private final long actualSeconds;
    private final long overtimeSeconds;

    public FocusStatsResponse(
            long totalSeconds,
            long taskSeconds,
            long habitSeconds,
            long questSeconds,
            long plannedSeconds,
            long actualSeconds,
            long overtimeSeconds
    ) {
        this.totalSeconds = totalSeconds;
        this.taskSeconds = taskSeconds;
        this.habitSeconds = habitSeconds;
        this.questSeconds = questSeconds;
        this.plannedSeconds = plannedSeconds;
        this.actualSeconds = actualSeconds;
        this.overtimeSeconds = overtimeSeconds;
    }

    public long getTotalSeconds() { return totalSeconds; }
    public long getTaskSeconds() { return taskSeconds; }
    public long getHabitSeconds() { return habitSeconds; }
    public long getQuestSeconds() { return questSeconds; }
    public long getPlannedSeconds() { return plannedSeconds; }
    public long getActualSeconds() { return actualSeconds; }
    public long getOvertimeSeconds() { return overtimeSeconds; }
}
