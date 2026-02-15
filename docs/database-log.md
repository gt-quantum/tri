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

## Current State Summary (as of 2026-02-15)

**Tables:** 12 (all created)
**Indexes:** 39 (34 original + 5 created_by indexes)
**Unique constraints:** 4 (all created)
**RLS:** Enabled on all 12 data tables with org_id policies
**System picklists:** 42 rows across 8 categories
**Seed data:** Loaded — 1 org, 3 users, 1 portfolio, 10 properties, 79 spaces, 20 tenants, 70 leases, 10 audit entries
**Triggers:** 6 BEFORE UPDATE triggers on core tables (auto-set updated_at via `public.set_updated_at()`)
**Schema changes:** 00005 added created_by/updated_by columns to 5 core entity tables; 00006 added updated_at triggers to 6 tables
