# Real Estate Platform

## Tech Stack
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth (email+password, Google OAuth, Microsoft OAuth)
- **API:** Next.js 15 (App Router) + TypeScript — Route Handlers at `/api/v1/`
- **Validation:** Zod schemas (also powers OpenAPI 3.1 spec generation)
- **Auth UI:** `@supabase/auth-ui-react` + `@supabase/ssr` for session management
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

## Tables (13)
**Core Entities:** organizations, users, portfolios, properties, spaces, tenants, leases
**Auth:** invitations
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
- `lib/supabase.ts` — Server-side Supabase admin client (service_role key, bypasses RLS)
- `lib/supabase-browser.ts` — Browser Supabase client (anon key, for auth UI)
- `lib/supabase-server.ts` — Server Supabase client with cookie support (for SSR auth)
- `lib/auth.ts` — Auth middleware (Supabase Auth JWT verification via Bearer token or cookies)
- `lib/errors.ts` — Consistent error codes and response format
- `lib/response.ts` — Standard response envelopes (single item, paginated list)
- `lib/audit.ts` — Audit logging utilities (create, update, soft-delete)
- `lib/validation.ts` — Zod parsing helpers for body and query params
- `lib/schemas/` — Zod schemas per entity (validation + OpenAPI generation)
- `lib/openapi.ts` — OpenAPI 3.1 spec generator (Zod-to-OpenAPI registry, all routes registered)
- `middleware.ts` — Next.js middleware for route protection (login redirect, onboarding redirect, session refresh)

### Authentication
- **JWT-based:** `getAuthContext(request)` verifies Supabase JWT from `Authorization: Bearer <token>` header or session cookies
- **`getBasicAuthContext(request)`** — for pre-org endpoints (e.g., create-org during onboarding)
- **JWT app_metadata:** Contains `org_id` and `role` — no DB lookup needed per request
- **Three Supabase clients:** admin (service_role, bypasses RLS), server (anon, cookies), browser (anon, client-side)
- **Env vars:** `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server), `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (browser)

### API Patterns
Every endpoint follows these patterns:
1. **Auth:** `await getAuthContext(request)` extracts user identity (userId, orgId, role)
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

**Auth & Onboarding** — `lib/schemas/auth.ts`
- `POST /api/v1/auth/create-org` — Create org + user (onboarding, pre-org users only)
- `GET /api/v1/invitations` — List org invitations (admin/manager)
- `POST /api/v1/invitations` — Create invitation (admin only, generates token + invite URL)
- `GET /api/v1/invitations/lookup?token=xxx` — Public invitation lookup (for signup page)
- `PATCH /api/v1/invitations/:id/resend` — Regenerate token + extend expiry (admin only)
- `PATCH /api/v1/invitations/:id/revoke` — Revoke pending invitation (admin only)
- `PATCH /api/v1/users/:id/role` — Change user role (admin only, prevents last-admin demotion)
- `POST /api/v1/users/:id/deactivate` — Soft-delete user (admin only, prevents self-deactivation)
- `POST /api/v1/users/:id/reactivate` — Restore soft-deleted user (admin only)

**System & Docs**
- `GET /api/v1/health` — Health check
- `GET /api/v1/schema` — Full data model discovery (entities, fields, relationships, picklist values, custom fields, conventions)
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec (auto-generated from Zod schemas)
- `GET /api/v1/docs` — Interactive API documentation (Scalar viewer)

### Auth Pages
- `/login` — Supabase Auth UI (email+password, Google, Microsoft)
- `/signup` — Same auth UI with invitation token support
- `/onboarding` — Create organization form (authenticated, no org)
- `/auth/callback` — OAuth redirect handler
- `/settings/team` — Team management (users, invitations, roles)

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

## Dashboard & Frontend Pages

**Framework:** Next.js 15 App Router (same project as API)
**Data fetching:** Authenticated API calls via `useDashboardData()` hook (`lib/use-dashboard-data.ts`)

### Pages
- `/` — Main dashboard (Analytics / Data tabs, summary cards, navigation)
- `/property/[id]` — Property detail (spaces, active leases, lease history)
- `/tenant/[id]` — Tenant detail (parent/subsidiary, portfolio footprint, leases)
- `/settings/team` — Team management (users, invitations, roles)
- `/login`, `/signup`, `/onboarding`, `/auth/callback` — Auth flow

### Dashboard Components (`components/dashboard/`)
- `SummaryCards.tsx` — 5 KPI cards (portfolio value, revenue, occupancy, vacancies, avg lease term)
- `LeaseExpirationChart.tsx` — Recharts ComposedChart (24-month risk tiers)
- `RevenueConcentration.tsx` — Recharts PieChart donut + HHI concentration index
- `RentRollProjection.tsx` — Recharts AreaChart (18-month revenue projection)
- `PropertyMap.tsx` — Leaflet map with brass markers (loaded with `dynamic()`, SSR disabled)
- `PropertiesTable.tsx` — Sortable properties table with occupancy bars
- `TenantOverview.tsx` — Tenant table with parent/subsidiary grouping
- `LeaseTimeline.tsx` — Filterable lease timeline with category filters
- `VacancyView.tsx` — Vacant spaces grouped by property

### Key Patterns
- `useDashboardData()` — shared hook for auth + data fetching, used by all 3 main pages
- Leaflet requires `dynamic(() => import(...), { ssr: false })` for SSR safety
- react-leaflet pinned to v4 (v5 requires React 19)
- All data comes through `/api/v1/` routes (not direct Supabase queries)

## Legacy Dashboard (v1)

**Location:** `dashboard-v1/` — run with `cd dashboard-v1 && npm run dev`
Connects directly to Supabase via service_role key. **Superseded** by the Next.js dashboard above. Preserved for reference but no longer deployed.

### Deployment
- Vercel config: `vercel.json` at repo root (now configured for Next.js)
- Auto-deploys on push to `main`
