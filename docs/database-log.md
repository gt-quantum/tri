# Database Change Log

All database changes are tracked here. No DB modifications are made outside of this log.

---

## [2026-02-14] — Initial Database Creation

**Migrations run (all successful):**

### 00001_create_tables.sql
- Created `uuid-ossp` extension
- Created `user_role` enum (admin, manager, viewer)
- Created 12 tables in FK dependency order:
  1. `organizations` — top-level tenant entity
  2. `users` — FK → organizations
  3. `portfolios` — FK → organizations
  4. `properties` — FK → organizations, portfolios
  5. `spaces` — FK → organizations, properties
  6. `tenants` — FK → organizations, self-ref via parent_tenant_id
  7. `leases` — FK → organizations, tenants, spaces (nullable), properties
  8. `picklist_definitions` — FK → organizations (nullable for system defaults)
  9. `custom_field_definitions` — FK → organizations
  10. `audit_log` — FK → organizations, users
  11. `data_imports` — FK → organizations, users
  12. `scores` — FK → organizations

### 00002_create_indexes.sql
- 13 multi-tenancy indexes (org_id on every table)
- 7 FK relationship indexes (portfolio_id, property_id, parent_tenant_id, tenant_id, property_id, space_id, tenant_id+status)
- 7 soft delete indexes (deleted_at combinations on core entities)
- 5 audit log indexes (entity lookup, field history, time range, user, org+entity+time)
- 2 scoring indexes (entity lookup, org+entity+time)
- 4 unique constraints: organizations(slug), users(org_id, email), picklist_definitions(org_id, entity_type, field_name, value), custom_field_definitions(org_id, entity_type, field_name)

### 00003_enable_rls.sql
- RLS enabled on all 12 data tables (organizations excluded from having org_id-based policy — uses `id = public.user_org_id()` instead)
- Created `public.user_org_id()` helper function (SECURITY DEFINER, STABLE) — looks up org_id from users table via `auth.uid()`
- SELECT/INSERT/UPDATE policies on all tables scoped by org_id
- Picklist SELECT policy includes `OR org_id IS NULL` for system-wide defaults
- Audit log and scores are read-only (SELECT only) for authenticated users

### 00004_seed_picklists.sql
- 42 system-wide picklist rows (org_id = NULL) across 8 categories:
  - **org_type** (4): reit, property_manager, owner, firm
  - **property_type** (5): office, retail, industrial, residential, mixed_use
  - **space_type** (5): office, retail, warehouse, storage, common_area
  - **space status** (4): occupied, vacant, under_renovation, not_available — with colors
  - **lease_type** (4): nnn, gross, modified_gross, percentage
  - **lease status** (6): active, expired, pending, under_negotiation, month_to_month, terminated — with colors, active is_default
  - **tenant industry** (9): retail, technology, healthcare, finance, food_service, professional_services, government, nonprofit, other
  - **credit_rating** (5): excellent, good, fair, poor, not_rated — with colors, not_rated is_default

---

## [2026-02-14] — Seed Data (supabase/seed.sql)

**Status:** Executed successfully

**Script:** `supabase/seed.sql` — wrapped in BEGIN/COMMIT transaction, fully reversible by deleting rows with org_id `a1000000-0000-0000-0000-000000000001`.

### Data inserted:
- **1 organization:** Apex Capital Partners (id: `a1000000-...0001`, slug: `apex-capital`, type: reit)
- **3 users:** Sarah Chen (admin), Marcus Johnson (manager), Emily Rodriguez (viewer)
- **1 portfolio:** Southeast Commercial Portfolio
- **10 properties** across SE US:
  1. Peachtree Tower — Atlanta, GA — office — 180,000 sqft
  2. Music Row Commons — Nashville, TN — retail — 65,000 sqft
  3. Gateway Industrial Park — Charlotte, NC — industrial — 250,000 sqft
  4. Research Triangle Office Center — Raleigh, NC — office — 120,000 sqft
  5. King Street Mixed Use — Charleston, SC — mixed_use — 45,000 sqft
  6. Bayshore Retail Center — Tampa, FL — retail — 85,000 sqft
  7. Riverside Professional Plaza — Jacksonville, FL — office — 95,000 sqft
  8. Irondale Distribution Hub — Birmingham, AL — industrial — 200,000 sqft
  9. Historic District Shoppes — Savannah, GA — retail — 32,000 sqft
  10. Brickell Financial Center — Miami, FL — office — 150,000 sqft
