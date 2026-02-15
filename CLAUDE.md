# Real Estate Platform

## Tech Stack
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **API:** Next.js 15 (App Router) + TypeScript — Route Handlers at `/api/v1/`
- **Validation:** Zod schemas (also powers OpenAPI 3.1 spec generation)
- **Legacy Dashboard:** React 18 + Vite + Tailwind 3 (in `dashboard-v1/`, being replaced)
- **Charts:** Recharts (SVG-based, native React components)
- **Map:** Leaflet + react-leaflet v4 (CartoDB dark matter tiles, no API key)
- **Hosting:** Vercel (auto-deploys from `main` branch)
- **Theme:** "Obsidian & Brass" dark theme (Tailwind config at root)

## Summary
Multi-tenant platform for real estate organizations — including REITs, property management companies, private owners, and commercial real estate firms — to manage portfolios, properties, spaces, tenants, and leases. Features customizable fields and picklist values per organization, a full audit log for historical change tracking, data import tracking, and a polymorphic scoring framework for risk/opportunity analysis.

## Key Conventions
- **Multi-tenancy:** All tables include `org_id` for tenant data isolation, enforced by Supabase RLS
- **Soft deletes:** Core entity tables use `deleted_at` timestamps — records are never hard-deleted
- **Custom fields:** Stored in `metadata` jsonb columns on each core entity, defined in `custom_field_definitions`
- **Picklists:** Standard field values (status, type, etc.) reference `picklist_definitions`, configurable per org
- **Audit logging:** Every create, update, soft_delete, and restore is recorded in `audit_log` with old/new values and change source

## Database Schema
- Full schema documentation: `docs/database-schema-v2.md`
- **Database change log: `docs/database-log.md`** — Every DB change is tracked here. Always update this file after any migration or DB modification.

## Tables (12)
**Core Entities:** organizations, users, portfolios, properties, spaces, tenants, leases
**Configuration:** picklist_definitions, custom_field_definitions
**Tracking:** audit_log, data_imports, scores

## Entity Hierarchy
```
organizations → portfolios → properties → spaces
organizations → tenants
tenants + spaces/properties → leases (many-to-many via leases)
```

## API Layer

**Framework:** Next.js 15 App Router with TypeScript
**Run:** `npm run dev` (from repo root)
**Base URL:** `/api/v1`

### Architecture
- `app/api/v1/` — Route Handlers (REST endpoints)
- `lib/supabase.ts` — Server-side Supabase client (service_role key, bypasses RLS)
- `lib/auth.ts` — Auth middleware (dev mode: hardcoded admin user; production: Supabase Auth)
- `lib/errors.ts` — Consistent error codes and response format
- `lib/response.ts` — Standard response envelopes (single item, paginated list)
- `lib/audit.ts` — Audit logging utilities (create, update, soft-delete)
- `lib/validation.ts` — Zod parsing helpers for body and query params
- `lib/schemas/` — Zod schemas per entity (validation + OpenAPI generation)
- `lib/openapi.ts` — OpenAPI 3.1 spec generator (Zod-to-OpenAPI registry, all routes registered)

### API Patterns
Every endpoint follows these patterns:
1. **Auth:** `getAuthContext(request)` extracts user identity (userId, orgId, role)
2. **Authorization:** `requireRole(auth, 'manager')` enforces role hierarchy (viewer < manager < admin)
3. **Org scoping:** Every query includes `.eq('org_id', auth.orgId)` as a safety net on top of RLS
4. **Validation:** Request bodies parsed through Zod schemas with clear field-level error messages
5. **Audit logging:** Every mutation writes to audit_log with old/new values, changed_by, and change_source
6. **Change source:** Clients send `X-Change-Source` header (ui, api, mcp, desktop, csv_import, etc.)
7. **Soft deletes:** DELETE sets `deleted_at`, GET excludes deleted by default, `?include_deleted=true` to see them
8. **Response format:** `{ data, meta: { timestamp, request_id } }` for items, `{ data, meta: { total, limit, offset } }` for lists
9. **AI-forward:** Responses include resolved names (e.g., `portfolio_name`, `tenant_name`) alongside foreign key IDs

### Endpoints

**Properties** — `lib/schemas/properties.ts`
- `GET /api/v1/properties` — List (filter: portfolio_id, property_type, city, state; sort; paginated)
- `GET /api/v1/properties/:id` — Detail (includes spaces, leases with tenant/space names)
- `POST /api/v1/properties` — Create (validates portfolio in org, audits)
- `PATCH /api/v1/properties/:id` — Update (field-level audit)
- `DELETE /api/v1/properties/:id` — Soft delete (admin only)

