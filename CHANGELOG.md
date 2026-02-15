# Changelog

All notable changes to this project will be documented in this file.

---

## [2026-02-15] — API Key Management & MCP Enablement

### Added
- **`api_keys` table** (migration `00008_api_keys.sql`) — SHA-256 hashed key storage with mandatory expiration (max 1 year), role-based permissions, soft revocation, and last-used tracking (IP + timestamp)
- **API key authentication** — Third auth path in `getAuthContext()`: detects `sk_live_` prefix, hashes → looks up → verifies expiry/revocation → returns AuthContext. Works on all existing endpoints with zero endpoint changes.
- **6 new API endpoints** (admin only):
  - `GET /api/v1/api-keys` — List keys (excludes revoked by default)
  - `POST /api/v1/api-keys` — Create key (returns plaintext once)
  - `GET /api/v1/api-keys/:id` — Get key details
  - `PATCH /api/v1/api-keys/:id` — Update name/description
  - `DELETE /api/v1/api-keys/:id` — Revoke key (immediate, soft)
  - `POST /api/v1/api-keys/:id/rotate` — Rotate (revoke old + create new)
- **Settings UI** at `/settings/api-keys` — Create, rotate, revoke keys with one-time plaintext display, copy-to-clipboard, expiration warnings, and status badges
- **Navigation links** — API Keys in dashboard header nav + Team settings page
- **OpenAPI spec** — `apiKeyAuth` security scheme, 6 endpoint definitions, updated auth documentation covering both JWT and API key methods
- **New utility module** `lib/api-keys.ts` — generateApiKey(), hashApiKey(), extractKeyPrefix(), validateApiKey()
- **Zod schemas** `lib/schemas/api-keys.ts` — Create, update, and list query schemas
- **Full audit logging** — All key operations (create, update, revoke, rotate) logged to audit_log; never logs plaintext keys

### Security
- Keys are `sk_live_` + 32 hex chars (128 bits entropy), SHA-256 hashed before storage
- Plaintext shown exactly once at creation, never retrievable again
- Mandatory expiration with max 365 days
- `last_used_at` and `last_used_ip` updated on every API call (fire-and-forget)
- RLS policies on api_keys table, org-scoped like all other tables

### MCP Enablement
- API keys provide the authentication mechanism for MCP servers
- MCP server authenticates with `Authorization: Bearer sk_live_...` and `X-Change-Source: mcp`
- No additional endpoints needed — existing API + schema discovery + OpenAPI spec are sufficient

---

## [2026-02-15] — OpenAPI Documentation: Auth Endpoints & Security Scheme

### Added
- **Security scheme definition:** Registered `bearerAuth` component in OpenAPI spec with type `http`, scheme `bearer`, format `JWT`, and description of how to obtain and refresh tokens.
- **9 auth/user-management endpoints** now documented in OpenAPI spec:
  - `POST /api/v1/auth/create-org` — Onboarding (create organization)
  - `GET /api/v1/invitations` — List org invitations
  - `POST /api/v1/invitations` — Create invitation
  - `GET /api/v1/invitations/lookup` — Public invitation lookup by token
  - `PATCH /api/v1/invitations/{id}/resend` — Resend invitation with new token
  - `PATCH /api/v1/invitations/{id}/revoke` — Revoke pending invitation
  - `PATCH /api/v1/users/{id}/role` — Change user role
  - `POST /api/v1/users/{id}/deactivate` — Soft-delete user
  - `POST /api/v1/users/{id}/reactivate` — Restore deactivated user
- **Invitation and Organization schemas** registered for proper response documentation
- **Comprehensive API description** with authentication guide, role hierarchy table, and conventions (multi-tenant, soft deletes, enriched responses, audit logging, pagination)
- **Public endpoint markers:** Health, invitation lookup endpoints marked with `security: []` to indicate no auth required

### Fixed
- **Invalid OpenAPI spec:** Previously referenced `bearerAuth` security scheme without defining it in `components.securitySchemes`. Spec is now valid OpenAPI 3.1.

---

## [2026-02-15] — Security Hardening: API Data Exposure Fixes

