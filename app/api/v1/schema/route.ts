import { NextRequest } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getAuthContext, requireRole } from '@/lib/auth'
import { errorResponse } from '@/lib/errors'
import { generateRequestId, successResponse } from '@/lib/response'

/**
 * GET /api/v1/schema
 *
 * Returns the full data model, relationships, and available picklist values.
 * Designed for AI agents to understand the system from a single call.
 */
export async function GET(request: NextRequest) {
  const requestId = generateRequestId()
  try {
    const auth = await getAuthContext(request)
    requireRole(auth, 'manager')

    // Fetch all active picklist values for this org (org-specific + system defaults)
    const { data: picklists } = await supabase
      .from('picklist_definitions')
      .select('entity_type, field_name, value, display_label, color, is_default')
      .or(`org_id.eq.${auth.orgId},org_id.is.null`)
      .eq('is_active', true)
      .order('entity_type')
      .order('field_name')
      .order('sort_order')

    // Group picklists by entity_type.field_name
    const picklistsByField: Record<string, Record<string, {
      value: string
      display_label: string
      color: string | null
      is_default: boolean
    }[]>> = {}

    for (const row of picklists || []) {
      if (!picklistsByField[row.entity_type]) {
        picklistsByField[row.entity_type] = {}
      }
      if (!picklistsByField[row.entity_type][row.field_name]) {
        picklistsByField[row.entity_type][row.field_name] = []
      }
      picklistsByField[row.entity_type][row.field_name].push({
        value: row.value,
        display_label: row.display_label,
        color: row.color,
        is_default: row.is_default,
      })
    }

    // Fetch custom field definitions for this org
    const { data: customFields } = await supabase
      .from('custom_field_definitions')
      .select('entity_type, field_name, display_name, field_type, options, required')
      .eq('org_id', auth.orgId)
      .order('entity_type')
      .order('field_name')

    const customFieldsByEntity: Record<string, {
      field_name: string
      display_name: string
      field_type: string
      options: unknown
      required: boolean
    }[]> = {}

    for (const row of customFields || []) {
      if (!customFieldsByEntity[row.entity_type]) {
        customFieldsByEntity[row.entity_type] = []
      }
      customFieldsByEntity[row.entity_type].push({
        field_name: row.field_name,
        display_name: row.display_name,
        field_type: row.field_type,
        options: row.options,
        required: row.required,
      })
    }

    const schema = {
      description: 'Real estate platform data model. All entities are scoped to your organization.',
      entities: {
        organization: {
          description: 'Top-level entity. Your organization.',
          fields: ['id', 'name', 'slug', 'org_type', 'industry', 'logo_url', 'settings'],
          picklists: picklistsByField['organization'] || {},
        },
        portfolio: {
          description: 'A collection of properties. Properties belong to exactly one portfolio.',
          fields: ['id', 'name', 'description', 'metadata'],
          relationships: { parent: 'organization', children: ['property'] },
        },
        property: {
          description: 'A physical building or location. Contains spaces.',
          fields: [
            'id', 'portfolio_id', 'name', 'address', 'city', 'state', 'zip',
            'lat', 'lng', 'property_type', 'total_sqft', 'year_built',
            'acquisition_date', 'acquisition_price', 'current_value', 'metadata',
          ],
          picklists: picklistsByField['property'] || {},
          custom_fields: customFieldsByEntity['property'] || [],
          relationships: { parent: 'portfolio', children: ['space', 'lease'] },
        },
        space: {
          description: 'A unit or suite within a property (e.g., Suite 200, Store 1).',
          fields: ['id', 'property_id', 'name', 'floor', 'sqft', 'status', 'space_type', 'metadata'],
          picklists: picklistsByField['space'] || {},
          custom_fields: customFieldsByEntity['space'] || [],
          relationships: { parent: 'property', children: ['lease'] },
        },
        tenant: {
          description: 'A company or entity that leases space. Exists at the org level, not under properties. Connected to spaces/properties via leases.',
          fields: [
            'id', 'company_name', 'industry', 'website',
            'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
            'credit_rating', 'parent_tenant_id', 'metadata',
          ],
          picklists: picklistsByField['tenant'] || {},
          custom_fields: customFieldsByEntity['tenant'] || [],
          relationships: {
            parent: 'organization',
            self_reference: 'parent_tenant_id (parent company → subsidiaries)',
            children: ['lease'],
          },
        },
        lease: {
          description: 'Connects a tenant to a property and optionally a specific space. A tenant can have multiple leases across different properties over time.',
          fields: [
            'id', 'tenant_id', 'property_id', 'space_id',
            'lease_type', 'status', 'start_date', 'end_date',
            'monthly_rent', 'annual_rent', 'rent_escalation',
            'security_deposit', 'renewal_options', 'terms', 'metadata',
          ],
          picklists: picklistsByField['lease'] || {},
          custom_fields: customFieldsByEntity['lease'] || [],
          relationships: {
            parents: ['tenant', 'property', 'space (optional)'],
          },
          notes: 'space_id is nullable — null means the tenant leases the entire property rather than a specific space.',
        },
      },
      hierarchy: [
        'organization → portfolio → property → space',
        'organization → tenant',
        'tenant + property + space → lease (many-to-many connector)',
      ],
      conventions: {
        soft_deletes: 'Core entities use deleted_at timestamps. Deleted records are excluded from lists by default. Use ?include_deleted=true to see them.',
        custom_fields: 'Stored in the metadata jsonb column on each entity. Field definitions are in /api/v1/custom-fields.',
        picklists: 'Dropdown values for fields like property_type, lease_status, etc. Available at /api/v1/picklists.',
        audit_log: 'Every create, update, and soft-delete is logged. Query at /api/v1/audit-log.',
        change_source: 'Include X-Change-Source header (ui, api, mcp, desktop, csv_import) on mutations to track origin.',
      },
      api_base: '/api/v1',
      endpoints: [
        'GET/POST        /properties',
        'GET/PATCH/DELETE /properties/:id',
        'GET/POST        /portfolios',
        'GET/PATCH/DELETE /portfolios/:id',
        'GET/POST        /tenants',
        'GET/PATCH/DELETE /tenants/:id',
        'GET/POST        /spaces',
        'GET/PATCH/DELETE /spaces/:id',
        'GET/POST        /leases',
        'GET/PATCH/DELETE /leases/:id',
        'GET/POST        /users',
        'GET/PATCH/DELETE /users/:id',
        'GET/POST        /picklists',
        'GET/PATCH        /picklists/:id',
        'GET/POST        /custom-fields',
        'GET/PATCH        /custom-fields/:id',
        'GET             /audit-log',
        'GET             /schema',
        'GET             /openapi.json',
        'GET             /health',
      ],
    }

    return successResponse(schema, requestId)
  } catch (err) {
    return errorResponse(err, requestId)
  }
}
