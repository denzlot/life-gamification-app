WITH item_counts AS (
    SELECT
        dp.id AS daily_plan_id,
        COUNT(dpi.id) AS total_count,
        COUNT(dpi.id) FILTER (WHERE dpi.status = 'COMPLETED') AS completed_count,
        COUNT(dpi.id) FILTER (WHERE dpi.status = 'FAILED') AS failed_count
    FROM daily_plans dp
    LEFT JOIN daily_plan_items dpi ON dpi.daily_plan_id = dp.id
    WHERE dp.status = 'CLOSED'
    GROUP BY dp.id
)
UPDATE daily_plans dp
SET
    completed_count = item_counts.completed_count,
    failed_count = item_counts.failed_count,
    total_count_at_close = item_counts.total_count,
    completion_rate_at_close = CASE
        WHEN dp.started_at IS NULL OR item_counts.total_count = 0 THEN 0
        ELSE item_counts.completed_count::DOUBLE PRECISION / item_counts.total_count
    END,
    day_quality = CASE
        WHEN dp.started_at IS NULL OR item_counts.completed_count = 0 THEN 'EMPTY'
        WHEN item_counts.completed_count::DOUBLE PRECISION / item_counts.total_count < 0.5 THEN 'BAD'
        WHEN item_counts.completed_count::DOUBLE PRECISION / item_counts.total_count < 0.8 THEN 'NORMAL'
        ELSE 'GOOD'
    END
FROM item_counts
WHERE dp.id = item_counts.daily_plan_id;
