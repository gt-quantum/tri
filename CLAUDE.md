# Real Estate Platform

## Tech Stack
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Auth:** Supabase Auth (email+password, Google OAuth, Microsoft OAuth)
- **API:** Next.js 15 (App Router) + TypeScript — Route Handlers at `/api/v1/`
- **Validation:** Zod schemas (also powers OpenAPI 3.1 spec generation)
- **Auth UI:** `@supabase/auth-ui-react` + `@supabase/ssr` for session management
- **Icons:** Lucide React (tree-shakeable SVG icons)
- **Legacy Dashboard:** React 18 + Vite + Tailwind 3 (in `dashboard-v1/`, being replaced)
- **Charts:** Recharts (SVG-based, native React components)
- **Map:** Leaflet (vanilla, not react-leaflet) — CartoDB dark matter tiles, no API key
- **AI:** Vercel AI SDK 6 + `@ai-sdk/anthropic` + `@ai-sdk/react` — streaming chat with tool use
- **Hosting:** Vercel (auto-deploys from `main` branch)
- **Theme:** "Obsidian & Brass" dark theme (Tailwind config at root)
- **Fonts:** Playfair Display (display/headings/stats) + Outfit (body/UI) — self-hosted via `next/font/google`

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

## Tables (14)
**Core Entities:** organizations, users, portfolios, properties, spaces, tenants, leases
**Auth:** invitations, api_keys
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
- `lib/auth.ts` — Auth middleware (API key, JWT Bearer token, or session cookies)
- `lib/api-keys.ts` — API key generation, hashing, and validation utilities
- `lib/errors.ts` — Consistent error codes and response format
- `lib/response.ts` — Standard response envelopes (single item, paginated list)
- `lib/audit.ts` — Audit logging utilities (create, update, soft-delete) — fire-and-forget, non-blocking
- `lib/validation.ts` — Zod parsing helpers for body and query params
- `lib/schemas/` — Zod schemas per entity (validation + OpenAPI generation)
- `lib/openapi.ts` — OpenAPI 3.1 spec generator (Zod-to-OpenAPI registry, all routes registered)
- `middleware.ts` — Next.js middleware for route protection (login redirect, onboarding redirect, session refresh). Excludes `/api/` routes via matcher — API routes handle their own auth.

### Authentication
- **Three auth methods** in priority order:
  1. `Authorization: Bearer sk_live_...` — API key auth (hash → lookup → verify expiry/revocation)
  2. `Authorization: Bearer <JWT>` — Supabase JWT verification
  3. Session cookies — browser clients (automatic via middleware)
- **`getAuthContext(request)`** — main entry point, checks all three methods
- **`getBasicAuthContext(request)`** — for pre-org endpoints (e.g., create-org during onboarding, no API key support)
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
10. **Explicit field lists:** Security-sensitive endpoints use explicit `.select('field1, field2, ...')` — never bare `.select()` or `select('*')`. Invitation `token` is never returned in responses.

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
- `GET /api/v1/users` — List (manager+; filter: role, search by name/email)
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

**API Keys** — `lib/schemas/api-keys.ts`
- `GET /api/v1/api-keys` — List all API keys (admin only; excludes revoked by default, `?include_revoked=true`)
- `POST /api/v1/api-keys` — Create API key (admin only; returns plaintext key once; default 90 days, max 365)
- `GET /api/v1/api-keys/:id` — Get key details (admin only; never returns plaintext)
- `PATCH /api/v1/api-keys/:id` — Update key metadata (name, description only; admin only)
- `DELETE /api/v1/api-keys/:id` — Revoke key (admin only; immediate, soft revocation)
- `POST /api/v1/api-keys/:id/rotate` — Rotate key (admin only; revokes old, creates new with same metadata)

**Strata AI** — `lib/schemas/conversations.ts`
- `POST /api/v1/chat` — Streaming chat (viewer+; rate-limited 20/min/user)
- `GET /api/v1/conversations` — List conversations (own only; filter: source, include_archived)
- `POST /api/v1/conversations` — Create empty conversation
- `GET /api/v1/conversations/:id` — Full conversation with messages (own only)
- `PATCH /api/v1/conversations/:id` — Update title, archive, promote source
- `DELETE /api/v1/conversations/:id` — Hard delete

