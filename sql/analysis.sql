-- All durations are calendar elapsed time, not productive work or a causal waiting-time measure.
SELECT cohort_month, COUNT(*) AS completed_cases, ROUND(AVG(observed_days), 2) AS mean_days
FROM completed_cases GROUP BY cohort_month ORDER BY cohort_month;

SELECT state_id, next_state_id, COUNT(*) AS transitions, ROUND(AVG(interval_days), 2) AS mean_elapsed_days
FROM state_intervals WHERE next_state_id IS NOT NULL
GROUP BY state_id, next_state_id ORDER BY transitions DESC;

-- Rework proxy: revisiting application-state validation, not a measured defect.
SELECT COUNT(*) AS cases_revisiting_validation FROM (
  SELECT case_id FROM transitions WHERE state_id = 5 GROUP BY case_id HAVING COUNT(*) > 1
);
