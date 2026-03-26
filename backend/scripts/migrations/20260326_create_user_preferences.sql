-- Migration: Create user_preferences table
-- Date: 2026-03-26

CREATE TABLE IF NOT EXISTS "user_preferences" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL UNIQUE,
  "theme" VARCHAR(20) DEFAULT 'grover',
  "email_notifications" BOOLEAN DEFAULT true,
  "push_notifications" BOOLEAN DEFAULT false,
  "notification_sound" BOOLEAN DEFAULT true,
  "two_factor_enabled" BOOLEAN DEFAULT false,
  "session_timeout" INTEGER DEFAULT 480,
  "updated_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "FK_user_preferences_user" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_user_preferences_user_id" ON "user_preferences"("user_id");