**System & Docs**
- `GET /api/v1/health` — Health check
- `GET /api/v1/schema` — Full data model discovery (manager+; entities, fields, relationships, picklist values, custom fields, conventions)
- `GET /api/v1/openapi.json` — OpenAPI 3.1 spec (auto-generated from Zod schemas)
- `GET /api/v1/docs` — Interactive API documentation (Scalar viewer)

### Auth Pages
- `/login` — Supabase Auth UI (email+password, Google, Microsoft)
- `/signup` — Same auth UI with invitation token support
- `/onboarding` — Create organization form (authenticated, no org)
- `/auth/callback` — OAuth redirect handler

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

## Frontend — App Shell & Navigation

**Framework:** Next.js 15 App Router (same project as API)
**Data fetching:** `useDashboardData()` for dashboard (`lib/use-dashboard-data.ts`), `useEntityDetail()` for detail pages (`lib/hooks/use-entity-detail.ts`), `useApiList()` for list pages (`lib/hooks/use-api-list.ts`)
**Auth context:** `AuthProvider` + `useAuth()` hook (`lib/auth-context.tsx`)
**Portfolio context:** `usePortfolioContext()` hook (`lib/use-portfolio-context.ts`)

### Route Groups
```
app/
├── (auth)/                    ← No navigation shell (login, signup, onboarding)
├── (app)/                     ← App shell: CommandRail + TopBar + content
│   ├── page.tsx               ← Dashboard (/)
│   ├── properties/            ← Properties list (/properties)
│   │   └── [id]/              ← Property detail (/properties/[id])
│   ├── tenants/               ← Tenants list (/tenants)
│   │   └── [id]/              ← Tenant detail (/tenants/[id])
│   ├── leases/                ← Leases list with expandable rows (/leases)
│   ├── agent/                 ← Strata AI chat page (/agent)
│   └── settings/              ← Settings with tab navigation
│       ├── layout.tsx         ← Horizontal tab nav (role-filtered)
│       ├── profile/           ← Everyone
│       ├── security/          ← Everyone
│       ├── organization/      ← Admin only
│       ├── users/             ← Admin only (was /settings/team)
│       ├── invitations/       ← Admin only
│       ├── portfolios/        ← Manager+
│       ├── custom-fields/     ← Manager+
│       ├── picklists/         ← Manager+
│       ├── api-keys/          ← Admin only
│       ├── audit-log/         ← Admin only
│       └── integrations/      ← Admin only
├── auth/callback/             ← OAuth redirect handler
└── api/v1/                    ← All API routes (unchanged)
```

### Navigation Components (`components/navigation/`)
- `CommandRail.tsx` — Slim sidebar (60px collapsed, 240px on hover). TRI monogram, PortfolioSwitcher, nav items (Dashboard, Strata AI, Properties, Tenants, Leases, Settings), user avatar dropdown. Mobile: full-screen overlay via hamburger.
- `TopBar.tsx` — 52px breadcrumb strip with portfolio context. Search pill placeholder (cmd+K). Exports `setBreadcrumbName(id, name)` for detail pages.
- `PortfolioSwitcher.tsx` — Dropdown for portfolio selection. "All Portfolios" + portfolio list + "Manage Portfolios" link (admin/manager).

### URL Redirects (backward compatibility)
- `/property/:id` → `/properties/:id` (permanent)
- `/tenant/:id` → `/tenants/:id` (permanent)
- `/settings/team` → `/settings/users` (permanent)

### Pages
- `/` — Main dashboard (Analytics / Data tabs, summary cards)
- `/properties` — Properties list (filterable, sortable, paginated, portfolio-aware)
- `/properties/[id]` — Property detail (spaces, active leases, lease history)
- `/tenants` — Tenants list (searchable, filterable by industry/credit, paginated)
- `/tenants/[id]` — Tenant detail (parent/subsidiary, portfolio footprint, leases)
- `/leases` — Leases list (filterable, sortable, expandable detail rows)
- `/agent` — Strata AI full-page chat (conversation sidebar + chat area with starter questions)
- `/settings/*` — 11 settings pages (2 full, 9 placeholder)
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
- `AuthProvider` wraps `(app)/layout.tsx` — provides user info to shell components without data fetching
- `usePortfolioContext()` — manages portfolio selection via URL `?portfolio={id}` + localStorage
- `useDashboardData(portfolioId?)` — dashboard data fetching with portfolio filtering and 60s cache. Used only by the main dashboard page.
- `useEntityDetail(endpoint, id)` — fetches a single entity by ID via REST API. Used by property and tenant detail pages. Leverages enriched API responses (tenant_name, space_name, subsidiaries).
- `useApiList()` — shared hook for paginated list pages (properties, tenants, leases). Uses `useAuth().getToken()` for Bearer auth, handles stale request cancellation, re-fetches when params change.
- `setBreadcrumbName(id, name)` — detail pages set entity names for TopBar breadcrumbs
- Mobile nav: DOM custom event `tri-mobile-nav-toggle` connects TopBar hamburger to CommandRail overlay
- Leaflet requires `dynamic(() => import(...), { ssr: false })` for SSR safety
- All data comes through `/api/v1/` routes (not direct Supabase queries)

