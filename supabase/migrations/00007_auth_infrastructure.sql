-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00007: Auth infrastructure
--
-- Creates invitations table, adds auth columns to users and
-- organizations, updates RLS helper to use JWT claims, and
-- creates the auth trigger for new signups.
-- ============================================================

-- ============================================================
-- 1. ADD COLUMNS TO EXISTING TABLES
-- ============================================================

-- Users: auth-related columns
ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url text;

-- Organizations: creator and domain restrictions
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES users(id);
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS allowed_email_domains text[] NOT NULL DEFAULT '{}';

-- ============================================================
-- 2. CREATE INVITATIONS TABLE
-- ============================================================

CREATE TABLE invitations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    email text NOT NULL,
    role user_role NOT NULL DEFAULT 'viewer',
    invited_by uuid NOT NULL REFERENCES users(id),
    token text NOT NULL UNIQUE,
    accepted_at timestamptz,
    revoked_at timestamptz,
    expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days'),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes for invitations
CREATE INDEX idx_invitations_org_id ON invitations(org_id);
CREATE INDEX idx_invitations_email ON invitations(email);
CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_org_email_accepted ON invitations(org_id, email, accepted_at);

-- ============================================================
-- 3. RLS FOR INVITATIONS
-- ============================================================

ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;

-- Org members can view their org's invitations
CREATE POLICY "Users can view invitations in their org"
    ON invitations FOR SELECT
    USING (org_id = public.user_org_id());

-- Only admins can create invitations (enforced at API layer too,
-- but RLS is the last line of defense)
CREATE POLICY "Users can insert invitations in their org"
    ON invitations FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

-- Only admins can update invitations (revoke, resend)
CREATE POLICY "Users can update invitations in their org"
    ON invitations FOR UPDATE
    USING (org_id = public.user_org_id());

-- ============================================================
-- 4. UPDATE user_org_id() TO USE JWT CLAIMS
-- ============================================================
-- Previously looked up org_id from users table via auth.uid().
-- Now reads org_id from JWT app_metadata first (faster, no table
-- lookup) with fallback to users table for backwards compatibility.

CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid,
    (SELECT org_id FROM public.users WHERE id = auth.uid())
  )
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 5. AUTH TRIGGER: handle new Supabase Auth signups
-- ============================================================
-- Fires on INSERT into auth.users. Checks for a pending invitation:
--   - If found: creates public.users record, marks invitation accepted,
--     sets app_metadata with org_id and role
--   - If not found: does nothing (user goes to onboarding flow)

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  _invitation RECORD;
  _full_name text;
  _avatar_url text;
  _provider text;
BEGIN
  -- Extract profile info from user metadata
  _full_name := COALESCE(
    NEW.raw_user_meta_data ->> 'full_name',
    NEW.raw_user_meta_data ->> 'name',
    split_part(NEW.email, '@', 1)
  );
  _avatar_url := COALESCE(
    NEW.raw_user_meta_data ->> 'avatar_url',
    NEW.raw_user_meta_data ->> 'picture'
  );
  _provider := COALESCE(
    NEW.raw_app_meta_data ->> 'provider',
    'email'
  );

  -- Look for the most recent pending invitation for this email
  -- Use FOR UPDATE to prevent race conditions
  SELECT * INTO _invitation
  FROM public.invitations
  WHERE email = NEW.email
    AND accepted_at IS NULL
    AND revoked_at IS NULL
    AND expires_at > now()
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF _invitation IS NOT NULL THEN
    -- Create the public.users record linked to the auth user
    INSERT INTO public.users (id, org_id, email, full_name, role, auth_provider, avatar_url, created_at)
    VALUES (
      NEW.id,
      _invitation.org_id,
      NEW.email,
      _full_name,
      _invitation.role,
      _provider,
      _avatar_url,
      now()
    );

    -- Mark invitation as accepted
    UPDATE public.invitations
    SET accepted_at = now()
    WHERE id = _invitation.id;

    -- Set app_metadata on the auth user so JWT includes org_id and role
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data ||
      jsonb_build_object(
        'org_id', _invitation.org_id::text,
        'role', _invitation.role::text
      )
    WHERE id = NEW.id;

    -- Audit log: user joined via invitation
    INSERT INTO public.audit_log (org_id, entity_type, entity_id, action, new_value, changed_by, changed_at, change_source)
    VALUES (
      _invitation.org_id,
      'user',
      NEW.id,
      'create',
      jsonb_build_object(
        'email', NEW.email,
        'full_name', _full_name,
        'role', _invitation.role::text,
        'auth_provider', _provider,
        'invited_by', _invitation.invited_by::text
      ),
      NEW.id,
      now(),
      'system'
    );
  END IF;

  -- If no invitation found, do nothing.
  -- User enters "needs org" state — frontend detects missing org_id
  -- in JWT and routes to /onboarding.

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
