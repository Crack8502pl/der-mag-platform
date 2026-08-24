-- Migration: 20260824_add_completed_at_to_tasks
-- Adds completed_at column to tasks table
-- Required by NotificationSchedulerService (getWeeklyProgress, getMonthlyMetrics)
-- which query task.completedAt for weekly and monthly KPI reports

ALTER TABLE tasks ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP NULL;

-- Backfill: dla istniejących zadań zakończonych użyj updated_at jako przybliżenia
-- (tasks do not store exact completion timestamp historically)
UPDATE tasks
SET completed_at = updated_at
WHERE status = 'completed'
  AND completed_at IS NULL;
