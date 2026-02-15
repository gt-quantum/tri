# Architectural Decision Log

---

## ADR-001: Supabase (PostgreSQL) as Database Platform

**Date:** 2026-02-14
**Status:** Accepted

### Context
We need a database platform for a multi-tenant real estate management system that supports row-level security, jsonb for flexible schema, and a managed hosting option.

### Decision
Use Supabase (PostgreSQL) as the database platform.

### Rationale
- **Row-Level Security (RLS):** Native PostgreSQL RLS enforces multi-tenant data isolation at the database level via `org_id` on every table — no application-level filtering bugs can leak data between orgs
- **jsonb support:** PostgreSQL's jsonb enables custom fields (`metadata` columns) and flexible configuration (`settings`, `options`) without schema migrations per org
- **Managed infrastructure:** Supabase provides auth, real-time subscriptions, storage, and edge functions alongside PostgreSQL, reducing operational overhead
- **SQL-native:** Full SQL support for complex queries across the audit log, scoring, and reporting layers
- **Ecosystem:** Strong client libraries for web, desktop, and future MCP server integrations

---

## ADR-002: Multi-Tenancy via org_id

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Every table includes an `org_id` column referencing the `organizations` table. Supabase RLS policies enforce that users can only access rows matching their organization.

### Rationale
Shared-database, shared-schema multi-tenancy is simpler to operate than separate databases per tenant. RLS provides the isolation guarantee at the database layer.

---

## ADR-003: Soft Deletes on Core Entities

**Date:** 2026-02-14
**Status:** Accepted

### Decision
All core entity tables (organizations, users, portfolios, properties, spaces, tenants, leases) use a nullable `deleted_at` timestamp instead of hard deletes.

### Rationale
- Preserves data for historical reporting and audit trails
- Enables recovery of accidentally deleted records
- Scoring calculations can still reference soft-deleted entities
- Normal queries filter with `WHERE deleted_at IS NULL`

---

## ADR-004: Custom Fields via jsonb + Definitions Table

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Each core entity has a `metadata` jsonb column for custom field values. The `custom_field_definitions` table tracks what fields each org has created, their types, and validation rules.

### Rationale
- Avoids schema migrations when orgs add custom fields
- The definitions table enables UI rendering, validation, and admin management
- jsonb is indexable in PostgreSQL for query performance when needed

---

## ADR-005: Picklist Configurations per Organization

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Standard fields (status, type, etc.) reference the `picklist_definitions` table rather than using database enums. Each org can customize dropdown values. System-wide defaults have `org_id = NULL`.

### Rationale
- Organizations have different terminology and workflows
- No schema migrations needed to add/modify dropdown options
- Supports display labels, colors, sort ordering, and soft-disable per value
- System defaults provide a starting point; orgs override as needed

---

## ADR-006: Tenants as Independent Org-Level Entities

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Tenants exist at the organization level, NOT nested under properties. Leases create the many-to-many relationship between tenants and spaces/properties. A `parent_tenant_id` self-reference enables corporate hierarchies.

### Rationale
- A single tenant (e.g. Home Depot) can lease spaces across multiple properties
- Corporate hierarchies (parent → subsidiaries) are modeled naturally
- Lease history across all properties is queryable from the tenant record

---

## ADR-007: Audit Log from Day One

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Every create, update, soft_delete, and restore across all tables is recorded in `audit_log` with old/new values, the user who made the change, timestamp, and change source (ui, api, csv_import, mcp, desktop, system).

### Rationale
- Historical data is impossible to recreate retroactively
- Enables time-series dashboards ("how did this property's value change over 12 months?")
- Supports compliance and dispute resolution
- The `change_source` field tracks which client originated each change

---

## ADR-008: Polymorphic Scoring Framework

**Date:** 2026-02-14
**Status:** Accepted

### Decision
The `scores` table uses polymorphic references (`entity_type` + `entity_id`) to score any entity type. A future `score_model_definitions` table will define weighted scoring models.

### Rationale
- Risk/opportunity scoring is a planned feature across properties, tenants, leases, and spaces
- Polymorphic design avoids separate score tables per entity type
- The `score_components` jsonb column stores the breakdown of contributing factors for transparency

---

## ADR-009: Client-Agnostic Architecture

**Date:** 2026-02-14
**Status:** Accepted

### Decision
The database schema supports web, desktop, and MCP server clients equally. No client-specific logic in the schema.

### Rationale
- The platform will be accessed via web app, desktop app, and LLM-powered MCP server
- The audit log's `change_source` field distinguishes between clients for analytics
- All clients use the same tables, RLS policies, and API surface

---

## ADR-010: React + Vite + Tailwind Dashboard

**Date:** 2026-02-14
**Status:** Superseded by ADR-012 (legacy dashboard preserved in `dashboard-v1/`)

### Context
Need a developer/admin dashboard to visualize portfolio data during development. Must connect directly to Supabase and render seed data.

### Decision
Use React 18 + Vite + Tailwind CSS 3 for the dashboard. Use service_role key for dev-only access (bypasses RLS). Deploy to Vercel with auto-deploy from `main`.