### Fixed
- **Invitation token exposure (CRITICAL):** All 4 invitation endpoints (`GET /invitations`, `POST /invitations`, `PATCH .../resend`, `PATCH .../revoke`) now use explicit field lists that exclude the raw `token` column. Tokens are only exposed via the `invite_url` on create/resend.
- **Legacy dashboard service_role key (CRITICAL):** `dashboard-v1/.env` was using the Supabase `service_role` key (which bypasses all RLS) as `VITE_SUPABASE_KEY`. Replaced with the `anon` key.
- **Open redirect in OAuth callback (MAJOR):** `app/auth/callback/route.ts` now validates the `next` query param to ensure it starts with `/` and is not `//`, preventing redirect to external sites after OAuth.
- **Bare `.select()` on user endpoints (HIGH):** `PATCH /users/:id/role`, `POST /users/:id/deactivate`, and `POST /users/:id/reactivate` now use explicit field lists (`id, org_id, email, full_name, role, created_at`) instead of bare `.select()` which returned all columns including `auth_provider`, `last_login_at`, `avatar_url`.
- **Bare `.select()` / `SELECT *` on tenant endpoints (HIGH):** `GET /tenants` list, `POST /tenants`, and `PATCH /tenants/:id` now use explicit field lists instead of `select('*')` or bare `.select()`.

### Changed
- **`GET /api/v1/users` now requires `manager` role:** Previously any authenticated user (including viewers) could enumerate all org members, emails, and roles.
- **`GET /api/v1/schema` now requires `manager` role:** Previously any authenticated user could see the full data model, relationships, custom fields, and picklist values. Now restricted to managers+ (keeps MCP/AI agent access while limiting viewer exposure).

### Design Decisions
- **Explicit field lists over SELECT *:** All security-sensitive endpoints now enumerate returned columns explicitly. This prevents future column additions from auto-leaking in responses and documents the API contract clearly.
- **Manager role for schema endpoint (not admin):** Schema discovery is critical for MCP/AI agents which typically authenticate as manager. Admin-only would break this use case.
- See ADR-019 for full rationale.

---

## [2026-02-15] — Dashboard Port: Analytics & Detail Pages in Next.js

### Added
- **Shared data hook** (`lib/use-dashboard-data.ts`):
  - Authenticated data fetching via API (Bearer token from Supabase session)
  - Fetches properties, spaces, tenants, leases, portfolios in parallel
  - Handles unauthenticated (redirect to `/login`) and no-org (redirect to `/onboarding`) states
  - Exports `PortfolioData` and `UserInfo` TypeScript interfaces
  - Used by all three pages (dashboard, property detail, tenant detail)
- **9 dashboard components** (`components/dashboard/`):
  - `SummaryCards.tsx` — 5 KPI cards (portfolio value, revenue, occupancy, vacancies, avg lease term)
  - `PropertiesTable.tsx` — Sortable properties table with occupancy bars, Next.js links
  - `TenantOverview.tsx` — Tenant table with parent/subsidiary grouping, credit badges
  - `LeaseTimeline.tsx` — Filterable lease timeline with status bars and category filters
  - `VacancyView.tsx` — Vacant spaces grouped by property with negotiation details
  - `LeaseExpirationChart.tsx` — Recharts ComposedChart (stacked bars by risk tier + lease count line)
  - `RevenueConcentration.tsx` — Recharts PieChart donut + HHI concentration index
  - `RentRollProjection.tsx` — Recharts AreaChart with contracted/escalated/floor revenue lines
  - `PropertyMap.tsx` — Leaflet map with custom brass SVG markers and themed popups
- **Property detail page** (`app/property/[id]/page.tsx`):
  - Spaces table, active leases, lease history, summary cards
  - Cross-links to tenant detail pages
- **Tenant detail page** (`app/tenant/[id]/page.tsx`):
  - Parent/subsidiary info, portfolio footprint, leases table
  - Cross-links to property detail pages
- **New dependencies:** `recharts`, `leaflet`, `react-leaflet@4`, `@types/leaflet`

### Changed
- **`app/page.tsx`** — Rewritten from simple stats page to full analytics dashboard:
  - Tab navigation (Analytics / Data) matching dashboard-v1 layout
  - Analytics tab: lease expiration risk, tenant diversification, revenue forecast, portfolio map
  - Data tab: properties table, tenants overview, lease timeline, vacancies
  - Top nav with org name, user info, Team/API Docs links, logout
  - PropertyMap loaded with `dynamic(() => import(...), { ssr: false })` for SSR safety
- **`app/globals.css`** — Added Leaflet popup CSS overrides for dark theme

