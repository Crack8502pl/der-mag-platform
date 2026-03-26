-- Migration: Create push_subscriptions table
-- Date: 2026-03-26

CREATE TABLE IF NOT EXISTS "push_subscriptions" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "endpoint" TEXT NOT NULL,
  "p256dh" VARCHAR(255) NOT NULL,
  "auth" VARCHAR(255) NOT NULL,
  "created_at" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "expires_at" TIMESTAMP NULL,
  CONSTRAINT "FK_push_subscriptions_user" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS "IDX_push_subscriptions_user_id" ON "push_subscriptions"("user_id");
CREATE UNIQUE INDEX IF NOT EXISTS "IDX_push_subscriptions_endpoint" ON "push_subscriptions"("endpoint");