### Rationale
- **React 18:** Lightweight, well-known, sufficient for data display
- **Vite:** Fast dev server and build tool, minimal config
- **Tailwind:** Utility-first CSS enables rapid UI iteration without separate stylesheet management
- **Supabase JS client:** Direct queries to PostgreSQL without an API layer — appropriate for dev/admin tooling
- **Vercel:** Zero-config deploys for Vite apps, free tier sufficient for dev

### Notes
- Service role key is dev-only — production dashboard will use authenticated Supabase client with RLS
- Custom "Obsidian & Brass" dark theme defined in `tailwind.config.js` (obsidian backgrounds, brass accents, warm neutral text, Playfair Display + Outfit fonts)

---

## ADR-011: Client-Side Routing with React Router

**Date:** 2026-02-14
**Status:** Accepted

### Decision
Use React Router v6 for client-side SPA routing. Data is fetched once at the `App` level and passed to routed pages as props. Vercel SPA rewrite (`vercel.json`) ensures deep links work in production.

### Rationale
- Detail pages (`/property/:id`, `/tenant/:id`) need unique URLs for direct linking and browser navigation
- Single data fetch at app level avoids redundant Supabase queries when navigating between pages
- React Router is the de facto standard for React SPAs — minimal learning curve and good ecosystem support

---

## ADR-012: Next.js 15 App Router for API Layer

**Date:** 2026-02-15
**Status:** Accepted

### Context
Need a REST API layer between clients (web, desktop, MCP) and the Supabase database. Options considered: (a) standalone Express/Fastify server, (b) Supabase Edge Functions, (c) Next.js App Router with Route Handlers.

### Decision
Use Next.js 15 App Router at the repo root. API routes live at `app/api/v1/`. The legacy Vite dashboard is preserved in `dashboard-v1/` but is no longer deployed.

### Rationale
- **Single deployable unit:** API and future frontend in one project, one Vercel deployment
- **Route Handlers:** File-based routing for API endpoints matches the REST resource structure naturally
- **TypeScript-native:** Full type safety from Zod schemas through to response envelopes
- **Vercel integration:** Zero-config production deployments, serverless functions, edge-ready
- **Future frontend:** When the dashboard is rebuilt, it lives alongside the API in the same project — no CORS, shared types, SSR/RSC available

### Notes
- Supersedes ADR-010 (Vite dashboard is now legacy)
- Root-level project structure chosen over nested `api/` directory for simplicity

---

## ADR-013: API-Level Audit Logging

**Date:** 2026-02-15
**Status:** Accepted

### Context
Need to record every data mutation for audit trail, historical analysis, and compliance. Options: (a) PostgreSQL triggers that auto-log on every INSERT/UPDATE/DELETE, (b) application-level logging in each API route.

### Decision
Audit logging happens at the API layer, not via database triggers. The `lib/audit.ts` module provides `auditCreate()`, `auditUpdate()`, and `auditSoftDelete()` functions called explicitly in each route handler.

### Rationale
- **Richer context:** The API knows the authenticated user, their role, and the client source (`X-Change-Source` header). DB triggers only see the raw SQL operation
- **Per-field diffs:** `auditUpdate()` computes field-level old/new diffs, skipping unchanged fields and `updated_at` — more useful than logging the entire row
- **Selective logging:** Not every table needs audit logging (e.g., picklists, custom_field_definitions). Application-level control is simpler than managing trigger exceptions
- **Consistency with ADR-007:** The audit_log schema was designed for application-level writes from the start (change_source, changed_by fields)

---

## ADR-014: Dev-Mode Auth with Hardcoded User

**Date:** 2026-02-15
**Status:** Accepted (temporary — will be replaced by Supabase Auth)

### Context
Need auth context (userId, orgId, role) for every API request to enforce authorization and audit logging. Real auth (Supabase Auth) is not yet configured.

### Decision
`lib/auth.ts` returns a hardcoded `AuthContext` for Sarah Chen (admin, org `a1000000-...0001`) in dev mode. The `AuthContext` interface and `requireRole()` function are production-shaped so swapping to real auth is a drop-in replacement.

### Rationale
- Unblocks all API development — every route can call `getAuthContext()` and `requireRole()` today
- The interface is already correct: `{ userId, orgId, role, email, fullName }` — only the implementation of `getAuthContext()` needs to change
- Role hierarchy enforcement (`viewer < manager < admin`) is fully functional and tested

---

## ADR-015: Offset-Based Pagination

**Date:** 2026-02-15
**Status:** Accepted

### Context
Need pagination for all list endpoints. Options: (a) offset-based (`?limit=25&offset=50`), (b) cursor-based (`?after=abc123`).

### Decision
Use offset-based pagination with `limit` and `offset` query parameters. Default limit is 25, max is 100.

### Rationale
- **Simpler for clients:** Offset/limit maps directly to UI concepts (page 1, page 2) and SQL OFFSET/LIMIT
- **Random access:** Clients can jump to any page without iterating through cursors
- **Dataset size:** With org-scoped data (typically hundreds to low thousands of records), offset performance is not a concern
- **Supabase `.range()`:** Maps directly to Supabase's range-based query API

### Notes
- Cursor-based could be added later for specific high-volume endpoints if needed
- Every list response includes `meta.total` for client-side page count calculations
