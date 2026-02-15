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
