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

---

## ADR-016: Supabase Auth with JWT App Metadata

**Date:** 2026-02-15
**Status:** Accepted (replaces ADR-014 dev-mode auth)

### Context
Phase 1 used a hardcoded dev-mode auth shim (Sarah Chen admin). Phase 2 replaces this with real Supabase Auth supporting email+password, Google OAuth, and Microsoft OAuth.

### Decision
- Use Supabase Auth for user authentication with email+password, Google, and Microsoft providers
- Store `org_id` and `role` in JWT `app_metadata` so every request carries its authorization context
- Match `auth.users.id = public.users.id` (same UUID) for simple joins and RLS
- Auth trigger on `auth.users` INSERT handles invitation-based auto-joining
- Users without an org go through onboarding flow (create org → become admin)
- `@supabase/ssr` for cookie-based session management in Next.js
- `@supabase/auth-ui-react` for pre-built login/signup forms with OAuth buttons

### Rationale
- **JWT claims over DB lookups:** `app_metadata` in the JWT means every API request carries org_id and role without a database query. The `user_org_id()` RLS function reads from JWT first.
- **Same UUID approach:** Avoids a mapping table between auth and app users. Foreign keys to `users.id` work for both auth identity and app identity.
- **Trigger-based invitation flow:** When a user signs up and has a pending invitation, the DB trigger automatically creates their app user record and sets their JWT claims. No multi-step client flow needed.
- **Three-layer RBAC:** Database RLS (last defense), API middleware (clear errors), UI (cosmetic) — defense in depth.

---

## ADR-017: Invitations for Multi-Tenant User Onboarding

**Date:** 2026-02-15
**Status:** Accepted

### Context
Users need a way to join existing organizations. Without an invitation system, new signups would always create a new org, making team collaboration impossible.

### Decision
Token-based invitations stored in the `invitations` table. Admins create invitations via API. The token is embedded in a signup URL. A database trigger on `auth.users` INSERT checks for matching invitations and auto-joins the user.

### Rationale
- **Token-based over link-only:** Tokens are cryptographically random, verifiable, and revocable. They can be sent via email, Slack, or any channel.
- **Auto-join via trigger:** Eliminates a separate "accept invitation" step after signup. The user signs up → trigger finds their invitation → they're in the org instantly.
- **Expiry and revocation:** 7-day default expiry prevents stale invitations. Admins can revoke at any time.
- **Race condition safety:** `FOR UPDATE` row lock on the invitation prevents duplicate acceptance if two signup requests happen simultaneously.

---

## ADR-018: Port Dashboard-v1 into Next.js App

**Date:** 2026-02-15
**Status:** Accepted

### Context
The legacy dashboard (`dashboard-v1/`) was a standalone Vite + React app that connected directly to Supabase via service_role key. With Phase 2 authentication in place, the main Next.js app now handles login, session management, and API routing. The dashboard needs to live inside the authenticated Next.js app, not as a separate deployment.

### Decision
Port all dashboard-v1 components (9 visualizations + 2 detail pages) into the Next.js app. Use a shared `useDashboardData()` hook that fetches data via the authenticated REST API. Convert JSX to TSX, replace `react-router-dom` with Next.js routing, and replace direct Supabase queries with API calls.

### Rationale
- **Single authenticated app:** Users log in once and get the full experience — dashboard, detail pages, team management, API docs — in one app
- **API-first data access:** Fetching via `/api/v1/` routes maintains the three-layer security model (RLS → API middleware → UI). Direct Supabase queries with service_role key would bypass auth entirely
- **Shared data hook:** `useDashboardData()` centralizes auth checks (redirect to login/onboarding), session management, and data fetching. All three pages (dashboard, property detail, tenant detail) use the same hook
- **react-leaflet v4:** The project uses React 18; react-leaflet v5 requires React 19. Pinned to v4 for compatibility
- **SSR safety:** Leaflet depends on `window`, which doesn't exist during server-side rendering. Used Next.js `dynamic()` import with `ssr: false` for the PropertyMap component
- **Minimal type conversion:** Used `any` for complex data objects to keep the port focused. Type safety is enforced at the API boundary via Zod schemas

### Notes
- Dashboard-v1 is preserved in `dashboard-v1/` but is no longer the deployed frontend
- ADR-010 (Vite dashboard) and ADR-011 (React Router) are now fully superseded for the production app

---

## ADR-019: API Security Hardening — Explicit Field Lists and Role Restrictions

**Date:** 2026-02-15
**Status:** Accepted

### Context
A security audit of the API layer revealed several data exposure issues:
1. Invitation tokens (security-sensitive) were returned in all invitation endpoint responses via `select('*')` and bare `.select()`
2. User endpoints returned extra columns (`auth_provider`, `last_login_at`, `avatar_url`) via bare `.select()`
3. The legacy dashboard `dashboard-v1/.env` contained the Supabase service_role key as a `VITE_` env var (exposed to browser)
4. OAuth callback had an open redirect vulnerability via unvalidated `next` parameter
5. `GET /users` and `GET /schema` had no role restrictions — viewers could enumerate all org members and the full data model

