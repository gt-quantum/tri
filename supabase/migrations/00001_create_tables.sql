-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00001: Create all 12 tables
-- ============================================================

-- Enable uuid generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- --------------------------------------------------------
-- Enum for user roles
-- --------------------------------------------------------
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'viewer');

-- ============================================================
-- CORE ENTITIES (7 tables)
-- ============================================================

-- 1. Organizations
CREATE TABLE organizations (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    name text NOT NULL,
    slug text NOT NULL,
    org_type text,
    industry text,
    logo_url text,
    settings jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 2. Users
CREATE TABLE users (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    email text NOT NULL,
    full_name text,
    role user_role NOT NULL DEFAULT 'viewer',
    created_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 3. Portfolios
CREATE TABLE portfolios (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    description text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 4. Properties
CREATE TABLE properties (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id uuid REFERENCES portfolios(id),
    org_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    address text,
    city text,
    state text,
    zip text,
    lat decimal,
    lng decimal,
    property_type text,
    total_sqft decimal,
    year_built integer,
    acquisition_date date,
    acquisition_price decimal,
    current_value decimal,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 5. Spaces
CREATE TABLE spaces (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    property_id uuid NOT NULL REFERENCES properties(id),
    org_id uuid NOT NULL REFERENCES organizations(id),
    name text NOT NULL,
    floor text,
    sqft decimal,
    status text,
    space_type text,
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 6. Tenants
CREATE TABLE tenants (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    company_name text NOT NULL,
    industry text,
    website text,
    primary_contact_name text,
    primary_contact_email text,
    primary_contact_phone text,
    credit_rating text,
    parent_tenant_id uuid REFERENCES tenants(id),
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- 7. Leases
CREATE TABLE leases (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    tenant_id uuid NOT NULL REFERENCES tenants(id),
    space_id uuid REFERENCES spaces(id),
    property_id uuid NOT NULL REFERENCES properties(id),
    lease_type text,
    status text,
    start_date date,
    end_date date,
    monthly_rent decimal,
    annual_rent decimal,
    rent_escalation decimal,
    security_deposit decimal,
    renewal_options jsonb DEFAULT '{}',
    terms jsonb DEFAULT '{}',
    metadata jsonb DEFAULT '{}',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    deleted_at timestamptz
);

-- ============================================================
-- CONFIGURATION & CUSTOMIZATION (2 tables)
-- ============================================================

-- 8. Picklist Definitions
CREATE TABLE picklist_definitions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid REFERENCES organizations(id),
    entity_type text NOT NULL,
    field_name text NOT NULL,
    value text NOT NULL,
    display_label text NOT NULL,
    color text,
    sort_order integer NOT NULL DEFAULT 0,
    is_default boolean NOT NULL DEFAULT false,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 9. Custom Field Definitions
CREATE TABLE custom_field_definitions (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    entity_type text NOT NULL,
    field_name text NOT NULL,
    display_name text NOT NULL,
    field_type text NOT NULL,
    options jsonb,
    required boolean NOT NULL DEFAULT false,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- TRACKING & ANALYTICS (3 tables)
-- ============================================================

-- 10. Audit Log
CREATE TABLE audit_log (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    action text NOT NULL,
    field_name text,
    old_value jsonb,
    new_value jsonb,
    changed_by uuid REFERENCES users(id),
    changed_at timestamptz NOT NULL DEFAULT now(),
    change_source text
);

-- 11. Data Imports
CREATE TABLE data_imports (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    source_type text NOT NULL,
    entity_type text NOT NULL,
    status text NOT NULL DEFAULT 'pending',
    row_count integer,
    error_log jsonb,
    created_by uuid REFERENCES users(id),
    created_at timestamptz NOT NULL DEFAULT now()
);

-- 12. Scores
CREATE TABLE scores (
    id uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
    org_id uuid NOT NULL REFERENCES organizations(id),
    score_model_id uuid,
    entity_type text NOT NULL,
    entity_id uuid NOT NULL,
    score_value decimal NOT NULL,
    score_components jsonb DEFAULT '{}',
    calculated_at timestamptz NOT NULL DEFAULT now()
);
