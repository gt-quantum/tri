# Changelog

All notable changes to this project will be documented in this file.

---

## [2026-02-14] — Seed Data & Dashboard

### Added
- Comprehensive seed data script (`supabase/seed.sql`):
  - 1 organization (Apex Capital Partners)
  - 3 users (admin, manager, viewer)
  - 1 portfolio (Southeast Commercial Portfolio)
  - 10 properties across SE US (Atlanta, Nashville, Charlotte, Raleigh, Charleston, Tampa, Jacksonville, Birmingham, Savannah, Miami)
  - 79 spaces (64 occupied, 15 vacant — 81% occupancy)
  - 20 tenants (3 multi-property chains, 1 parent + 2 subsidiaries, mixed industries and credit ratings)
  - 70 leases (64 active, 4 expired, 2 under negotiation — mix of NNN, gross, modified gross)
  - 10 audit log entries (property creates, value updates, lease status changes, credit rating updates)
- React dashboard (`dashboard/`) — Vite + Tailwind, dark theme:
  - Summary cards (properties, spaces, occupancy, revenue, avg lease remaining)
  - Sortable properties table with color-coded occupancy
  - Tenant overview with parent/subsidiary hierarchy and multi-property badges
  - Lease timeline sorted by expiration with color-coded status
  - Vacancy view with under-negotiation lease details

---

## [2026-02-14] — Initial Project Setup

### Added
- Project configuration (`CLAUDE.md`)
- Database schema documentation (`docs/database-schema-v2.md`)
- Architectural decision log (`docs/decisions.md`)
- This changelog
- Database migration files (`supabase/migrations/`):
  - `00001_create_tables.sql` — All 12 tables (organizations, users, portfolios, properties, spaces, tenants, leases, picklist_definitions, custom_field_definitions, audit_log, data_imports, scores) with proper FK dependencies
  - `00002_create_indexes.sql` — All indexes (multi-tenancy, FK relationships, soft deletes, audit log, scoring) and unique constraints
  - `00003_enable_rls.sql` — Row Level Security enabled on all tables with org_id-scoped policies and `public.user_org_id()` helper function
  - `00004_seed_picklists.sql` — System-wide picklist defaults for org_type, property_type, space_type, space status, lease_type, lease status, tenant industry, and credit_rating
- Database change log (`docs/database-log.md`) — persistent record of all DB modifications
- All 4 migrations run successfully against Supabase
