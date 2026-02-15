# Real Estate Platform

## Tech Stack
- **Database:** Supabase (PostgreSQL) with Row-Level Security
- **Future API Layer:** Node.js

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
