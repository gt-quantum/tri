-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00002: Create all indexes and unique constraints
-- ============================================================

-- ============================================================
-- UNIQUE CONSTRAINTS
-- ============================================================

ALTER TABLE organizations ADD CONSTRAINT uq_organizations_slug UNIQUE (slug);
ALTER TABLE users ADD CONSTRAINT uq_users_org_email UNIQUE (org_id, email);
ALTER TABLE picklist_definitions ADD CONSTRAINT uq_picklist_org_entity_field_value UNIQUE (org_id, entity_type, field_name, value);
ALTER TABLE custom_field_definitions ADD CONSTRAINT uq_custom_fields_org_entity_field UNIQUE (org_id, entity_type, field_name);

-- ============================================================
-- MULTI-TENANCY INDEXES (org_id on all tables)
-- ============================================================

CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_portfolios_org_id ON portfolios(org_id);
CREATE INDEX idx_properties_org_id ON properties(org_id);
CREATE INDEX idx_properties_org_portfolio ON properties(org_id, portfolio_id);
CREATE INDEX idx_spaces_org_id ON spaces(org_id);
CREATE INDEX idx_spaces_org_property ON spaces(org_id, property_id);
CREATE INDEX idx_tenants_org_id ON tenants(org_id);
CREATE INDEX idx_leases_org_id ON leases(org_id);
CREATE INDEX idx_picklist_org_entity_field ON picklist_definitions(org_id, entity_type, field_name);
CREATE INDEX idx_custom_fields_org_entity ON custom_field_definitions(org_id, entity_type);
CREATE INDEX idx_audit_log_org_id ON audit_log(org_id);
CREATE INDEX idx_data_imports_org_id ON data_imports(org_id);
CREATE INDEX idx_scores_org_id ON scores(org_id);

-- ============================================================
-- FOREIGN KEY RELATIONSHIP INDEXES
-- ============================================================

CREATE INDEX idx_properties_portfolio_id ON properties(portfolio_id);
CREATE INDEX idx_spaces_property_id ON spaces(property_id);
CREATE INDEX idx_tenants_parent_tenant_id ON tenants(parent_tenant_id);
CREATE INDEX idx_leases_tenant_id ON leases(tenant_id);
CREATE INDEX idx_leases_property_id ON leases(property_id);
CREATE INDEX idx_leases_space_id ON leases(space_id);
CREATE INDEX idx_leases_tenant_status ON leases(tenant_id, status);

-- ============================================================
-- SOFT DELETE INDEXES
-- ============================================================

CREATE INDEX idx_organizations_deleted_at ON organizations(deleted_at);
CREATE INDEX idx_users_org_deleted ON users(org_id, deleted_at);
CREATE INDEX idx_portfolios_org_deleted ON portfolios(org_id, deleted_at);
CREATE INDEX idx_properties_org_deleted ON properties(org_id, deleted_at);
CREATE INDEX idx_spaces_org_property_deleted ON spaces(org_id, property_id, deleted_at);
CREATE INDEX idx_tenants_org_deleted ON tenants(org_id, deleted_at);
CREATE INDEX idx_leases_org_deleted ON leases(org_id, deleted_at);

-- ============================================================
-- AUDIT LOG INDEXES (high-growth table)
-- ============================================================

CREATE INDEX idx_audit_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_entity_field ON audit_log(entity_type, entity_id, field_name);
CREATE INDEX idx_audit_changed_at ON audit_log(changed_at);
CREATE INDEX idx_audit_changed_by ON audit_log(changed_by);
CREATE INDEX idx_audit_org_entity_time ON audit_log(org_id, entity_type, changed_at);

-- ============================================================
-- SCORING INDEXES
-- ============================================================

CREATE INDEX idx_scores_entity ON scores(entity_type, entity_id);
CREATE INDEX idx_scores_org_entity_time ON scores(org_id, entity_type, calculated_at);