- **79 spaces:** 64 occupied, 15 vacant (81% occupancy)
- **20 tenants:**
  - Multi-property chains: Brightside Coffee Co., First Meridian Bank, GreenLeaf Pharmacy
  - Parent/subsidiary: Meridian Holdings Group → Meridian Property Services, Meridian Insurance Solutions
  - Industries: technology, finance, healthcare, food_service, professional_services, retail, nonprofit, other
  - Credit ratings: 4 excellent, 7 good, 5 fair, 1 not_rated, 0 poor (but poor is available as a picklist)
- **70 leases:** 64 active, 4 expired, 2 under_negotiation
  - Types: mix of nnn, gross, modified_gross
  - Date range: start dates 2022–2024, end dates 2026–2031
  - Expired leases: Atlanta Suite 600, Nashville Unit 109, Tampa Store 6, Jacksonville Suite 700
  - Under negotiation: Atlanta Suite 800 (DataStream expanding), Charleston Unit 1C (Brightside new location)
- **10 audit log entries:** property creates (ui, csv_import), value updates (ui, api), lease status changes (system), tenant credit rating update (ui), space status change (system), tenant creation (csv_import)

### UUID encoding scheme:
- Organization: `a1000000-...`
- Users: `b1000000-...0001` through `0003`
- Portfolio: `c1000000-...0001`
- Properties: `d1000000-...0001` through `000a`
- Spaces: `e1PPSSSS-...` (PP = property hex, SSSS = space hex within property)
- Tenants: `f1000001-...` through `f1000014-...`
- Leases: `aa000001-...` through `aa000046-...`
- Audit log: `bb000001-...` through `bb00000a-...`

---

## [2026-02-15] — Add created_by / updated_by to core entities

**Migration:** `00005_add_created_updated_by.sql`

### Columns added (5 tables):
Each table received two new nullable uuid columns with FK → users(id), no ON DELETE CASCADE:
- `portfolios` — `created_by`, `updated_by`
- `properties` — `created_by`, `updated_by`
- `spaces` — `created_by`, `updated_by`
- `tenants` — `created_by`, `updated_by`
- `leases` — `created_by`, `updated_by`

**Organizations excluded** — circular FK dependency (users reference organizations, so the org must exist before any user).

### Indexes added (5):
- `idx_portfolios_created_by` on portfolios(created_by)
- `idx_properties_created_by` on properties(created_by)
- `idx_spaces_created_by` on spaces(created_by)
- `idx_tenants_created_by` on tenants(created_by)
- `idx_leases_created_by` on leases(created_by)

`updated_by` is not indexed — it changes on every update and is not a typical filter.

### Backfill:
- `created_by` backfilled from earliest `action = 'create'` audit_log entry per record
- `updated_by` backfilled from most recent audit_log entry per record
- Records without matching audit entries remain NULL

### Documentation updated:
- `docs/database-schema-v2.md` — 5 table definitions, indexes section, design decision #10

---

## [2026-02-15] — Auto-update updated_at triggers

**Migration:** `00006_updated_at_triggers.sql`
**Status:** Executed successfully

### Changes:
- Created `public.set_updated_at()` trigger function (BEFORE UPDATE, sets `NEW.updated_at = NOW()`)
- Applied BEFORE UPDATE triggers on 6 tables:
  - `organizations`
  - `portfolios`
  - `properties`
  - `spaces`
  - `tenants`
  - `leases`

### Purpose:
Ensures `updated_at` is always accurate on every UPDATE, regardless of whether the API layer explicitly sets it. Acts as a database-level safety net.

### Notes:
- The API layer still sets `updated_at` in its update calls for consistency, but the trigger guarantees correctness even if a direct SQL update is run
- Does not apply to `picklist_definitions`, `custom_field_definitions`, `audit_log`, `data_imports`, or `scores` (these don't have `updated_at` or don't need auto-update)

