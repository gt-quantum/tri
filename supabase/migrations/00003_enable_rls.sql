-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00003: Enable Row Level Security on all tables
-- ============================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE spaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
ALTER TABLE picklist_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE data_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE scores ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- RLS POLICIES
-- ============================================================
-- These policies use auth.uid() to look up the user's org_id.
-- The helper function avoids repeating the subquery in every policy.

-- Helper function: get the current user's org_id from the users table
CREATE OR REPLACE FUNCTION public.user_org_id()
RETURNS uuid AS $$
    SELECT org_id FROM public.users WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Organizations: users can only see their own org
CREATE POLICY "Users can view their own organization"
    ON organizations FOR SELECT
    USING (id = public.user_org_id());

CREATE POLICY "Admins can update their own organization"
    ON organizations FOR UPDATE
    USING (id = public.user_org_id());

-- Users: scoped to same org
CREATE POLICY "Users can view users in their org"
    ON users FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert users in their org"
    ON users FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update users in their org"
    ON users FOR UPDATE
    USING (org_id = public.user_org_id());

-- Portfolios: scoped to org_id
CREATE POLICY "Users can view portfolios in their org"
    ON portfolios FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert portfolios in their org"
    ON portfolios FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update portfolios in their org"
    ON portfolios FOR UPDATE
    USING (org_id = public.user_org_id());

-- Properties: scoped to org_id
CREATE POLICY "Users can view properties in their org"
    ON properties FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert properties in their org"
    ON properties FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update properties in their org"
    ON properties FOR UPDATE
    USING (org_id = public.user_org_id());

-- Spaces: scoped to org_id
CREATE POLICY "Users can view spaces in their org"
    ON spaces FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert spaces in their org"
    ON spaces FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update spaces in their org"
    ON spaces FOR UPDATE
    USING (org_id = public.user_org_id());

-- Tenants: scoped to org_id
CREATE POLICY "Users can view tenants in their org"
    ON tenants FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert tenants in their org"
    ON tenants FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update tenants in their org"
    ON tenants FOR UPDATE
    USING (org_id = public.user_org_id());

-- Leases: scoped to org_id
CREATE POLICY "Users can view leases in their org"
    ON leases FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert leases in their org"
    ON leases FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update leases in their org"
    ON leases FOR UPDATE
    USING (org_id = public.user_org_id());

-- Picklist Definitions: org-scoped OR system-wide (org_id IS NULL)
CREATE POLICY "Users can view picklists for their org or system defaults"
    ON picklist_definitions FOR SELECT
    USING (org_id = public.user_org_id() OR org_id IS NULL);

CREATE POLICY "Users can insert picklists for their org"
    ON picklist_definitions FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update picklists for their org"
    ON picklist_definitions FOR UPDATE
    USING (org_id = public.user_org_id());

-- Custom Field Definitions: scoped to org_id
CREATE POLICY "Users can view custom fields in their org"
    ON custom_field_definitions FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert custom fields in their org"
    ON custom_field_definitions FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update custom fields in their org"
    ON custom_field_definitions FOR UPDATE
    USING (org_id = public.user_org_id());

-- Audit Log: scoped to org_id (read-only for users; writes come from system/triggers)
CREATE POLICY "Users can view audit log in their org"
    ON audit_log FOR SELECT
    USING (org_id = public.user_org_id());

-- Data Imports: scoped to org_id
CREATE POLICY "Users can view imports in their org"
    ON data_imports FOR SELECT
    USING (org_id = public.user_org_id());

CREATE POLICY "Users can insert imports in their org"
    ON data_imports FOR INSERT
    WITH CHECK (org_id = public.user_org_id());

CREATE POLICY "Users can update imports in their org"
    ON data_imports FOR UPDATE
    USING (org_id = public.user_org_id());

-- Scores: scoped to org_id (read-only for users; writes come from scoring system)
CREATE POLICY "Users can view scores in their org"
    ON scores FOR SELECT
    USING (org_id = public.user_org_id());
