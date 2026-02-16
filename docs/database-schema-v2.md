# Real Estate Platform — Database Schema v2

**12 tables · Multi-tenant · Custom fields & picklists · Audit log · Polymorphic scoring · Soft deletes**

---

## Overview

This database architecture supports a multi-tenant platform for real estate organizations — including REITs, property management companies, private owners, and commercial real estate firms — to manage portfolios, properties, spaces, tenants, and leases. It includes customizable fields and picklist values per organization, a full audit log for historical change tracking, data import tracking, and a polymorphic scoring framework for future risk/opportunity analysis.

Every table includes `org_id` for multi-tenant data isolation. Supabase row-level security (RLS) can enforce this automatically.

Core entity tables use soft deletes via `deleted_at` timestamps. Records are never permanently removed — they are filtered out of normal queries but preserved for historical reporting, scoring, and recovery.

---

## CORE ENTITIES (7 tables)

### 1. Organizations
Top-level: each customer organization you sell to.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| name | text | |
| slug | text | Unique identifier |
| org_type | text | References picklist (reit, property_manager, owner, firm, etc.) |
| industry | text | e.g. 'commercial_real_estate', 'residential', 'mixed_use' |
| logo_url | text | |
| settings | jsonb | Org-level configuration |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

---

### 2. Users
People who log in to the platform.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| email | text | |
| full_name | text | |
| role | enum | admin, manager, viewer |
| created_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

---

### 3. Portfolios
Collections of properties within an org.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| name | text | |
| description | text | |
| metadata | jsonb | Custom fields |
| created_by | uuid | FK → users, nullable. Set on insert. |
| updated_by | uuid | FK → users, nullable. Set on every update. |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

---

### 4. Properties
Individual buildings/locations.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| portfolio_id | uuid | FK → portfolios |
| org_id | uuid | FK → organizations |
| name | text | |
| address | text | |
| city | text | |
| state | text | |
| zip | text | |
| lat | decimal | For map views |
| lng | decimal | For map views |
| property_type | text | References picklist_definitions |
| total_sqft | decimal | |
| year_built | integer | |
| acquisition_date | date | |
| acquisition_price | decimal | |
| current_value | decimal | |
| metadata | jsonb | Custom fields |
| created_by | uuid | FK → users, nullable. Set on insert. |
| updated_by | uuid | FK → users, nullable. Set on every update. |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

---

### 5. Spaces
Units/suites within a property.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| property_id | uuid | FK → properties |
| org_id | uuid | FK → organizations |
| name | text | e.g. 'Suite 200' |
| floor | text | |
| sqft | decimal | |
| status | text | References picklist (occupied, vacant, under_renovation, etc.) |
| space_type | text | References picklist (retail, office, warehouse, etc.) |
| metadata | jsonb | Custom fields |
| created_by | uuid | FK → users, nullable. Set on insert. |
| updated_by | uuid | FK → users, nullable. Set on every update. |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

---

### 6. Tenants
Companies/entities — exists independently at the org level. Connected to spaces/properties via Leases. NOT nested under properties.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| company_name | text | |
| industry | text | References picklist |
| website | text | |
| primary_contact_name | text | |
| primary_contact_email | text | |
| primary_contact_phone | text | |
| credit_rating | text | References picklist |
| parent_tenant_id | uuid | FK → tenants (self-ref for parent/subsidiary hierarchies) |
| metadata | jsonb | Custom fields |
| created_by | uuid | FK → users, nullable. Set on insert. |
| updated_by | uuid | FK → users, nullable. Set on every update. |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

**Design note:** Tenants exist at the org level so you can track a single tenant (e.g. Home Depot) across multiple properties and spaces. The `parent_tenant_id` self-reference enables corporate hierarchies (parent company → subsidiaries).

---

### 7. Leases
The many-to-many connector linking tenants to spaces and/or properties.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| tenant_id | uuid | FK → tenants |
| space_id | uuid | FK → spaces (nullable if tenant leases full property) |
| property_id | uuid | FK → properties |
| lease_type | text | References picklist (NNN, gross, modified_gross, etc.) |
| status | text | References picklist (active, expired, pending, under_negotiation, month_to_month, etc.) |
| start_date | date | |
| end_date | date | |
| monthly_rent | decimal | |
| annual_rent | decimal | |
| rent_escalation | decimal | Annual % increase |
| security_deposit | decimal | |
| renewal_options | jsonb | Structured renewal terms |
| terms | jsonb | Additional lease terms |
| metadata | jsonb | Custom fields |
| created_by | uuid | FK → users, nullable. Set on insert. |
| updated_by | uuid | FK → users, nullable. Set on every update. |
| created_at | timestamp | |
| updated_at | timestamp | |
| deleted_at | timestamp | Nullable — soft delete |

