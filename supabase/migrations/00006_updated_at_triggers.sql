-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00006: Auto-update updated_at timestamps
-- ============================================================
-- Creates a trigger function that sets updated_at = NOW() on every
-- UPDATE. Applied to all tables that have an updated_at column.
-- This ensures updated_at is always accurate regardless of whether
-- the API layer remembers to set it.
-- ============================================================

-- Trigger function: set updated_at to current timestamp
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to organizations
CREATE TRIGGER set_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Apply to portfolios
CREATE TRIGGER set_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Apply to properties
CREATE TRIGGER set_properties_updated_at
    BEFORE UPDATE ON properties
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Apply to spaces
CREATE TRIGGER set_spaces_updated_at
    BEFORE UPDATE ON spaces
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Apply to tenants
CREATE TRIGGER set_tenants_updated_at
    BEFORE UPDATE ON tenants
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();

-- Apply to leases
CREATE TRIGGER set_leases_updated_at
    BEFORE UPDATE ON leases
    FOR EACH ROW
    EXECUTE FUNCTION public.set_updated_at();
