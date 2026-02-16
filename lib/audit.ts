import { supabase } from '@/lib/supabase'

/**
 * Valid change sources for audit log entries.
 * Clients identify themselves via the X-Change-Source header.
 */
export type ChangeSource =
  | 'ui'
  | 'api'
  | 'mcp'
  | 'agent'
  | 'desktop'
  | 'csv_import'
  | 'google_sheets'
  | 'system'

const VALID_SOURCES = new Set<ChangeSource>([
  'ui', 'api', 'mcp', 'agent', 'desktop', 'csv_import', 'google_sheets', 'system',
])

/**
 * Parse the change source from the request header.
 * Defaults to 'api' if not provided or invalid.
 */
export function parseChangeSource(header: string | null): ChangeSource {
  if (header && VALID_SOURCES.has(header as ChangeSource)) {
    return header as ChangeSource
  }
  return 'api'
}

/**
 * Write an audit log entry for a create action.
 * Fire-and-forget: does not block the response.
 */
export function auditCreate(params: {
  orgId: string
  entityType: string
  entityId: string
  newValues: Record<string, unknown>
  changedBy: string
  changeSource: ChangeSource
}): void {
  supabase.from('audit_log').insert({
    org_id: params.orgId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: 'create',
    field_name: null,
    old_value: null,
    new_value: params.newValues,
    changed_by: params.changedBy,
    changed_at: new Date().toISOString(),
    change_source: params.changeSource,
  }).then(({ error }) => {
    if (error) console.error('Audit log (create) failed:', error.message)
  })
}

/**
 * Write audit log entries for an update action.
 * Creates one entry per changed field.
 * Fire-and-forget: does not block the response.
 */
export function auditUpdate(params: {
  orgId: string
  entityType: string
  entityId: string
  oldRecord: Record<string, unknown>
  newRecord: Record<string, unknown>
  changedBy: string
  changeSource: ChangeSource
}): void {
  const entries: Record<string, unknown>[] = []

  for (const key of Object.keys(params.newRecord)) {
    const oldVal = params.oldRecord[key]
    const newVal = params.newRecord[key]

    // Skip fields that didn't change
    if (JSON.stringify(oldVal) === JSON.stringify(newVal)) continue
    // Skip system fields
    if (key === 'updated_at') continue

    entries.push({
      org_id: params.orgId,
      entity_type: params.entityType,
      entity_id: params.entityId,
      action: 'update',
      field_name: key,
      old_value: oldVal,
      new_value: newVal,
      changed_by: params.changedBy,
      changed_at: new Date().toISOString(),
      change_source: params.changeSource,
    })
  }

  if (entries.length > 0) {
    supabase.from('audit_log').insert(entries).then(({ error }) => {
      if (error) console.error('Audit log (update) failed:', error.message)
    })
  }
}

/**
 * Write an audit log entry for a soft-delete action.
 * Fire-and-forget: does not block the response.
 */
export function auditSoftDelete(params: {
  orgId: string
  entityType: string
  entityId: string
  changedBy: string
  changeSource: ChangeSource
}): void {
  supabase.from('audit_log').insert({
    org_id: params.orgId,
    entity_type: params.entityType,
    entity_id: params.entityId,
    action: 'soft_delete',
    field_name: null,
    old_value: null,
    new_value: null,
    changed_by: params.changedBy,
    changed_at: new Date().toISOString(),
    change_source: params.changeSource,
  }).then(({ error }) => {
    if (error) console.error('Audit log (soft_delete) failed:', error.message)
  })
}