**Design note:** A tenant can have multiple leases across different properties and spaces over time. Expired leases remain in the system for historical tracking. The `space_id` is nullable to support tenants who lease an entire property rather than individual spaces.

---

## CONFIGURATION & CUSTOMIZATION (2 tables)

### 8. Picklist Definitions
Configurable dropdown values for standard fields, per org. This allows each organization to customize values for fields like lease_status, property_type, space_type, lease_type, credit_rating, org_type, and tenant industry without code changes.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations (nullable for system-wide defaults) |
| entity_type | text | Which entity: organization, property, space, tenant, lease |
| field_name | text | Which field: e.g. 'status', 'lease_type', 'property_type', 'org_type' |
| value | text | The actual stored value |
| display_label | text | Human-readable label shown in UI |
| color | text | Optional hex color for UI badges/tags |
| sort_order | integer | Controls display ordering in dropdowns |
| is_default | boolean | Whether this is the default selection |
| is_active | boolean | Soft delete/disable without removing data |
| created_at | timestamp | |

**Example rows:**
- org: null (system), entity: "organization", field: "org_type", value: "reit", label: "REIT"
- org: null (system), entity: "organization", field: "org_type", value: "property_manager", label: "Property Manager"
- org: null (system), entity: "organization", field: "org_type", value: "owner", label: "Property Owner"
- org: "org-a", entity: "lease", field: "status", value: "active", label: "Active", color: "#10b981"
- org: "org-b", entity: "lease", field: "status", value: "month_to_month", label: "Month-to-Month", color: "#8b5cf6"

---

### 9. Custom Field Definitions
Defines what custom fields each org has created. Works in tandem with the `metadata` jsonb column on each core entity.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| entity_type | text | Which entity: property, space, tenant, lease, portfolio |
| field_name | text | Machine-readable key (stored in metadata jsonb) |
| display_name | text | Human-readable label for UI |
| field_type | text | text, number, date, select, multi_select, boolean, url |
| options | jsonb | For select/multi-select: available choices |
| required | boolean | Whether field is mandatory |
| created_at | timestamp | |

**How it works:** When an organization creates a custom field called "Environmental Risk Score" on Properties, a row is added here with entity_type="property", field_name="environmental_risk_score", field_type="number". The actual values are stored in the `metadata` jsonb column on each Property record: `{"environmental_risk_score": 7.5}`.

---

## TRACKING & ANALYTICS (3 tables)

### 10. Audit Log
Tracks every change to every record across all tables. Enables historical dashboards and reporting. Wired up from day one so no historical data is lost.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| entity_type | text | Which table was changed (e.g. 'property', 'lease', 'tenant') |
| entity_id | uuid | Which specific record was changed |
| action | text | create, update, soft_delete, restore |
| field_name | text | Which field changed (null for create/delete of whole record) |
| old_value | jsonb | Previous value (null for creates) |
| new_value | jsonb | New value (null for deletes) |
| changed_by | uuid | FK → users |
| changed_at | timestamp | |
| change_source | text | ui, api, csv_import, google_sheets, mcp, desktop, system |

**Example query:** "Show me how this property's current_value changed over the last 12 months" → Query audit_log WHERE entity_type='property' AND entity_id='xxx' AND field_name='current_value' ORDER BY changed_at.

---

### 11. Data Imports
Tracks CSV/API/Google Sheets data ingestion history.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| source_type | text | csv, api, google_sheets, salesforce, manual |
| entity_type | text | Which table was imported into |
| status | text | pending, processing, complete, failed |
| row_count | integer | Number of rows processed |
| error_log | jsonb | Details on any failed rows |
| created_by | uuid | FK → users |
| created_at | timestamp | |

---

### 12. Scores
Future-ready: polymorphic risk/opportunity scoring on any entity.

