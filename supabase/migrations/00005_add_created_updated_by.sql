-- ============================================================
-- Real Estate Platform — Database Schema v2
-- Migration 00005: Add created_by and updated_by to core entities
-- ============================================================
-- Adds user attribution columns to 5 core entity tables:
--   portfolios, properties, spaces, tenants, leases
--
-- Organizations is intentionally excluded: users FK to organizations,
-- so the org must exist before its first user — created_by would
-- always be NULL at insert time, making it pointless.
--
-- Both columns are nullable to handle:
--   - System-generated changes (no acting user)
--   - Bulk imports where the initiator may not map to a user
--   - Backfill gaps for records created before this migration
--
-- FK references users(id) with no ON DELETE CASCADE — if a user
-- is soft-deleted, their attribution on existing records remains.
-- ============================================================

BEGIN;

-- ============================================================
-- ADD COLUMNS
-- ============================================================

-- Portfolios
ALTER TABLE portfolios
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN updated_by uuid REFERENCES users(id);

-- Properties
ALTER TABLE properties
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN updated_by uuid REFERENCES users(id);

-- Spaces
ALTER TABLE spaces
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN updated_by uuid REFERENCES users(id);

-- Tenants
ALTER TABLE tenants
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN updated_by uuid REFERENCES users(id);

-- Leases
ALTER TABLE leases
    ADD COLUMN created_by uuid REFERENCES users(id),
    ADD COLUMN updated_by uuid REFERENCES users(id);

-- ============================================================
-- INDEXES (created_by only — updated_by changes too frequently)
-- ============================================================

CREATE INDEX idx_portfolios_created_by ON portfolios(created_by);
CREATE INDEX idx_properties_created_by ON properties(created_by);
CREATE INDEX idx_spaces_created_by ON spaces(created_by);
CREATE INDEX idx_tenants_created_by ON tenants(created_by);
CREATE INDEX idx_leases_created_by ON leases(created_by);

-- ============================================================
-- BACKFILL from audit_log
-- ============================================================
-- created_by = changed_by from the earliest 'create' audit entry
-- updated_by = changed_by from the most recent audit entry
-- Records without matching audit entries remain NULL.

-- Backfill created_by
UPDATE portfolios p
SET created_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'portfolio' AND action = 'create' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at ASC
) a
WHERE p.id = a.entity_id AND p.created_by IS NULL;

UPDATE properties p
SET created_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'property' AND action = 'create' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at ASC
) a
WHERE p.id = a.entity_id AND p.created_by IS NULL;

UPDATE spaces s
SET created_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'space' AND action = 'create' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at ASC
) a
WHERE s.id = a.entity_id AND s.created_by IS NULL;

UPDATE tenants t
SET created_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'tenant' AND action = 'create' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at ASC
) a
WHERE t.id = a.entity_id AND t.created_by IS NULL;

UPDATE leases l
SET created_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'lease' AND action = 'create' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at ASC
) a
WHERE l.id = a.entity_id AND l.created_by IS NULL;

-- Backfill updated_by (most recent audit entry of any action)
UPDATE portfolios p
SET updated_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'portfolio' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at DESC
) a
WHERE p.id = a.entity_id AND p.updated_by IS NULL;

UPDATE properties p
SET updated_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'property' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at DESC
) a
WHERE p.id = a.entity_id AND p.updated_by IS NULL;

UPDATE spaces s
SET updated_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'space' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at DESC
) a
WHERE s.id = a.entity_id AND s.updated_by IS NULL;

UPDATE tenants t
SET updated_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'tenant' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at DESC
) a
WHERE t.id = a.entity_id AND t.updated_by IS NULL;

UPDATE leases l
SET updated_by = a.changed_by
FROM (
    SELECT DISTINCT ON (entity_id) entity_id, changed_by
    FROM audit_log
    WHERE entity_type = 'lease' AND changed_by IS NOT NULL
    ORDER BY entity_id, changed_at DESC
) a
WHERE l.id = a.entity_id AND l.updated_by IS NULL;

COMMIT;
