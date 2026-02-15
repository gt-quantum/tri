-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00008: API key management
--
-- Creates api_keys table for programmatic API access.
-- Keys are SHA-256 hashed — plaintext is shown once at creation.
-- Supports role-based permissions, expiration, and revocation.
-- ============================================================

-- ============================================================
-- 1. CREATE API_KEYS TABLE
-- ============================================================

CREATE TABLE api_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    description text,
    key_prefix varchar(12) NOT NULL,
    key_hash varchar(64) NOT NULL UNIQUE,
    role user_role NOT NULL DEFAULT 'viewer',
    scopes text[],
    created_by uuid NOT NULL REFERENCES users(id),
    last_used_at timestamptz,
    last_used_ip inet,
    expires_at timestamptz NOT NULL,
    revoked_at timestamptz,
    revoked_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT api_keys_expires_after_created CHECK (expires_at > created_at),
    CONSTRAINT api_keys_prefix_min_length CHECK (char_length(key_prefix) >= 8)
);

-- ============================================================
-- 2. INDEXES
-- ============================================================

-- Primary lookup: hash the incoming key → find the row
CREATE UNIQUE INDEX idx_api_keys_key_hash ON api_keys(key_hash);

-- List keys by org (admin management view)
CREATE INDEX idx_api_keys_org_id ON api_keys(org_id);

-- Display/identification by prefix
CREATE INDEX idx_api_keys_key_prefix ON api_keys(key_prefix);

-- ============================================================
-- 3. RLS POLICIES
-- ============================================================

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view api_keys in their org"
    ON api_keys FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert api_keys in their org"
    ON api_keys FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update api_keys in their org"
    ON api_keys FOR UPDATE
    USING (org_id = public.user_org_id());

-- ============================================================
-- 4. UPDATED_AT TRIGGER
-- ============================================================
-- Reuses the existing set_updated_at() function from migration 00006.

CREATE TRIGGER set_api_keys_updated_at
    BEFORE UPDATE ON api_keys
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