### Decision
- **Explicit field lists:** All security-sensitive endpoints now use explicit `.select('field1, field2, ...')` instead of `.select('*')` or bare `.select()`. This applies to all invitation, user auth, and tenant endpoints.
- **Token exclusion:** Invitation `token` is never returned in API responses. The token is only accessible via the `invite_url` returned on create/resend.
- **Role restrictions:** `GET /users` and `GET /schema` now require `manager` role minimum.
- **Open redirect fix:** OAuth callback validates `next` param is a relative path (starts with `/`, not `//`).
- **Legacy dashboard fix:** Replaced service_role key with anon key in `dashboard-v1/.env`.

### Rationale
- **Explicit over implicit:** `SELECT *` is convenient but dangerous — any column added to a table in the future will automatically appear in API responses. Explicit field lists make the API contract visible and prevent accidental data leaks.
- **Manager for schema (not admin):** MCP/AI agents authenticate as `manager` role. Restricting schema to admin-only would break AI-forward use cases. Manager provides a reasonable middle ground — it keeps sensitive structural information away from viewer-level users while enabling automation.
- **Manager for user list:** Viewing the full org member list (emails, roles) is an administrative function. Viewers interacting with the dashboard don't need to see other users.
- **Token security:** Invitation tokens are equivalent to single-use passwords. Exposing them in list/update responses means any admin/manager could see tokens intended for specific invitees, enabling impersonation.

---

## ADR-020: API Key Authentication for Integrations & MCP

**Date:** 2026-02-15
**Status:** Accepted

### Context
The platform needs programmatic API access for:
1. **Custom integrations** — Zapier, Google Sheets, internal scripts
2. **MCP servers** — AI agents accessing the API via the Model Context Protocol
3. **Third-party tools** — Any system that needs authenticated API access without interactive login

Supabase Auth JWTs expire after ~1 hour and require an interactive login flow (email/password or OAuth). This doesn't work for long-running integrations or server-to-server communication.

### Decision
Implement a dedicated `api_keys` table with SHA-256 hashed keys that authenticate through the existing `getAuthContext()` flow as a third authentication path alongside JWT and session cookies.

### Key Design Choices

**SHA-256 over bcrypt:** API keys have 128 bits of entropy (32 hex chars), unlike user passwords which have low entropy and need slow hashing. SHA-256 is appropriate and fast for high-entropy secrets.

**Creator identity for audit trail:** API key requests use the key creator's `userId` in the AuthContext. This means all mutations made via an API key are traceable to the admin who created it, providing accountability.

**Key-level role (not creator's role):** The API key has its own `role` field (viewer/manager/admin). This follows the principle of least privilege — an admin can create a viewer-only key for read-only integrations. The key's role is checked independently of the creator's current role.

**`sk_live_` prefix detection:** The auth middleware detects API keys by the `sk_` prefix in the Bearer token. This avoids attempting Supabase JWT verification on API keys (which would fail and add latency).

**Fire-and-forget usage tracking:** `last_used_at` and `last_used_ip` are updated asynchronously on every API call, providing SOC2-aligned monitoring without slowing down requests.

**Mandatory expiration (max 1 year):** All keys must expire. This prevents forgotten keys from providing indefinite access and aligns with SOC2 key rotation requirements.

**Soft revocation:** Revoking a key sets `revoked_at` and `revoked_by` rather than deleting the row. This preserves the audit trail — you can always see which keys existed, who created them, and when they were revoked.

### Alternatives Considered
- **OAuth 2.0 Client Credentials:** More complex, requires a separate token exchange flow. API keys are simpler and sufficient for current needs.
- **Supabase service_role key per integration:** Single key for everything, no per-integration permissions or revocation. Unacceptable for multi-tenant security.
- **Personal access tokens (PATs):** Tied to a user's session, expire with the user. API keys are org-scoped and persist beyond individual user deactivation.

---

## ADR-021: MCP Server Architecture — stdio Transport with API Key Auth

**Date:** 2026-02-15
**Status:** Accepted

### Context
The platform needs an MCP (Model Context Protocol) server so AI clients like Claude Desktop, Claude Code, Cursor, and Cline can interact with the real estate platform. Key decisions: transport mechanism, authentication method, hosting model, and tool granularity.

### Decision
Build a TypeScript MCP server using `@modelcontextprotocol/sdk` with stdio transport. The server runs locally on the user's machine as a child process spawned by the AI client. Authentication uses API keys (`sk_live_...`) via the existing `getAuthContext()` flow. Every request includes `X-Change-Source: mcp` for audit attribution.

### Key Design Choices

**stdio over HTTP/SSE transport:** stdio is the universal transport — every MCP client supports it. HTTP/SSE would require hosting the server and managing network security. stdio runs locally with no exposed ports, and the API key never leaves the user's machine (it's passed as an environment variable to the child process).