### Typography Convention
Two font families self-hosted via `next/font/google` in `app/layout.tsx` (CSS variables `--font-playfair` and `--font-outfit`):
- **`font-display`** — Playfair Display (serif). Traditional, authoritative feel for a financial/real estate platform.
- **`font-body`** — Outfit (sans-serif). Clean, modern sans-serif for readability.

**Where to use each font:**

| Element | Font Class | Example |
|---|---|---|
| Page titles (h1) | `font-display text-2xl` | "Properties", "Leases" |
| Section headings | `.section-heading` (= `font-display text-xl`) | "Spaces", "Active Leases" |
| KPI/stat values (large numbers) | `font-display tabular` or `.stat-value` | "$2.5M", "94.2%", "127" |
| Chart titles (h3) | `font-display text-lg` | "Rent Roll Projection" |
| TRI monogram | `font-display` | CommandRail logo |
| Stat card labels | `.stat-label` (= `font-body 11px uppercase tracking`) | "Monthly Revenue", "Occupancy" |
| Body text, descriptions | `font-body text-sm` (14px) | Subtitles, paragraphs |
| Subtitles, chart descriptions | `font-body text-[13px]` | "18-month projection", "24 active leases" |
| Table headers | `.table-header` (= `font-body text-xs uppercase`) | Column headers |
| Table cells | `.table-cell` (= `font-body text-sm`) | Row content |
| Form inputs, selects | `font-body text-sm` | Filters, search bars |
| Buttons, tabs, nav labels | `font-body text-sm` | Tab buttons, nav items |
| Chart legend labels | `font-body text-[11px] uppercase` | "Low Risk", "Contracted" |
| Chart axis ticks | `fontFamily: 'Outfit', fontSize: 12` | Recharts XAxis/YAxis |
| Tooltips content | `font-body text-[13px]` | Chart tooltip rows |
| Badges | `.badge` (= 11px uppercase) | Status, type badges |
| Micro badges (inline) | `text-[10px]` | "parent", "subsidiary", "multi-site" |

**Typography size scale** (use these sizes, not arbitrary values):

| Size | Pixel | Tailwind | Usage |
|------|-------|----------|-------|
| Micro badge | 10px | `text-[10px]` | Inline relationship badges only |
| Caption | 11px | `text-[11px]` | Stat labels, chart legends, badge text |
| Label | 12px | `text-xs` | Table headers, filter buttons, uppercase labels |
| Subtitle | 13px | `text-[13px]` | Descriptions, section counters, secondary info, tooltip content |
| Body | 14px | `text-sm` | Table cells, nav items, form inputs, paragraphs |
| Chart title | 18px | `text-lg` | Chart/card headings |
| Section heading | 20px | `text-xl` | Section headings (`.section-heading`) |
| Page title | 24px | `text-2xl` | Page-level h1 headings |

**Contrast guideline for dark mode:** Small text (13px and below) should use `text-warm-200` or `text-warm-300` for secondary content. Reserve `text-warm-400` only for de-emphasized meta text at 14px+. Never use `text-warm-500` for readable text.

**CSS utility classes** (defined in `globals.css`):
- `.section-heading` — `font-display text-xl text-warm-white tracking-wide`
- `.stat-value` — `font-display tabular` (for KPI numbers)
- `.stat-label` — `font-body text-[11px] uppercase tracking-[0.14em] text-warm-300 font-semibold`
- `.table-header` — `font-body text-xs uppercase tracking-[0.12em] text-warm-200`
- `.table-cell` — `font-body text-sm`
- `.badge` — `text-[11px] font-semibold uppercase tracking-wider`

**Rule of thumb:** If it's a prominent number that represents a KPI, dollar amount, percentage, or count displayed as a headline stat, use `font-display`. Everything else uses `font-body`.