| Field | Type | Notes |
|---|---|---|
| **id** | uuid | PK |
| org_id | uuid | FK → organizations |
| score_model_id | uuid | References a score model definition (future table) |
| entity_type | text | property, tenant, lease, space |
| entity_id | uuid | Polymorphic reference to the scored entity |
| score_value | decimal | The calculated score |
| score_components | jsonb | Breakdown of contributing factors |
| calculated_at | timestamp | |

---

## INDEXES

Indexes ensure fast query performance as data grows. These should be created alongside the tables during initial database setup.

### Multi-tenancy (all tables)
Every table query will filter by org_id, so this is the most critical index category.

| Table | Index | Purpose |
|---|---|---|
| users | `org_id` | Filter users by org |
| portfolios | `org_id` | Filter portfolios by org |
| properties | `org_id` | Filter properties by org |
| properties | `org_id, portfolio_id` | Properties within a portfolio for a given org |
| spaces | `org_id` | Filter spaces by org |
| spaces | `org_id, property_id` | Spaces within a property for a given org |
| tenants | `org_id` | Filter tenants by org |
| leases | `org_id` | Filter leases by org |
| picklist_definitions | `org_id, entity_type, field_name` | Look up picklist values for a specific field |
| custom_field_definitions | `org_id, entity_type` | Look up custom fields for an entity type |
| audit_log | `org_id` | Filter audit entries by org |
| data_imports | `org_id` | Filter imports by org |
| scores | `org_id` | Filter scores by org |

### Foreign key relationships
Speed up joins and lookups across related tables.

| Table | Index | Purpose |
|---|---|---|
| properties | `portfolio_id` | List properties in a portfolio |
| spaces | `property_id` | List spaces in a property |
| tenants | `parent_tenant_id` | Look up subsidiaries of a parent tenant |
| leases | `tenant_id` | All leases for a tenant |
| leases | `property_id` | All leases for a property |
| leases | `space_id` | All leases for a space |
| leases | `tenant_id, status` | Active leases for a tenant (common dashboard query) |

### User attribution (created_by)
Supports "show me all records created by this user" queries for activity feeds and admin views. `updated_by` is not indexed — it changes on every update and is not a common filter criterion.

| Table | Index | Purpose |
|---|---|---|
| portfolios | `created_by` | Records created by a specific user |
| properties | `created_by` | Records created by a specific user |
| spaces | `created_by` | Records created by a specific user |
| tenants | `created_by` | Records created by a specific user |
| leases | `created_by` | Records created by a specific user |

### Lease filtering
Composite indexes for common list endpoint filters.

| Table | Index | Purpose |
|---|---|---|
| leases | `org_id, status` | `GET /api/v1/leases?status=...` filtered queries |
| leases | `org_id, lease_type` | `GET /api/v1/leases?lease_type=...` filtered queries |

### Soft deletes
Filter out deleted records efficiently in normal queries.

| Table | Index | Purpose |
|---|---|---|
| organizations | `deleted_at` | Filter active orgs |
| users | `org_id, deleted_at` | Active users within an org |
| portfolios | `org_id, deleted_at` | Active portfolios within an org |
| properties | `org_id, deleted_at` | Active properties within an org |
| spaces | `org_id, property_id, deleted_at` | Active spaces within a property |
| tenants | `org_id, deleted_at` | Active tenants within an org |
| leases | `org_id, deleted_at` | Active leases within an org |

### Audit log (high-growth table)
The audit log will grow the fastest, so these indexes are critical for keeping historical queries performant.

| Table | Index | Purpose |
|---|---|---|
| audit_log | `entity_type, entity_id` | "Show me all changes to this specific record" |
| audit_log | `entity_type, entity_id, field_name` | "Show me how this specific field changed over time" |
| audit_log | `changed_at` | Time-range queries for dashboards |
| audit_log | `changed_by` | "Show me all changes made by this user" |
| audit_log | `org_id, entity_type, changed_at` | "Show me all property changes in this org over the last month" |

### Scoring
| Table | Index | Purpose |
|---|---|---|
| scores | `entity_type, entity_id` | Look up all scores for a specific record |
| scores | `org_id, entity_type, calculated_at` | Dashboard: latest scores by entity type |

### Unique constraints
Prevent duplicate data.

