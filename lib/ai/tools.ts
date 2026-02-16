// @ts-nocheck — AI SDK v6 tool() overloads don't resolve with Zod v3 optional params.
// Runtime types are enforced by Zod schemas; this file is not consumed by external code.
import { tool } from 'ai'
import { z } from 'zod'
import { supabase } from '@/lib/supabase'
import type { AuthContext } from '@/lib/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */


// Schema definitions (extracted for clean type inference)
const listPropertiesParams = z.object({
  portfolio_id: z.string().uuid().optional().describe('Filter by portfolio ID'),
  property_type: z.string().optional().describe('Filter by type: office, retail, industrial, residential, mixed_use'),
  city: z.string().optional().describe('Filter by city (partial match)'),
  state: z.string().optional().describe('Filter by state (partial match)'),
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
})

const idParam = z.object({
  id: z.string().uuid().describe('Entity ID'),
})

const listTenantsParams = z.object({
  industry: z.string().optional().describe('Filter by industry'),
  credit_rating: z.string().optional().describe('Filter by credit rating: excellent, good, fair, poor, not_rated'),
  search: z.string().optional().describe('Search by company name (partial match)'),
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
})

const listLeasesParams = z.object({
  tenant_id: z.string().uuid().optional().describe('Filter by tenant ID'),
  property_id: z.string().uuid().optional().describe('Filter by property ID'),
  status: z.string().optional().describe('Filter by status: active, expired, pending, under_negotiation, month_to_month, terminated'),
  lease_type: z.string().optional().describe('Filter by type: nnn, gross, modified_gross, percentage'),
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
})

const listSpacesParams = z.object({
  property_id: z.string().uuid().optional().describe('Filter by property ID'),
  status: z.string().optional().describe('Filter by status: occupied, vacant, under_renovation, not_available'),
  space_type: z.string().optional().describe('Filter by type: office, retail, warehouse, storage, common_area'),
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 50)'),
})

const listPortfoliosParams = z.object({
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
})

const auditLogParams = z.object({
  entity_type: z.string().optional().describe('Filter by entity type: property, tenant, lease, space, portfolio, user'),
  entity_id: z.string().uuid().optional().describe('Filter by specific entity ID'),
  action: z.string().optional().describe('Filter by action: create, update, soft_delete, restore'),
  since: z.string().optional().describe('Filter changes after this ISO date'),
  until: z.string().optional().describe('Filter changes before this ISO date'),
  limit: z.number().int().min(1).max(100).optional().describe('Max results (default 25)'),
})

/**
 * Create the set of tools available to Strata AI.
 * All tools query Supabase directly with org_id scoping.
 * Returns error objects (not throws) so Claude can communicate failures conversationally.
 */