**Portfolios** — `lib/schemas/portfolios.ts`
- `GET /api/v1/portfolios` — List (sortable, paginated)
- `GET /api/v1/portfolios/:id` — Detail (includes property summary)
- `POST /api/v1/portfolios` — Create
- `PATCH /api/v1/portfolios/:id` — Update
- `DELETE /api/v1/portfolios/:id` — Soft delete (admin only)

**Tenants** — `lib/schemas/tenants.ts`
- `GET /api/v1/tenants` — List (filter: industry, credit_rating, parent_tenant_id, search; enriched with parent_tenant_name)
- `GET /api/v1/tenants/:id` — Detail (includes subsidiaries, leases with property/space names)
- `POST /api/v1/tenants` — Create (validates parent_tenant_id in org)
- `PATCH /api/v1/tenants/:id` — Update (prevents self-reference as parent)
- `DELETE /api/v1/tenants/:id` — Soft delete (admin only)

**Spaces** — `lib/schemas/spaces.ts`
- `GET /api/v1/spaces` — List (filter: property_id, status, space_type; enriched with property_name)
- `GET /api/v1/spaces/:id` — Detail (includes property info, leases with tenant names)
- `POST /api/v1/spaces` — Create (validates property in org)
- `PATCH /api/v1/spaces/:id` — Update
- `DELETE /api/v1/spaces/:id` — Soft delete (admin only)

**Leases** — `lib/schemas/leases.ts`
- `GET /api/v1/leases` — List (filter: tenant_id, property_id, space_id, status, lease_type; enriched with tenant/property/space names)
- `GET /api/v1/leases/:id` — Detail (includes full tenant, property, and space objects)
- `POST /api/v1/leases` — Create (cross-validates: tenant + property in org, space belongs to property, end >= start; auto-calculates annual_rent)
- `PATCH /api/v1/leases/:id` — Update (re-validates references if changed, checks date consistency)
- `DELETE /api/v1/leases/:id` — Soft delete (admin only)

**Users** — `lib/schemas/users.ts`
- `GET /api/v1/users` — List (filter: role, search by name/email)
- `GET /api/v1/users/:id` — Detail
- `POST /api/v1/users` — Create (admin only, handles duplicate email conflict)
- `PATCH /api/v1/users/:id` — Update (admin only)
- `DELETE /api/v1/users/:id` — Soft delete (admin only, prevents self-deletion)

**Picklists** — `lib/schemas/picklists.ts`
- `GET /api/v1/picklists` — List (filter: entity_type, field_name; includes org-specific + system defaults with `scope` label)
- `GET /api/v1/picklists/:id` — Detail
- `POST /api/v1/picklists` — Create (org-specific only)
- `PATCH /api/v1/picklists/:id` — Update (blocks system picklist modifications)

**Custom Fields** — `lib/schemas/custom-fields.ts`
- `GET /api/v1/custom-fields` — List (filter: entity_type, field_type)
- `GET /api/v1/custom-fields/:id` — Detail
- `POST /api/v1/custom-fields` — Create (field_name must be snake_case, handles unique constraint)
- `PATCH /api/v1/custom-fields/:id` — Update

**Audit Log** — `lib/schemas/audit-log.ts`
- `GET /api/v1/audit-log` — Read-only query (filter: entity_type, entity_id, field_name, action, changed_by, change_source, since/until; enriched with changed_by_name)

**System & Docs**
- `GET /api/v1/health` — Health check
- `GET /api/v1/schema` — Full data model discovery (entities, fields, relationships, picklist values, custom fields, conventions)
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec (auto-generated from Zod schemas)
- `GET /api/v1/docs` — Interactive API documentation (Scalar viewer)

### Error Format
```json
{
  "error": {
    "code": "VALIDATION_ERROR | NOT_FOUND | UNAUTHORIZED | FORBIDDEN | CONFLICT | INTERNAL_ERROR",
    "message": "Human-readable description",
    "details": [{ "field": "name", "message": "Required" }],
    "request_id": "req_abc123"
  }
}
```

## Legacy Dashboard (v1)

**Location:** `dashboard-v1/` — run with `cd dashboard-v1 && npm run dev`
Connects directly to Supabase via service_role key. Being replaced by the Next.js app.

### Deployment
- Vercel config: `vercel.json` at repo root (now configured for Next.js)
- Auto-deploys on push to `main`