| Table | Constraint | Purpose |
|---|---|---|
| organizations | `UNIQUE(slug)` | No duplicate org slugs |
| users | `UNIQUE(org_id, email)` | No duplicate emails within an org |
| picklist_definitions | `UNIQUE(org_id, entity_type, field_name, value)` | No duplicate picklist values |
| custom_field_definitions | `UNIQUE(org_id, entity_type, field_name)` | No duplicate custom field names per entity |

---

## RELATIONSHIPS
```
organizations  →  users                    (1:many)
organizations  →  portfolios               (1:many)
portfolios     →  properties               (1:many)
properties     →  spaces                   (1:many)
organizations  →  tenants                  (1:many)
tenants        →  leases                   (1:many)
spaces         →  leases                   (1:many)
properties     →  leases                   (1:many)
tenants        →  tenants                  (self-ref: parent/child)
organizations  →  picklist_definitions     (1:many)
organizations  →  custom_field_definitions (1:many)
organizations  →  audit_log               (1:many)
organizations  →  data_imports            (1:many)
organizations  →  scores                  (1:many)
```

---

## KEY DESIGN DECISIONS

### 1. Multi-tenancy via org_id
Every table has `org_id` for data isolation. Row-level security (RLS) in Supabase enforces this automatically so Organization A never sees Organization B's data.

### 2. Organization-type agnostic
The `org_type` field on Organizations references a picklist, so the platform supports REITs, property managers, private owners, commercial firms, or any future customer type without schema changes.

### 3. Custom fields via jsonb + definitions
Each core entity has a `metadata` jsonb column for storing custom field values. The Custom Field Definitions table tracks what fields each org has created, enabling UI rendering, validation, and admin visibility.

### 4. Picklist configurations per org
Standard fields like `lease_status`, `property_type`, `space_type`, `lease_type`, `credit_rating`, and `tenant_industry` all reference the Picklist Definitions table. Each organization can customize their dropdown values without code changes. Values include display labels, colors for UI badges, sort ordering, and soft-delete capability.

### 5. Tenants are independent entities
Tenants exist at the org level, NOT nested under properties. Leases create the many-to-many relationship between Tenants and Spaces/Properties. The `parent_tenant_id` self-reference enables corporate hierarchies (e.g. Home Depot parent → regional subsidiaries).

### 6. Audit log from day one
Every create, update, soft delete, and restore across all tables is recorded in the audit log with old/new values, who made the change, when, and from what source. This enables historical dashboards and time-series reporting without needing to build it later and losing early data.

### 7. Polymorphic scoring
The Scores table references any entity type + ID, so you can apply risk/opportunity scoring to Properties, Tenants, Leases, or Spaces using different scoring models.

### 8. Leases support full lifecycle
Tenants can have multiple leases across different properties and spaces over time. Lease status and type are customizable per org via picklists. Expired/historical leases remain in the system. The `space_id` is nullable to support tenants who lease entire properties.

### 9. Client-agnostic architecture
The schema supports web, desktop, and MCP server clients equally. The audit log's `change_source` field tracks which client originated each change (ui, api, desktop, mcp, csv_import, google_sheets, system).

### 10. User attribution on core entities
Five core entity tables (portfolios, properties, spaces, tenants, leases) have `created_by` and `updated_by` columns (FK → users, nullable). These denormalize the "who created/last touched this?" query from the audit log onto the record itself for fast UI display. The audit log remains the source of truth for full change history; these columns are a read-performance optimization. Both are nullable to handle system-generated changes, bulk imports, and backfill gaps. **Organizations is intentionally excluded** — users FK to organizations, so the org must exist before its first user, creating a circular dependency that would force `created_by` to always be NULL at insert time.

### 11. Soft deletes preserve history
All core entity tables use `deleted_at` timestamps instead of hard deletes. Deleted records are filtered out of normal queries but preserved for historical reporting, scoring calculations, and recovery. The audit log captures soft deletes and restores.

---

## FUTURE CONSIDERATIONS

- **Score Model Definitions table** — Define different scoring models with weighted factors
- **Contacts table** — Separate from Tenants for CRM functionality (multiple contacts per tenant)
- **Activity/Notes table** — CRM-style interaction history
- **Documents/Attachments table** — Store lease PDFs, property photos, etc.
- **Notifications table** — Lease expiration alerts, score changes, etc.
- **MCP Server** — Custom-built MCP server so organizations can chat with their data via LLM
- **Tags table** — Flexible tagging system across entities
- **Workspace/Views table** — Saved dashboard configurations per user