### Design Decisions
- **API-based data fetching (not direct Supabase):** Dashboard fetches via authenticated API routes, maintaining the three-layer security model (RLS → API → UI)
- **Shared `useDashboardData()` hook:** All pages share one hook to avoid code duplication. Fetches all entities once, filters client-side for detail pages
- **react-leaflet v4 (not v5):** v5 requires React 19; project uses React 18
- **SSR-safe map loading:** Leaflet requires `window`, so PropertyMap uses Next.js `dynamic()` with `ssr: false`
- **Minimal TypeScript conversion:** Components use `any` for data objects to keep the port simple; type safety is enforced at the API boundary via Zod schemas

---

## [2026-02-15] — Phase 2: Authentication & Multi-Tenant Access Control

### Added
- **Real Supabase Auth** replacing dev-mode auth shim (email+password, Google OAuth, Microsoft OAuth)
- **Database migration 00007:** `invitations` table (13th table), auth columns on `users` (auth_provider, last_login_at, avatar_url) and `organizations` (created_by, allowed_email_domains)
- **Auth trigger** (`public.handle_new_user()`) on `auth.users` INSERT — auto-joins invited users, sets JWT app_metadata
- **Updated `user_org_id()`** — reads org_id from JWT claims first (fast path), falls back to DB lookup
- **Supabase client setup:**
  - `lib/supabase-browser.ts` — browser client (anon key, for auth UI)
  - `lib/supabase-server.ts` — server client with cookie support (for SSR auth)
  - Existing `lib/supabase.ts` (service_role) unchanged
- **Auth middleware** (`lib/auth.ts`):
  - `getAuthContext()` — now async, verifies JWT via Bearer header or session cookies
  - `getBasicAuthContext()` — for pre-org users (onboarding)
  - `requireRole()` — unchanged
- **Next.js middleware** (`middleware.ts`) — route protection:
  - Unauthenticated → redirect to `/login`
  - Authenticated without org → redirect to `/onboarding`
  - Authenticated with org → allow through
  - Session token refresh on every request
- **Auth pages:**
  - `/login` — Supabase Auth UI with Google/Microsoft buttons, Obsidian & Brass theme
  - `/signup` — with invitation token support (shows org name and role)
  - `/onboarding` — create organization form (name, type, industry)
  - `/auth/callback` — OAuth redirect handler
- **Auth API routes (8 new endpoints):**
  - `POST /api/v1/auth/create-org` — create org + user record (onboarding)
  - `GET /api/v1/invitations` — list org invitations (admin/manager)
  - `POST /api/v1/invitations` — create invitation (admin only)
  - `GET /api/v1/invitations/lookup?token=xxx` — public invitation lookup (for signup page)
  - `PATCH /api/v1/invitations/:id/resend` — regenerate token + extend expiry (admin only)
  - `PATCH /api/v1/invitations/:id/revoke` — revoke invitation (admin only)
  - `PATCH /api/v1/users/:id/role` — change user role (admin only, prevents last-admin demotion)
  - `POST /api/v1/users/:id/deactivate` — soft-delete user (admin only)
  - `POST /api/v1/users/:id/reactivate` — restore soft-deleted user (admin only)
- **Team management page** (`/settings/team`):
  - Active users table with role dropdown (admin) and deactivate button
  - Pending invitations with resend/revoke actions
  - Deactivated users with reactivate button
  - Invite user modal (email + role)
- **Dashboard** (`/`) — authenticated landing page:
  - Header with org name, user info, logout button, navigation links
  - Stats cards (properties, spaces, tenants, leases counts)
  - Quick action links to API docs, team settings
- **Test user seed script** (`supabase/seed-auth-users.sql`):
  - `thomas.greg.toler@gmail.com` — admin for Apex Capital Partners (existing test data)
  - `test-viewer@example.com` — no org (proves multi-tenant isolation)
- **Zod schemas** for auth routes (`lib/schemas/auth.ts`)
- **New packages:** `@supabase/ssr`, `@supabase/auth-ui-react`, `@supabase/auth-ui-shared`

