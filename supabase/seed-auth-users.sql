-- ============================================================
-- Auth Test Users Seed Script
-- ============================================================
-- Creates two Supabase Auth users for testing:
--   1. thomas.greg.toler@gmail.com — admin for existing test org
--   2. test-viewer@example.com — viewer with no org (proves isolation)
--
-- IDEMPOTENT: Safe to run multiple times.
-- Run this AFTER migration 00007_auth_infrastructure.sql.
--
-- NOTE: This must be run in the Supabase SQL Editor (not via CLI)
-- because it writes to auth.users which requires elevated permissions.
-- ============================================================

DO $$
DECLARE
  _admin_id uuid;
  _viewer_id uuid;
  _org_id uuid := 'a1000000-0000-0000-0000-000000000001'; -- Apex Capital Partners
  _admin_email text := 'thomas.greg.toler@gmail.com';
  _viewer_email text := 'test-viewer@example.com';
  _password_hash text;
BEGIN
  -- ============================================================
  -- 1. PRIMARY TEST USER: thomas.greg.toler@gmail.com (admin)
  -- ============================================================

  -- Check if auth user already exists
  SELECT id INTO _admin_id FROM auth.users WHERE email = _admin_email;

  IF _admin_id IS NULL THEN
    -- Generate a new UUID for this user
    _admin_id := gen_random_uuid();

    -- Hash the password using Supabase's built-in crypt function
    -- Supabase uses bcrypt for password hashing
    _password_hash := crypt('TestPassword123!', gen_salt('bf'));

    -- Create the auth.users record
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      _admin_id,
      'authenticated',
      'authenticated',
      _admin_email,
      _password_hash,
      now(), -- Email pre-confirmed
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email'],
        'org_id', _org_id::text,
        'role', 'admin'
      ),
      jsonb_build_object(
        'full_name', 'Greg Toler',
        'name', 'Greg Toler'
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    -- Create the auth.identities record (required for email login)
    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      _admin_id,
      _admin_id,
      _admin_email,
      jsonb_build_object(
        'sub', _admin_id::text,
        'email', _admin_email,
        'email_verified', true,
        'full_name', 'Greg Toler'
      ),
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Created auth user: % (id: %)', _admin_email, _admin_id;
  ELSE
    -- Update existing auth user's app_metadata to ensure org_id and role are set
    UPDATE auth.users
    SET raw_app_meta_data = raw_app_meta_data ||
      jsonb_build_object(
        'org_id', _org_id::text,
        'role', 'admin'
      ),
      raw_user_meta_data = raw_user_meta_data ||
      jsonb_build_object(
        'full_name', 'Greg Toler',
        'name', 'Greg Toler'
      )
    WHERE id = _admin_id;

    RAISE NOTICE 'Auth user already exists: % (id: %). Updated metadata.', _admin_email, _admin_id;
  END IF;

  -- Create or update the public.users record for the admin
  INSERT INTO public.users (id, org_id, email, full_name, role, auth_provider, created_at)
  VALUES (
    _admin_id,
    _org_id,
    _admin_email,
    'Greg Toler',
    'admin',
    'email',
    now()
  )
  ON CONFLICT (org_id, email) DO UPDATE SET
    id = _admin_id,
    full_name = 'Greg Toler',
    role = 'admin',
    auth_provider = 'email',
    deleted_at = NULL;

  RAISE NOTICE 'Public user record ready: % -> org %', _admin_email, _org_id;

  -- ============================================================
  -- 2. SECOND TEST USER: test-viewer@example.com (proves isolation)
  -- ============================================================

  -- Check if auth user already exists
  SELECT id INTO _viewer_id FROM auth.users WHERE email = _viewer_email;

  IF _viewer_id IS NULL THEN
    _viewer_id := gen_random_uuid();

    _password_hash := crypt('TestPassword123!', gen_salt('bf'));

    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      email_change_token_new,
      email_change
    ) VALUES (
      '00000000-0000-0000-0000-000000000000',
      _viewer_id,
      'authenticated',
      'authenticated',
      _viewer_email,
      _password_hash,
      now(),
      jsonb_build_object(
        'provider', 'email',
        'providers', ARRAY['email']
        -- NO org_id or role — this user has no org
      ),
      jsonb_build_object(
        'full_name', 'Test Viewer',
        'name', 'Test Viewer'
      ),
      now(),
      now(),
      '',
      '',
      '',
      ''
    );

    INSERT INTO auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    ) VALUES (
      _viewer_id,
      _viewer_id,
      _viewer_email,
      jsonb_build_object(
        'sub', _viewer_id::text,
        'email', _viewer_email,
        'email_verified', true,
        'full_name', 'Test Viewer'
      ),
      'email',
      now(),
      now(),
      now()
    );

    RAISE NOTICE 'Created auth user: % (id: %)', _viewer_email, _viewer_id;
  ELSE
    RAISE NOTICE 'Auth user already exists: % (id: %)', _viewer_email, _viewer_id;
  END IF;

  -- NOTE: No public.users record for test-viewer@example.com.
  -- When they log in, they'll have no org_id in their JWT and will
  -- be routed to /onboarding — proving multi-tenant isolation.

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Auth seed complete!';
  RAISE NOTICE '';
  RAISE NOTICE 'Admin user:  % (org: Apex Capital Partners)', _admin_email;
  RAISE NOTICE 'Viewer user: % (no org — will see onboarding)', _viewer_email;
  RAISE NOTICE '';
  RAISE NOTICE 'Both passwords: TestPassword123!';
  RAISE NOTICE '============================================';
END $$;
