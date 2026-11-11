PRAGMA foreign_keys = ON;
CREATE TABLE IF NOT EXISTS cases (
  id TEXT PRIMARY KEY, start_ms INTEGER NOT NULL, cohort_month TEXT NOT NULL,
  application_type TEXT NOT NULL, outcome TEXT NOT NULL,
  observed_days REAL CHECK(observed_days >= 0), source_event_count INTEGER NOT NULL
);
CREATE TABLE IF NOT EXISTS transitions (
  case_id TEXT NOT NULL REFERENCES cases(id), sequence INTEGER NOT NULL,
  state_id INTEGER NOT NULL CHECK(state_id BETWEEN 0 AND 9),
  seconds_since_start REAL CHECK(seconds_since_start >= 0),
  PRIMARY KEY(case_id, sequence)
);
CREATE INDEX IF NOT EXISTS idx_cases_cohort_outcome ON cases(cohort_month, outcome);
CREATE VIEW IF NOT EXISTS completed_cases AS SELECT * FROM cases WHERE outcome <> 'open';
CREATE VIEW IF NOT EXISTS state_intervals AS
  SELECT case_id, sequence, state_id,
    LEAD(state_id) OVER (PARTITION BY case_id ORDER BY sequence) AS next_state_id,
    (LEAD(seconds_since_start) OVER (PARTITION BY case_id ORDER BY sequence)-seconds_since_start)/86400.0 AS interval_days
  FROM transitions;