---

## [2026-02-15] — Auth Infrastructure (Phase 2)

**Migration:** `00007_auth_infrastructure.sql`
**Status:** Pending — run in Supabase SQL Editor

### New table: invitations
- `id` (uuid PK), `org_id` (FK → organizations), `email`, `role` (user_role enum)
- `invited_by` (FK → users), `token` (unique text), `accepted_at`, `revoked_at`, `expires_at`
- `created_at` (default now())

### Indexes added (4):
- `idx_invitations_org_id` on invitations(org_id)
- `idx_invitations_email` on invitations(email)
- `idx_invitations_token` on invitations(token)
- `idx_invitations_org_email_accepted` on invitations(org_id, email, accepted_at)

### Columns added to users:
- `auth_provider` (text) — 'email', 'google', 'azure'
- `last_login_at` (timestamptz) — updated on each login
- `avatar_url` (text) — from OAuth provider metadata

### Columns added to organizations:
- `created_by` (uuid FK → users) — who created the org
- `allowed_email_domains` (text[] DEFAULT '{}') — future domain restriction

### RLS for invitations:
- SELECT, INSERT, UPDATE policies scoped to `public.user_org_id()`
- RLS enabled on invitations table

### Updated function: public.user_org_id()
- Now reads `org_id` from JWT `app_metadata` first (fast path)
- Falls back to users table lookup (backwards compat)
- `COALESCE((auth.jwt() -> 'app_metadata' ->> 'org_id')::uuid, (SELECT org_id FROM public.users WHERE id = auth.uid()))`

### New function: public.handle_new_user()
- SECURITY DEFINER trigger function on auth.users INSERT
- Checks invitations for pending invitation matching new user's email
- If found: creates public.users record, marks invitation accepted, sets JWT app_metadata
- If not found: does nothing (user goes to onboarding)
- Handles race conditions with FOR UPDATE row lock

### Trigger: on_auth_user_created
- AFTER INSERT on auth.users → executes public.handle_new_user()

---

## [2026-02-15] — Auth Test Users Seed

**Script:** `supabase/seed-auth-users.sql`
**Status:** Pending — run in Supabase SQL Editor AFTER migration 00007

### Users created:
- **thomas.greg.toler@gmail.com** — admin for existing org (Apex Capital Partners)
  - Creates auth.users + auth.identities records
  - Creates public.users record linked to org `a1000000-0000-0000-0000-000000000001`
  - Sets app_metadata: `{"org_id": "...", "role": "admin"}`
  - Password: `TestPassword123!`
- **test-viewer@example.com** — no org association
  - Creates auth.users + auth.identities records only
  - NO public.users record (will see onboarding flow)
  - Password: `TestPassword123!`

### Notes:
- Idempotent: safe to run multiple times
- Existing seed users (Sarah, Marcus, Emily) left intact — no interference

---

## [2026-02-15] — API Key Management

**Migration:** `00008_api_keys.sql`
**Status:** Pending — run in Supabase SQL Editor

### New table: api_keys
- `id` (uuid PK, gen_random_uuid())
- `org_id` (uuid FK → organizations) — tenant isolation
- `name` (text NOT NULL) — human-readable label
- `description` (text) — optional notes
- `key_prefix` (varchar(12) NOT NULL) — first 12 chars for display (e.g., `sk_live_a3b4`)
- `key_hash` (varchar(64) NOT NULL UNIQUE) — SHA-256 hash of full key
- `role` (user_role NOT NULL DEFAULT 'viewer') — permission level
- `scopes` (text[]) — future fine-grained permissions (nullable)
- `created_by` (uuid FK → users) — admin who created the key
- `last_used_at` (timestamptz) — updated on each API call
- `last_used_ip` (inet) — IP of last request
- `expires_at` (timestamptz NOT NULL) — mandatory expiration
- `revoked_at` (timestamptz) — soft-revoke timestamp
- `revoked_by` (uuid FK → users) — who revoked it
- `created_at` (timestamptz NOT NULL DEFAULT now())
- `updated_at` (timestamptz NOT NULL DEFAULT now())