### Changed
- `lib/auth.ts` — `getAuthContext()` is now async (all 38 callers across 18 route files updated)
- `lib/supabase.ts` — unchanged but now supplemented by browser and server auth clients
- `.env.local` — added `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Design Decisions
- **JWT app_metadata for auth context:** Avoids DB lookup on every request — org_id and role travel in the JWT
- **Same UUID for auth.users and public.users:** Simplifies joins, RLS, and foreign keys
- **Trigger-based invitation flow:** Auto-joins users on signup, no separate "accept" step
- **Three-layer RBAC:** Database RLS → API middleware → UI — defense in depth
- **Pre-org state:** Users without an org are routed to onboarding, not blocked

---

## [2026-02-15] — Phase 1: API Layer & Application Foundation

### Added
- **Next.js 15 App Router** at repo root — TypeScript, Tailwind (ported Obsidian & Brass theme)
- **23 REST API routes** at `/api/v1/` covering all entities:
  - **Properties** — full CRUD with portfolio validation, enriched detail (spaces + leases with tenant/space names)
  - **Portfolios** — full CRUD, detail includes property summary
  - **Tenants** — full CRUD with parent/subsidiary validation, search filter, subsidiary enrichment
  - **Spaces** — full CRUD with property validation, enriched with property_name
  - **Leases** — full CRUD with cross-entity validation (tenant + property in same org, space belongs to property, date consistency), auto-calculates annual_rent
  - **Users** — full CRUD (admin only for mutations), duplicate email conflict handling, self-deletion prevention
  - **Picklists** — list (org + system defaults with scope label), create (org-specific), update (blocks system picklist edits)
  - **Custom Fields** — list, create (snake_case field_name validation), update
  - **Audit Log** — read-only query with rich filtering (entity_type, entity_id, field_name, action, changed_by, change_source, date range), enriched with changed_by_name
  - **Schema Discovery** — full data model, relationships, picklist values, custom fields, conventions (designed for AI consumption)
  - **Health Check** — status endpoint
- **Shared API patterns** (`lib/`):
  - `auth.ts` — dev-mode auth (hardcoded Sarah Chen admin), role hierarchy enforcement
  - `errors.ts` — consistent error codes (VALIDATION_ERROR, NOT_FOUND, UNAUTHORIZED, FORBIDDEN, CONFLICT, INTERNAL_ERROR)
  - `response.ts` — standard response envelopes with request_id tracking
  - `audit.ts` — per-field diff audit logging with change_source via `X-Change-Source` header
  - `validation.ts` — Zod parsing for request bodies and query params, pagination schema
  - `supabase.ts` — lazy-initialized server-side client (service_role key, bypasses RLS)
- **Zod schemas** (`lib/schemas/`) for all entities — validation + OpenAPI generation
- **OpenAPI 3.1 spec** auto-generated from Zod schemas (`/api/v1/openapi.json`)
- **Interactive API docs** via Scalar viewer (`/api/v1/docs`)
- **OpenAPI registry** (`lib/openapi.ts`) with all schemas and routes registered
- **Database migrations:**
  - `00005_add_created_updated_by.sql` — added created_by/updated_by columns to 5 core entity tables with backfill from audit_log
  - `00006_updated_at_triggers.sql` — BEFORE UPDATE triggers on 6 tables to auto-set updated_at
- Vercel deployment configured for Next.js (env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`)

### Changed
- Renamed `dashboard/` → `dashboard-v1/` (legacy Vite dashboard preserved, no longer deployed)
- `vercel.json` updated from Vite SPA rewrite to Next.js framework config
- `.gitignore` updated for Next.js (`.next/`, `out/`, `next-env.d.ts`, `.vite/`)

### Design Decisions
- **Next.js App Router over separate API server:** Keeps API and future frontend in one deployable unit, leverages Vercel's edge infrastructure, avoids managing a separate server process
- **API-level audit logging (not DB triggers):** Gives richer context — the API knows the user identity, change source, and can compute per-field diffs. DB triggers would only see the raw SQL and miss this context
- **Dev-mode auth with hardcoded user:** Unblocks all API development without auth infrastructure. Auth context interface is already defined so swapping to real Supabase Auth is a drop-in replacement
- **Lazy Supabase client:** Client initializes on first request, not at module load time — prevents build failures when env vars aren't available during Vercel's build step

---

## [2026-02-15] — Portfolio Analytics Visualizations

### Added
- **Lease Expiration Risk Chart** (`LeaseExpirationChart.jsx`):
  - Stacked bar chart showing monthly rent exposure by tenant credit risk tier for the next 24 months
  - Three risk tiers: Low (excellent/good credit — green), Moderate (fair — amber), High (poor/unrated — red)
  - Brass line overlay showing lease count per month on a secondary Y-axis
  - Property scope toggle dropdown to filter to a single property or view all
  - Rich hover tooltips: month, total $ expiring, per-tier breakdown ($ and count), tenant names
  - Uses Recharts ComposedChart (Bar + Line)
- **Revenue Concentration Chart** (`RevenueConcentration.jsx`):
  - Donut chart showing top 5 tenants by monthly rent with "All Others" slice
  - Key metrics panel: largest tenant name and % share, number of tenants representing 50% of revenue
  - HHI (Herfindahl-Hirschman Index) concentration score with visual bar and Diversified/Moderate/Concentrated label
  - Center label showing total monthly revenue
  - Hover tooltips with tenant name, rent, share %, and active lease count
