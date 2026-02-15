# Real Estate Platform — Project Instructions

**Database Schema:** See `Database_Schema_v01` in project knowledge for complete table definitions, indexes, and relationships.

---

## What We're Building

A multi-tenant SaaS platform for real estate organizations — REITs, property management companies, private owners, and commercial real estate firms — to centralize, visualize, and analyze their portfolio data. The platform ingests property, space, tenant, and lease data from multiple sources, displays it through dashboards and views, and will eventually apply risk/opportunity scoring models and AI-powered insights.

---

## Who It's For

Real estate organizations that manage portfolios of properties with tenants. The platform is intentionally org-type agnostic — it works for a large REIT with thousands of properties, a mid-size property management company, or a private owner with a handful of buildings. Each customer organization gets their own isolated data environment.

---

## Core Concepts

- **Organizations** are the top-level customer entity. Everything is scoped to an org.
- **Portfolios** are collections of properties within an org.
- **Properties** are individual buildings or locations.
- **Spaces** are units, suites, or leasable areas within a property. Not all spaces are occupied.
- **Tenants** are companies or entities that lease space. They exist independently at the org level (not nested under properties) so a single tenant like Home Depot can be tracked across multiple properties and spaces. Tenants support parent/subsidiary hierarchies.
- **Leases** are the agreements that connect tenants to spaces and/or properties. They represent the many-to-many relationship. A tenant can have multiple leases over time, and expired leases remain for historical tracking.
- **Picklist Definitions** let each org customize the dropdown values for standard fields (lease status, property type, space type, etc.) without code changes.
- **Custom Field Definitions** let each org add their own fields to any core entity, stored in jsonb metadata columns.
- **Audit Log** captures every create, update, soft delete, and restore across all tables from day one, enabling historical dashboards and time-series reporting.
- **Scores** provide a polymorphic framework for applying risk/opportunity scoring to any entity.

---

## Database Architecture

**Platform:** PostgreSQL via Supabase

**Schema:** 12 tables documented in project knowledge (`Database_Schema_v01`)

**Key architectural decisions:**
- Multi-tenancy via `org_id` on every table with Supabase RLS
- Soft deletes via `deleted_at` timestamps — records are never hard deleted
- Custom fields via jsonb `metadata` columns paired with Custom Field Definitions
- Standard field values reference Picklist Definitions for per-org customization
- Full audit log from day one tracking old/new values, who, when, and source
- Polymorphic scoring that can target any entity type
- Client-agnostic: the schema supports web, desktop, MCP, and API clients equally

**Tables:**
1. Organizations (top-level customer entity)
2. Users (people who log in)
3. Portfolios (collections of properties)
4. Properties (individual buildings)
5. Spaces (units/suites within properties)
6. Tenants (companies that lease space)
7. Leases (agreements connecting tenants to spaces/properties)
8. Picklist Definitions (customizable dropdown values)
9. Custom Field Definitions (org-specific custom fields)
10. Audit Log (full change history)
11. Data Imports (ingestion tracking)
12. Scores (polymorphic risk/opportunity scoring)

---

## AI-First Principles

**This platform is built AI-forward from day one.** Every feature, data structure, API, and interface should be designed with the assumption that AI agents will be first-class users of the system alongside human users.

### Data Accessibility
- All data should be queryable through clean, well-documented APIs that both humans and AI can consume
- Data structures should be self-describing — field names, types, and relationships should be clear enough that an AI agent can understand the schema and write correct queries without human guidance
- The Custom Field Definitions and Picklist Definitions tables exist partly to make the data model machine-readable — an AI can look up what fields exist and what values are valid

### AI as a Client
- The audit log's `change_source` field tracks whether changes came from ui, api, csv_import, google_sheets, mcp, desktop, or system — AI-initiated changes are tracked the same way as human changes
- Every action a human can take in the UI should eventually be possible through the API and MCP server
- When building features, always ask: "How would an AI agent use this?" If the answer is "it couldn't," redesign it

### MCP Server (Future)
- We plan to build a custom MCP server so organizations can interact with their data through Claude or other LLMs
- Users should be able to say things like "Add Home Depot as a tenant to the Riverside property with a 5-year NNN lease at $15,000/month" and have it executed
- Users should be able to ask "What percentage of my portfolio revenue comes from retail tenants?" and get accurate answers
- The MCP server should have full CRUD access to all entities, scoped by the user's org and permissions
- Design all data structures and APIs with this conversational interface in mind

### Scoring & Intelligence
- The scoring framework is designed to be model-driven — different scoring models can be applied to any entity
- Score components are stored as jsonb so the AI can explain what factors contributed to a score
- When we build scoring, the models should be transparent and explainable, not black boxes

### General Rule
When brainstorming, designing, or building any feature, always think: "Is this AI-accessible? Can an AI agent read this data, understand its structure, take actions on it, and explain the results to a user?" If not, adjust the design until the answer is yes.

---

## Data Ingestion

The platform will support multiple data sources:
- CSV uploads
- API integrations
- Google Sheets sync
- Salesforce or CRM connections (future)
- MCP server for conversational data entry (future)
- Direct UI entry

All ingestion is tracked in the Data Imports table. The audit log records the source of every change.

---

## What We're NOT Building Yet

- Frontend application (beyond testing dashboards)
- Authentication/authorization system (Supabase Auth will handle this)
- Score model definitions and calculation engine
- CRM features (contacts, activity history, notes)
- Document/attachment storage
- Notifications system
- Billing or subscription management
- The MCP server itself

These are all future considerations documented in the schema. The database is designed to support them when the time comes.

---

## Current Phase

We are in the initial database setup phase. The immediate goals are:
1. Create all 12 database tables with indexes, constraints, and RLS
2. Seed with realistic test data
3. Build a quick dashboard to verify everything works
4. Begin planning the API layer and frontend application

---

## How to Work With Me

I am not deeply technical. I think in terms of business logic, user experience, and product strategy. When explaining technical decisions, use plain language and real-world analogies. When I describe what I want, translate that into the right technical approach. When there are tradeoffs, explain them in terms of what I gain and what I lose, not in jargon.

Always default to building things right the first time over quick hacks that need refactoring later. This platform needs to scale and the database architecture should not need to be rearchitected as we grow.

---

## Technical Guidelines for Claude Code

### Code Quality
- Write clean, well-commented code that explains *why* not just *what*
- Use descriptive variable and function names
- Follow PostgreSQL and Supabase best practices
- Prioritize readability over cleverness

### Database Work
- Always reference the complete schema in project knowledge before writing queries or migrations
- Include appropriate indexes when creating tables
- Use transactions for multi-step operations
- Test queries against realistic data volumes
- Document any schema decisions or tradeoffs

### File Organization
- Keep SQL migrations in a dedicated `migrations/` directory
- Use clear, sequential naming for migration files (e.g., `001_create_organizations.sql`)
- Include both up and down migrations
- Add seed data scripts in a `seeds/` directory

### Communication
- Explain technical decisions in plain language
- When there are multiple approaches, present the options with pros/cons
- Ask clarifying questions before making assumptions
- Show examples of how features will work in practice

### Testing Approach
- Create realistic test data that represents actual use cases
- Include edge cases (soft deleted records, null values, etc.)
- Verify multi-tenancy isolation works correctly
- Test that indexes improve query performance as expected