**API client wrapper (not direct Supabase):** The MCP server is a client of the REST API at `/api/v1/`, not a direct database client. This maintains the three-layer security model (RLS → API middleware → client), ensures all mutations go through validation and audit logging, and means the MCP server needs only an API key — no database credentials.

**One tool per endpoint (not aggregated):** Each API endpoint maps to a distinct MCP tool (e.g., `list_properties`, `get_property`, `create_property`). This gives AI clients maximum flexibility and makes tool descriptions self-documenting. Aggregated tools (e.g., a single `properties` tool with a `method` parameter) would reduce discoverability and make it harder for AI models to select the right action.

**Manager role recommended (not admin):** The MCP server's API key should use `manager` role for day-to-day operations. This follows the principle of least privilege — managers can read and write all entity data but cannot delete records or manage users. Admin-only tools (delete, user management, API key management) note the role requirement in their descriptions.

**MCP resources for context injection:** Key entities (properties, tenants, leases, schema) are also exposed as MCP resources. This lets AI clients pull in organizational context without explicit tool calls — useful for grounding conversations in the current portfolio state.

### Alternatives Considered
- **HTTP/SSE transport:** More complex deployment (needs a running server), but enables remote/shared access. Could be added later if needed.
- **Direct Supabase client:** Would bypass API validation, audit logging, and role enforcement. Rejected for security reasons.
- **Dynamic tool generation from OpenAPI spec:** Would auto-generate tools from the OpenAPI spec. More maintainable at scale but adds complexity and makes tool descriptions less precise. Manual registration chosen for 47 tools — still manageable and allows custom descriptions per tool.

---

## ADR-022: Frontend Navigation Shell with Route Groups

**Date:** 2026-02-15
**Status:** Accepted

### Context
The Next.js app had a flat page structure where each page (dashboard, property detail, tenant detail, settings) rendered its own navigation header, resulting in duplicated nav code and an inconsistent user experience. The app needed a persistent navigation shell with a sidebar, breadcrumbs, portfolio switching, and role-based settings navigation.

### Decision
Restructure the frontend into Next.js route groups — `(auth)` for unauthenticated pages (no navigation) and `(app)` for authenticated pages (full navigation shell). The shell consists of a CommandRail sidebar, a TopBar breadcrumb strip, and a Settings sub-layout with horizontal tab navigation.

### Key Design Choices

**Route groups over middleware-based layouts:** Next.js route groups (`(auth)`, `(app)`) are transparent to URLs and naturally map different layouts to different page sets. Middleware-based layout switching would be more complex and fragile.

**AuthProvider separate from useDashboardData:** The original `useDashboardData()` hook handled both auth state and data fetching. The shell needs user info (name, role, org) for navigation, but doesn't need portfolio data. `AuthProvider` extracts just auth state (session check, JWT claims, org name) so shell components render immediately without waiting for data fetches.

**Portfolio context via URL parameter:** Portfolio selection is encoded as `?portfolio={id}` in the URL rather than React state or a cookie. This makes portfolio-scoped views linkable and shareable. localStorage provides persistence as a fallback when no URL param is present.

**CommandRail expand-on-hover (not toggle):** The rail is 60px collapsed (icon-only) and expands to 240px on mouse enter with a 200ms CSS transition. This saves screen space while keeping all navigation one hover away. Labels animate in with staggered delays for polish.

**DOM custom events for cross-component communication:** The TopBar hamburger button needs to open the CommandRail's mobile overlay. Rather than lifting state to the layout or using a context provider for a single boolean, a lightweight DOM custom event (`tri-mobile-nav-toggle`) connects the two sibling components with zero coupling.

**Module-level breadcrumb name store:** Detail pages (property, tenant) need to display entity names in TopBar breadcrumbs, but the TopBar renders in the layout above the page. A module-level `Record<string, string>` in TopBar.tsx, populated via `setBreadcrumbName(id, name)` called from detail pages, solves this without prop drilling or context overhead.

**Settings tab navigation with role filtering:** Settings tabs are defined as an array with `roles` arrays. The layout filters visible tabs based on `useAuth().user.role`. Viewers see only Profile and Security. Managers add Portfolios, Custom Fields, Picklists. Admins see all 11 tabs.

**Permanent redirects for URL changes:** `/property/:id` → `/properties/:id`, `/tenant/:id` → `/tenants/:id`, and `/settings/team` → `/settings/users` use Next.js `redirects()` in `next.config.ts` to preserve any existing bookmarks or external links.

### Alternatives Considered
- **Sidebar toggle button instead of hover:** More explicit but takes up space and adds an extra click. Hover-to-expand is standard in premium dashboards and maximizes content area.
- **React Context for mobile nav state:** Would require wrapping layout in an additional provider. DOM events are simpler for a boolean toggle between two known components.
- **Server Component layouts with data fetching:** Would eliminate client-side loading states but requires restructuring all data fetching. Deferred to a future optimization pass — current client-side approach works well.
- **Full breadcrumb context provider:** Over-engineered for the current needs. Only detail pages need to inject names; the module-level store handles this cleanly.