- **Rent Roll Projection Chart** (`RentRollProjection.jsx`):
  - Line chart projecting revenue over 18 months with three lines:
    - Contracted revenue (base rent, drops as leases expire)
    - With escalations (applies annual rent_escalation at lease anniversaries)
    - Guaranteed floor (only leases extending beyond the 18-month horizon)
  - Shaded amber area between contracted and floor highlighting revenue at risk
  - Revenue at Risk callout in the header
  - Summary metrics row: today's revenue, 18-month contracted endpoint, guaranteed floor as % of current
  - Hover tooltips with revenue per line, delta from today, and active lease count
- Installed `recharts` library for all chart rendering (native React components, SVG-based)

### Design Decisions
- **Recharts over Chart.js:** Recharts uses native React components and SVG rendering, which integrates naturally with the existing React architecture. Chart.js wraps a canvas element and requires refs/effects — more friction for a React app. Recharts also makes custom tooltips trivial (just JSX components).
- **Charts placed between Summary Cards and Portfolio Map:** The three analytics charts answer strategic questions (exposure, concentration, trajectory) that should be seen before diving into the property-level detail tables below. This puts the "executive summary" flow at the top: KPIs → risk analysis → operational detail.
- **HHI index on Revenue Concentration:** Added because it's the standard measure for portfolio concentration used in finance and antitrust analysis. Thresholds (1500/2500) follow DOJ/FTC guidelines adapted for tenant concentration.

---

## [2026-02-15] — Portfolio Map & Dynamic Data

### Added
- Interactive dark-themed map on dashboard using Leaflet + react-leaflet (CartoDB dark matter tiles)
- Custom brass SVG markers for each property location
- Popup on marker click showing property name, city, type badge, occupancy %, monthly rent, and "View Property" button
- Clicking property name or button in popup navigates to property detail page
- Leaflet popup CSS overrides to match Obsidian & Brass theme
- Fetch `organizations` and `portfolios` tables in App.jsx (now 6 tables total)

### Changed
- Organization name in dashboard header and all page footers now pulled dynamically from `organizations` table (was hardcoded "Apex Capital Partners")
- Dashboard subtitle now pulled dynamically from `portfolios` table (was hardcoded "Southeast Commercial Portfolio Overview")
- Removed hardcoded REIT badge from dashboard header

---

## [2026-02-14] — Property & Tenant Detail Pages

### Added
- React Router (`react-router-dom`) for client-side routing
- **Property Detail page** (`/property/:id`):
  - Property header with name, full address, type badge, sqft, year built, acquisition date/price, current value with appreciation %
  - Summary cards: total spaces, occupied/vacant count, occupancy rate with progress bar, monthly and annual rent
  - Spaces table with floor, sqft, type, status (color-coded occupied/vacant), current tenant, monthly rent, lease expiration
  - Vacant spaces with "Negotiating" badge and prospective tenant when applicable
  - Active leases table with tenant, space, lease type, dates, rent, escalation %, time remaining
  - Lease history section (expired leases, grayed out)
  - Leases expiring within 6 months highlighted in amber/warning
- **Tenant Detail page** (`/tenant/:id`):
  - Tenant header with company name, industry badge, credit rating badge (color-coded), website link, contact info
  - Parent/subsidiary relationship display with navigation links
  - Portfolio footprint summary cards: active leases, properties, total sqft, monthly and annual rent
  - Active leases table with property (clickable), space, lease type, dates, rent, escalation %, time remaining
  - Lease history section (expired leases, grayed out)
- All property names across dashboard now link to property detail page
- All tenant names across dashboard now link to tenant detail page
- Cross-navigation between property and tenant detail pages
- Back-to-dashboard navigation on detail pages
- SPA rewrite rule in `vercel.json` for production routing

### Changed
- Extracted dashboard content from `App.jsx` into `pages/Dashboard.jsx`
- `App.jsx` now handles routing (data fetching + `<Routes>`)
- `main.jsx` wrapped with `<BrowserRouter>`
- `PropertiesTable` — property names are now `<Link>` to `/property/:id`
- `TenantOverview` — company names are now `<Link>` to `/tenant/:id`
- `LeaseTimeline` — tenant and property names are now clickable links
- `VacancyView` — property headers and negotiating tenant names are now clickable links

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