export function createTools(auth: AuthContext) {
  return {
    listProperties: tool({
      description: 'List properties with optional filters. Returns name, address, type, sqft, value, and portfolio.',
      parameters: listPropertiesParams,
      execute: async (params: z.infer<typeof listPropertiesParams>) => {
        const limit = params.limit ?? 25
        let query = supabase
          .from('properties')
          .select('id, name, address, city, state, zip, property_type, total_sqft, current_value, portfolio_id, portfolios!inner(name)', { count: 'exact' })
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .order('name')
          .limit(limit)

        if (params.portfolio_id) query = query.eq('portfolio_id', params.portfolio_id)
        if (params.property_type) query = query.eq('property_type', params.property_type)
        if (params.city) query = query.ilike('city', `%${params.city}%`)
        if (params.state) query = query.ilike('state', `%${params.state}%`)

        const { data, error, count } = await query
        if (error) return { error: error.message }

        const rows = data as any[] || []
        const properties = rows.map((row) => {
          const { portfolios, ...rest } = row
          return { ...rest, portfolio_name: portfolios?.name ?? null }
        })

        return { properties, total: count ?? properties.length }
      },
    }),

    getProperty: tool({
      description: 'Get detailed info about a specific property including its spaces and active leases.',
      parameters: idParam,
      execute: async (params: z.infer<typeof idParam>) => {
        const { data: property, error } = await supabase
          .from('properties')
          .select('*, portfolios!inner(name)')
          .eq('id', params.id)
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .single()

        if (error || !property) return { error: `Property not found: ${params.id}` }

        const [spacesResult, leasesResult] = await Promise.all([
          supabase
            .from('spaces')
            .select('id, name, floor, sqft, status, space_type')
            .eq('property_id', params.id)
            .eq('org_id', auth.orgId)
            .is('deleted_at', null)
            .order('name'),
          supabase
            .from('leases')
            .select('id, tenant_id, space_id, status, lease_type, start_date, end_date, monthly_rent, annual_rent, tenants!inner(company_name), spaces(name)')
            .eq('property_id', params.id)
            .eq('org_id', auth.orgId)
            .is('deleted_at', null)
            .order('start_date', { ascending: false }),
        ])

        const prop = property as any
        const { portfolios, ...rest } = prop

        const leases = ((leasesResult.data || []) as any[]).map((l) => {
          const { tenants, spaces, ...lease } = l
          return { ...lease, tenant_name: tenants?.company_name, space_name: spaces?.name ?? null }
        })

        return {
          ...rest,
          portfolio_name: portfolios?.name ?? null,
          spaces: spacesResult.data || [],
          leases,
        }
      },
    }),

    listTenants: tool({
      description: 'List tenants with optional filters. Returns company name, industry, credit rating, and contact info.',
      parameters: listTenantsParams,
      execute: async (params: z.infer<typeof listTenantsParams>) => {
        const limit = params.limit ?? 25
        let query = supabase
          .from('tenants')
          .select('id, company_name, industry, credit_rating, primary_contact_name, primary_contact_email, parent_tenant_id', { count: 'exact' })
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .order('company_name')
          .limit(limit)

        if (params.industry) query = query.eq('industry', params.industry)
        if (params.credit_rating) query = query.eq('credit_rating', params.credit_rating)
        if (params.search) query = query.ilike('company_name', `%${params.search}%`)

        const { data, error, count } = await query
        if (error) return { error: error.message }

        return { tenants: data || [], total: count ?? (data || []).length }
      },
    }),

    getTenant: tool({
      description: 'Get detailed info about a specific tenant including subsidiaries and leases.',
      parameters: idParam,
      execute: async (params: z.infer<typeof idParam>) => {
        const { data: tenant, error } = await supabase
          .from('tenants')
          .select('*')
          .eq('id', params.id)
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .single()

        if (error || !tenant) return { error: `Tenant not found: ${params.id}` }

        const t = tenant as any
        const [parentResult, subsidiariesResult, leasesResult] = await Promise.all([
          t.parent_tenant_id
            ? supabase.from('tenants').select('id, company_name').eq('id', t.parent_tenant_id).single()
            : Promise.resolve({ data: null }),
          supabase
            .from('tenants')
            .select('id, company_name, industry')
            .eq('parent_tenant_id', params.id)
            .eq('org_id', auth.orgId)
            .is('deleted_at', null),
          supabase
            .from('leases')
            .select('id, property_id, space_id, status, lease_type, start_date, end_date, monthly_rent, annual_rent, properties!inner(name), spaces(name)')
            .eq('tenant_id', params.id)
            .eq('org_id', auth.orgId)
            .is('deleted_at', null)
            .order('start_date', { ascending: false }),
        ])

        const leases = ((leasesResult.data || []) as any[]).map((l) => {
          const { properties, spaces, ...lease } = l
          return { ...lease, property_name: properties?.name, space_name: spaces?.name ?? null }
        })

        return {
          ...t,
          parent_tenant_name: (parentResult.data as any)?.company_name ?? null,
          subsidiaries: subsidiariesResult.data || [],
          leases,
        }
      },
    }),

    listLeases: tool({
      description: 'List leases with optional filters. Returns tenant, property, dates, rent, and status.',
      parameters: listLeasesParams,
      execute: async (params: z.infer<typeof listLeasesParams>) => {
        const limit = params.limit ?? 25
        let query = supabase
          .from('leases')
          .select('id, tenant_id, property_id, space_id, status, lease_type, start_date, end_date, monthly_rent, annual_rent, rent_escalation, security_deposit, tenants!inner(company_name), properties!inner(name), spaces(name)', { count: 'exact' })
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .order('end_date')
          .limit(limit)

        if (params.tenant_id) query = query.eq('tenant_id', params.tenant_id)
        if (params.property_id) query = query.eq('property_id', params.property_id)
        if (params.status) query = query.eq('status', params.status)
        if (params.lease_type) query = query.eq('lease_type', params.lease_type)

        const { data, error, count } = await query
        if (error) return { error: error.message }

        const rows = data as any[] || []
        const leases = rows.map((row) => {
          const { tenants, properties, spaces, ...rest } = row
          return {
            ...rest,
            tenant_name: tenants?.company_name,
            property_name: properties?.name,
            space_name: spaces?.name ?? null,
          }
        })

        return { leases, total: count ?? leases.length }
      },
    }),

    getLease: tool({
      description: 'Get detailed info about a specific lease including full tenant, property, and space details.',
      parameters: idParam,
      execute: async (params: z.infer<typeof idParam>) => {
        const { data: lease, error } = await supabase
          .from('leases')
          .select('*, tenants!inner(id, company_name, industry, credit_rating), properties!inner(id, name, address, city, state), spaces(id, name, floor, sqft)')
          .eq('id', params.id)
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .single()

        if (error || !lease) return { error: `Lease not found: ${params.id}` }

        const l = lease as any
        const { tenants, properties, spaces, ...rest } = l
        return { ...rest, tenant: tenants, property: properties, space: spaces }
      },
    }),

    listSpaces: tool({
      description: 'List spaces with optional filters. Returns name, floor, sqft, status, type, and property.',
      parameters: listSpacesParams,
      execute: async (params: z.infer<typeof listSpacesParams>) => {
        const limit = params.limit ?? 50
        let query = supabase
          .from('spaces')
          .select('id, property_id, name, floor, sqft, status, space_type, properties!inner(name)', { count: 'exact' })
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .order('name')
          .limit(limit)

        if (params.property_id) query = query.eq('property_id', params.property_id)
        if (params.status) query = query.eq('status', params.status)
        if (params.space_type) query = query.eq('space_type', params.space_type)

        const { data, error, count } = await query
        if (error) return { error: error.message }

        const rows = data as any[] || []
        const spaces = rows.map((row) => {
          const { properties, ...rest } = row
          return { ...rest, property_name: properties?.name }
        })

        return { spaces, total: count ?? spaces.length }
      },
    }),

    listPortfolios: tool({
      description: 'List all portfolios in the organization.',
      parameters: listPortfoliosParams,
      execute: async (params: z.infer<typeof listPortfoliosParams>) => {
        const limit = params.limit ?? 25
        const { data, error, count } = await supabase
          .from('portfolios')
          .select('id, name, description', { count: 'exact' })
          .eq('org_id', auth.orgId)
          .is('deleted_at', null)
          .order('name')
          .limit(limit)

        if (error) return { error: error.message }
        return { portfolios: data || [], total: count ?? (data || []).length }
      },
    }),

    getAuditLog: tool({
      description: 'Query the audit log to see who changed what and when. Useful for tracking changes to any entity.',
      parameters: auditLogParams,
      execute: async (params: z.infer<typeof auditLogParams>) => {
        const limit = params.limit ?? 25
        let query = supabase
          .from('audit_log')
          .select('id, entity_type, entity_id, action, field_name, old_value, new_value, changed_by, changed_at, change_source, users!inner(full_name)')
          .eq('org_id', auth.orgId)
          .order('changed_at', { ascending: false })
          .limit(limit)

        if (params.entity_type) query = query.eq('entity_type', params.entity_type)
        if (params.entity_id) query = query.eq('entity_id', params.entity_id)
        if (params.action) query = query.eq('action', params.action)
        if (params.since) query = query.gte('changed_at', params.since)
        if (params.until) query = query.lte('changed_at', params.until)

        const { data, error } = await query
        if (error) return { error: error.message }

        const rows = data as any[] || []
        const entries = rows.map((row) => {
          const { users, ...rest } = row
          return { ...rest, changed_by_name: users?.full_name }
        })

        return { entries }
      },
    }),

    getSchema: tool({
      description: 'Get the data model schema including all entities, fields, relationships, and available picklist values.',
      parameters: z.object({}),
      execute: async () => {
        const { data: picklists } = await supabase
          .from('picklist_definitions')
          .select('entity_type, field_name, value, display_label')
          .or(`org_id.eq.${auth.orgId},org_id.is.null`)
          .eq('is_active', true)
          .order('entity_type')
          .order('field_name')
          .order('sort_order')

        const picklistsByField: Record<string, Record<string, string[]>> = {}
        for (const row of (picklists || []) as any[]) {
          if (!picklistsByField[row.entity_type]) picklistsByField[row.entity_type] = {}
          if (!picklistsByField[row.entity_type][row.field_name]) picklistsByField[row.entity_type][row.field_name] = []
          picklistsByField[row.entity_type][row.field_name].push(row.value)
        }

        return {
          entities: ['portfolio', 'property', 'space', 'tenant', 'lease'],
          picklists: picklistsByField,
          hierarchy: [
            'organization -> portfolio -> property -> space',
            'tenant + property + space -> lease',
          ],
        }
      },
    }),
  }
}
