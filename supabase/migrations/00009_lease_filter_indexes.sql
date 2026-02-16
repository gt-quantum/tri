-- Migration 00009: Add missing composite indexes for lease filter columns
-- These columns are used in GET /api/v1/leases?status=...&lease_type=...
-- Without indexes, these filters require sequential scans on larger datasets.

CREATE INDEX IF NOT EXISTS idx_leases_org_status
  ON leases(org_id, status);

CREATE INDEX IF NOT EXISTS idx_leases_org_lease_type
  ON leases(org_id, lease_type);
