-- Migration: Create notification_schedules table
-- Date: 2026-01-07
-- Description: Creates table for email notification scheduling

-- Create notification_schedules table
CREATE TABLE IF NOT EXISTS notification_schedules (
  id SERIAL PRIMARY KEY,
  notification_type VARCHAR(50) NOT NULL,
  schedule_cron VARCHAR(50) NOT NULL,
  last_run TIMESTAMP,
  next_run TIMESTAMP,
  active BOOLEAN DEFAULT true
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_notification_schedules_type ON notification_schedules(notification_type);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_active ON notification_schedules(active);
CREATE INDEX IF NOT EXISTS idx_notification_schedules_next_run ON notification_schedules(next_run);

-- Add comments
COMMENT ON TABLE notification_schedules IS 'Harmonogram automatycznych powiadomień email';
COMMENT ON COLUMN notification_schedules.notification_type IS 'Typ powiadomienia: daily_brigade_report, daily_management_report, weekly_manager_report, brigade_assignment';
COMMENT ON COLUMN notification_schedules.schedule_cron IS 'Wyrażenie cron dla harmonogramu (np. 0 18 * * * dla 18:00 każdy dzień)';

-- Insert default notification schedules
INSERT INTO notification_schedules (notification_type, schedule_cron, active)
VALUES 
  ('daily_brigade_report', '0 18 * * *', true),  -- 18:00 daily
  ('daily_management_report', '0 20 * * *', true),  -- 20:00 daily
  ('weekly_manager_report', '0 16 * * 5', true)  -- 16:00 every Friday
ON CONFLICT DO NOTHING;
