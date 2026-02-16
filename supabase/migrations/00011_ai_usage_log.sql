-- Migration 00011: AI Usage Log
-- Append-only analytics table for Strata AI usage tracking.
-- One row per chat turn (user message → AI response).
-- Not exposed to end users — for platform owner back-office analytics only.

-- ============================================================
-- Table: ai_usage_log
-- ============================================================
CREATE TABLE ai_usage_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id          uuid NOT NULL REFERENCES organizations(id),
  user_id         uuid NOT NULL REFERENCES users(id),
  conversation_id uuid REFERENCES ai_conversations(id) ON DELETE SET NULL,
  source          text NOT NULL DEFAULT 'widget' CHECK (source IN ('widget', 'page')),
  user_message    text,
  tools_called    text[] DEFAULT '{}',
  token_input     integer,
  token_output    integer,
  duration_ms     integer,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes (optimized for back-office aggregate queries)
-- ============================================================
CREATE INDEX idx_ai_usage_log_org_id ON ai_usage_log(org_id);
CREATE INDEX idx_ai_usage_log_user_id ON ai_usage_log(user_id);
CREATE INDEX idx_ai_usage_log_created_at ON ai_usage_log(created_at DESC);
CREATE INDEX idx_ai_usage_log_org_created ON ai_usage_log(org_id, created_at DESC);

-- ============================================================
-- RLS — service_role only (no end-user access)
-- ============================================================
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- No policies = no access via anon/authenticated roles.
-- Only service_role (which bypasses RLS) can read/write.
-- This keeps the data invisible to end users.