### Constraints:
- `api_keys_expires_after_created`: CHECK (expires_at > created_at)
- `api_keys_prefix_min_length`: CHECK (char_length(key_prefix) >= 8)

### Indexes added (3):
- `idx_api_keys_key_hash` — UNIQUE on key_hash (primary lookup)
- `idx_api_keys_org_id` — for listing keys by org
- `idx_api_keys_key_prefix` — for display/identification

### RLS:
- SELECT, INSERT, UPDATE policies scoped to `public.user_org_id()`
- RLS enabled on api_keys table

### Trigger:
- `set_api_keys_updated_at` — BEFORE UPDATE, reuses `public.set_updated_at()`

### Security model:
- Keys follow format: `sk_live_` + 32 random hex chars (128 bits entropy)
- Full key SHA-256 hashed before storage; plaintext shown once at creation
- Auth middleware detects `sk_` prefix and routes to API key validation
- API key auth returns creator's identity for audit trail
- Key's `role` field determines permissions (not creator's current role)

---

## [2026-02-15] — Lease Filter Indexes

**Migration:** `00009_lease_filter_indexes.sql`
**Status:** Pending — run in Supabase SQL Editor

### Indexes added (2):
- `idx_leases_org_status` on leases(org_id, status) — for `GET /api/v1/leases?status=...`
- `idx_leases_org_lease_type` on leases(org_id, lease_type) — for `GET /api/v1/leases?lease_type=...`

### Purpose:
The leases list endpoint supports filtering by `status` and `lease_type`, but these columns had no indexes. Without them, filtered queries require sequential scans as the leases table grows. Both use composite indexes with `org_id` to match the multi-tenancy query pattern.

---

## [2026-02-15] — AI Conversations

**Migration:** `00010_ai_conversations.sql`
**Status:** Pending — run in Supabase SQL Editor

### New table: ai_conversations
- `id` (uuid PK, gen_random_uuid())
- `org_id` (uuid FK → organizations) — tenant isolation
- `user_id` (uuid FK → users) — conversation owner
- `title` (text NOT NULL DEFAULT 'New conversation') — auto-generated or user-edited
- `messages` (jsonb NOT NULL DEFAULT '[]') — array of chat messages (loaded/saved atomically)
- `context` (jsonb) — page origin: page, portfolioId, entityType, entityId, selectedText
- `source` (text NOT NULL DEFAULT 'widget') — 'widget' or 'page', CHECK constraint
- `is_archived` (boolean NOT NULL DEFAULT false) — soft archive
- `created_at` (timestamptz NOT NULL DEFAULT now())
- `updated_at` (timestamptz NOT NULL DEFAULT now())

### Indexes added (3):
- `idx_ai_conversations_org_id` on ai_conversations(org_id)
- `idx_ai_conversations_user_id` on ai_conversations(user_id)
- `idx_ai_conversations_org_user_updated` on ai_conversations(org_id, user_id, updated_at DESC)

### RLS:
- SELECT, INSERT, UPDATE, DELETE policies scoped to `public.user_org_id()`
- RLS enabled on ai_conversations table

### Trigger:
- `set_ai_conversations_updated_at` — BEFORE UPDATE, reuses `public.set_updated_at()`

---

## Current State Summary (as of 2026-02-15)

**Tables:** 15 (12 original + invitations + api_keys + ai_conversations)
**Indexes:** 51 (48 previous + 3 ai_conversations indexes)
**Unique constraints:** 5 (4 previous + api_keys key_hash unique)
**RLS:** Enabled on all 15 data tables with org_id policies
**System picklists:** 42 rows across 8 categories
**Seed data:** Loaded — 1 org, 3 original users + 2 auth users, 1 portfolio, 10 properties, 79 spaces, 20 tenants, 70 leases, 10 audit entries
**Triggers:** 9 (8 previous + 1 BEFORE UPDATE on ai_conversations)
**Functions:** `public.user_org_id()` (updated for JWT claims), `public.set_updated_at()`, `public.handle_new_user()`
**Schema changes:** 00010 adds ai_conversations table for Strata AI chat persistence
