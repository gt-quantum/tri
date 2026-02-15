-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00004: Seed system-wide picklist defaults
-- ============================================================
-- System-wide defaults have org_id = NULL.
-- Organizations can override these with their own values.

-- --------------------------------------------------------
-- Organization Type (entity: organization, field: org_type)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, sort_order, is_default) VALUES
    (NULL, 'organization', 'org_type', 'reit', 'REIT', 1, false),
    (NULL, 'organization', 'org_type', 'property_manager', 'Property Manager', 2, false),
    (NULL, 'organization', 'org_type', 'owner', 'Property Owner', 3, false),
    (NULL, 'organization', 'org_type', 'firm', 'CRE Firm', 4, false);

-- --------------------------------------------------------
-- Property Type (entity: property, field: property_type)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, sort_order, is_default) VALUES
    (NULL, 'property', 'property_type', 'office', 'Office', 1, false),
    (NULL, 'property', 'property_type', 'retail', 'Retail', 2, false),
    (NULL, 'property', 'property_type', 'industrial', 'Industrial', 3, false),
    (NULL, 'property', 'property_type', 'residential', 'Residential', 4, false),
    (NULL, 'property', 'property_type', 'mixed_use', 'Mixed Use', 5, false);

-- --------------------------------------------------------
-- Space Type (entity: space, field: space_type)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, sort_order, is_default) VALUES
    (NULL, 'space', 'space_type', 'office', 'Office', 1, false),
    (NULL, 'space', 'space_type', 'retail', 'Retail', 2, false),
    (NULL, 'space', 'space_type', 'warehouse', 'Warehouse', 3, false),
    (NULL, 'space', 'space_type', 'storage', 'Storage', 4, false),
    (NULL, 'space', 'space_type', 'common_area', 'Common Area', 5, false);

-- --------------------------------------------------------
-- Space Status (entity: space, field: status)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, color, sort_order, is_default) VALUES
    (NULL, 'space', 'status', 'occupied', 'Occupied', '#10b981', 1, false),
    (NULL, 'space', 'status', 'vacant', 'Vacant', '#ef4444', 2, false),
    (NULL, 'space', 'status', 'under_renovation', 'Under Renovation', '#f59e0b', 3, false),
    (NULL, 'space', 'status', 'not_available', 'Not Available', '#6b7280', 4, false);

-- --------------------------------------------------------
-- Lease Type (entity: lease, field: lease_type)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, sort_order, is_default) VALUES
    (NULL, 'lease', 'lease_type', 'nnn', 'Triple Net (NNN)', 1, false),
    (NULL, 'lease', 'lease_type', 'gross', 'Gross', 2, false),
    (NULL, 'lease', 'lease_type', 'modified_gross', 'Modified Gross', 3, false),
    (NULL, 'lease', 'lease_type', 'percentage', 'Percentage', 4, false);

-- --------------------------------------------------------
-- Lease Status (entity: lease, field: status)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, color, sort_order, is_default) VALUES
    (NULL, 'lease', 'status', 'active', 'Active', '#10b981', 1, true),
    (NULL, 'lease', 'status', 'expired', 'Expired', '#6b7280', 2, false),
    (NULL, 'lease', 'status', 'pending', 'Pending', '#3b82f6', 3, false),
    (NULL, 'lease', 'status', 'under_negotiation', 'Under Negotiation', '#f59e0b', 4, false),
    (NULL, 'lease', 'status', 'month_to_month', 'Month-to-Month', '#8b5cf6', 5, false),
    (NULL, 'lease', 'status', 'terminated', 'Terminated', '#ef4444', 6, false);

-- --------------------------------------------------------
-- Tenant Industry (entity: tenant, field: industry)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, sort_order, is_default) VALUES
    (NULL, 'tenant', 'industry', 'retail', 'Retail', 1, false),
    (NULL, 'tenant', 'industry', 'technology', 'Technology', 2, false),
    (NULL, 'tenant', 'industry', 'healthcare', 'Healthcare', 3, false),
    (NULL, 'tenant', 'industry', 'finance', 'Finance', 4, false),
    (NULL, 'tenant', 'industry', 'food_service', 'Food Service', 5, false),
    (NULL, 'tenant', 'industry', 'professional_services', 'Professional Services', 6, false),
    (NULL, 'tenant', 'industry', 'government', 'Government', 7, false),
    (NULL, 'tenant', 'industry', 'nonprofit', 'Nonprofit', 8, false),
    (NULL, 'tenant', 'industry', 'other', 'Other', 9, false);

-- --------------------------------------------------------
-- Credit Rating (entity: tenant, field: credit_rating)
-- --------------------------------------------------------
INSERT INTO picklist_definitions (org_id, entity_type, field_name, value, display_label, color, sort_order, is_default) VALUES
    (NULL, 'tenant', 'credit_rating', 'excellent', 'Excellent', '#10b981', 1, false),
    (NULL, 'tenant', 'credit_rating', 'good', 'Good', '#3b82f6', 2, false),
    (NULL, 'tenant', 'credit_rating', 'fair', 'Fair', '#f59e0b', 3, false),
    (NULL, 'tenant', 'credit_rating', 'poor', 'Poor', '#ef4444', 4, false),
    (NULL, 'tenant', 'credit_rating', 'not_rated', 'Not Rated', '#6b7280', 5, true);
