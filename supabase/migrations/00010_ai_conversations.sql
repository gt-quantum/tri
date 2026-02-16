-- Migration 00010: AI Conversations
-- Stores chat conversations between users and Strata AI.
-- Messages are stored as a jsonb array (loaded/saved atomically).

-- ============================================================
-- Table: ai_conversations
-- ============================================================
CREATE TABLE ai_conversations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id        uuid NOT NULL REFERENCES organizations(id),
  user_id       uuid NOT NULL REFERENCES users(id),
  title         text NOT NULL DEFAULT 'New conversation',
  messages      jsonb NOT NULL DEFAULT '[]'::jsonb,
  context       jsonb DEFAULT NULL,
  source        text NOT NULL DEFAULT 'widget' CHECK (source IN ('widget', 'page')),
  is_archived   boolean NOT NULL DEFAULT false,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- Indexes
-- ============================================================
CREATE INDEX idx_ai_conversations_org_id
  ON ai_conversations(org_id);

CREATE INDEX idx_ai_conversations_user_id
  ON ai_conversations(user_id);

CREATE INDEX idx_ai_conversations_org_user_updated
  ON ai_conversations(org_id, user_id, updated_at DESC);

-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE ai_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY ai_conversations_select ON ai_conversations
  FOR SELECT TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY ai_conversations_insert ON ai_conversations
  FOR INSERT TO authenticated
  WITH CHECK (org_id = public.user_org_id());

CREATE POLICY ai_conversations_update ON ai_conversations
  FOR UPDATE TO authenticated
  USING (org_id = public.user_org_id());

CREATE POLICY ai_conversations_delete ON ai_conversations
  FOR DELETE TO authenticated
  USING (org_id = public.user_org_id());

-- ============================================================
-- Trigger: auto-update updated_at
-- ============================================================
CREATE TRIGGER set_ai_conversations_updated_at
  BEFORE UPDATE ON ai_conversations
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