## Legacy Dashboard (v1)

**Location:** `dashboard-v1/` — run with `cd dashboard-v1 && npm run dev`
Connects directly to Supabase via anon key. **Superseded** by the Next.js dashboard above. Preserved for reference but no longer deployed.

## Strata AI (Conversational AI)

**Stack:** Vercel AI SDK 6 + Claude Haiku 4.5 + Anthropic prompt caching
**Env:** `ANTHROPIC_API_KEY` required

### Architecture
- **Chat endpoint:** `POST /api/v1/chat` — streaming response, rate-limited (20/min/user)
- **System prompt:** `lib/ai/system-prompt.ts` — cached segment (persona + schema) + dynamic segment (user context)
- **Tools:** `lib/ai/tools.ts` — 10 read-only tools querying Supabase directly (not HTTP self-calls)
- **Transport:** `DefaultChatTransport` from AI SDK 6 (replaces old api/headers/body pattern)

### Tools (10 read-only)
listProperties, getProperty, listTenants, getTenant, listLeases, getLease, listSpaces, listPortfolios, getAuditLog, getSchema

### Frontend Components
- **Widget:** `components/agent/AgentWidget.tsx` — FAB (40px circle, bottom-right) toggles floating chat window (380x520). Full-screen on mobile. Animated scale open/close from FAB origin. Hidden on `/agent`.
- **Agent Page:** `app/(app)/agent/page.tsx` — full-screen chat with conversation sidebar
- **Highlight-to-ask:** `components/agent/SelectionTooltip.tsx` — select text → tooltip → opens widget with context
- **Shared components:** `components/agent/` — AgentHeader, AgentMessageList, AgentMessage, AgentToolResult, AgentInput

### Hooks & Utilities
- `lib/ai/use-agent-chat.ts` — wraps `useChat()` with auth token injection, input state, simplified sendMessage(text)
- `lib/ai/agent-context.ts` — `PageContext` type, `parsePageContext()` extracts entity/type from URL
- `lib/ai/use-text-selection.ts` — text selection detection for highlight-to-ask
- `lib/ai/rate-limit.ts` — in-memory per-user rate limiter (20 msg/min)

### Conversation Persistence
- **Table:** `ai_conversations` (migration 00010) — messages stored as jsonb array
- **Endpoints:** `GET/POST /api/v1/conversations`, `GET/PATCH/DELETE /api/v1/conversations/:id`
- **Auto-save:** `onFinish` callback in chat route (fire-and-forget)

### Key Patterns
- AI SDK v6: `useChat()` returns `messages`, `sendMessage`, `status`, `stop` — no `input`/`setInput` (managed locally)
- `UIMessage.parts[]` — messages have `parts` (TextUIPart, tool parts), not `content`
- `sendMessage({ text })` — accepts object with text property
- Tool parts: `type: 'dynamic-tool'` with `toolName`, `state`, `input`, `output`
- `data-ai-context` attributes on dashboard components for structured highlight-to-ask context
- Custom event `tri-agent-ask` connects SelectionTooltip to AgentWidget

## MCP Server

**Location:** `mcp/` — TypeScript MCP server connecting AI clients to the TRI REST API
**SDK:** `@modelcontextprotocol/sdk` (stdio transport)
**Run:** `cd mcp && npm install && npm run build && node dist/index.js`

### Environment Variables
- `TRI_API_KEY` (required) — API key (`sk_live_...`) with `manager` role recommended
- `TRI_API_URL` (optional) — API base URL (default: `http://localhost:3000`)

### How It Works
- Runs locally as a child process spawned by the AI client (Claude Desktop, Claude Code, Cursor, Cline)
- Communicates via stdin/stdout (stdio transport) — no network server to host
- Every request sends `Authorization: Bearer sk_live_...` and `X-Change-Source: mcp`
- All mutations audited with `change_source: mcp`

### Tools (47)
Maps to all API endpoints: portfolios, properties, spaces, tenants, leases, users, invitations, picklists, custom fields, audit log, API keys, plus system tools (health, schema).

### Resources
- `tri://properties`, `tri://tenants`, `tri://leases`, `tri://schema` — for context injection

### Client Configuration
See `mcp/README.md` for setup examples for Claude Desktop, Claude Code, Cursor, and Cline.

### Deployment
- Vercel config: `vercel.json` at repo root (now configured for Next.js)
- Auto-deploys on push to `main`
