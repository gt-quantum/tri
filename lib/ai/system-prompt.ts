import { supabase } from '@/lib/supabase'
import type { AuthContext } from '@/lib/auth'

/**
 * Schema context cache — refreshed every 5 minutes.
 */
let cachedSchema: string | null = null
let cacheTimestamp = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Fetch the schema context for the system prompt.
 * Mirrors the logic from GET /api/v1/schema.
 */
async function getSchemaContext(orgId: string): Promise<string> {
  const now = Date.now()
  if (cachedSchema && now - cacheTimestamp < CACHE_TTL) {
    return cachedSchema
  }

  // Fetch picklist values
  const { data: picklists } = await supabase
    .from('picklist_definitions')
    .select('entity_type, field_name, value, display_label')
    .or(`org_id.eq.${orgId},org_id.is.null`)
    .eq('is_active', true)
    .order('entity_type')
    .order('field_name')
    .order('sort_order')

  const picklistsByField: Record<string, Record<string, string[]>> = {}
  for (const row of picklists || []) {
    if (!picklistsByField[row.entity_type]) picklistsByField[row.entity_type] = {}
    if (!picklistsByField[row.entity_type][row.field_name]) picklistsByField[row.entity_type][row.field_name] = []
    picklistsByField[row.entity_type][row.field_name].push(row.value)
  }

  // Fetch custom field definitions
  const { data: customFields } = await supabase
    .from('custom_field_definitions')
    .select('entity_type, field_name, display_name, field_type')
    .eq('org_id', orgId)
    .order('entity_type')
    .order('field_name')

  const customFieldsByEntity: Record<string, { field_name: string; display_name: string; field_type: string }[]> = {}
  for (const row of customFields || []) {
    if (!customFieldsByEntity[row.entity_type]) customFieldsByEntity[row.entity_type] = []
    customFieldsByEntity[row.entity_type].push({
      field_name: row.field_name,
      display_name: row.display_name,
      field_type: row.field_type,
    })
  }

  const schema = JSON.stringify({
    entities: {
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
        description: 'A company or entity that leases space. Connected to spaces/properties via leases.',
        fields: [
          'id', 'company_name', 'industry', 'website',
          'primary_contact_name', 'primary_contact_email', 'primary_contact_phone',
          'credit_rating', 'parent_tenant_id', 'metadata',
        ],
        picklists: picklistsByField['tenant'] || {},
        custom_fields: customFieldsByEntity['tenant'] || [],
        relationships: { parent: 'organization', self_reference: 'parent_tenant_id', children: ['lease'] },
      },
      lease: {
        description: 'Connects a tenant to a property and optionally a specific space.',
        fields: [
          'id', 'tenant_id', 'property_id', 'space_id',
          'lease_type', 'status', 'start_date', 'end_date',
          'monthly_rent', 'annual_rent', 'rent_escalation',
          'security_deposit', 'renewal_options', 'terms', 'metadata',
        ],
        picklists: picklistsByField['lease'] || {},
        custom_fields: customFieldsByEntity['lease'] || [],
        relationships: { parents: ['tenant', 'property', 'space (optional)'] },
        notes: 'space_id is nullable — null means the tenant leases the entire property.',
      },
    },
    hierarchy: [
      'organization -> portfolio -> property -> space',
      'organization -> tenant',
      'tenant + property + space -> lease (many-to-many connector)',
    ],
    conventions: {
      soft_deletes: 'Core entities use deleted_at timestamps. Deleted records excluded by default.',
      custom_fields: 'Stored in metadata jsonb column. Field definitions via getSchema tool.',
      picklists: 'Dropdown values for fields like property_type, lease_status, etc.',
      audit_log: 'Every create, update, and soft-delete is logged with old/new values.',
    },
  }, null, 0)

  cachedSchema = schema
  cacheTimestamp = now
  return schema
}

/**
 * Build the system prompt in two segments:
 * - cached: persona + schema (eligible for Anthropic prompt caching)
 * - dynamic: user context, portfolio, page info
 */
export async function buildSystemPrompt(
  auth: AuthContext,
  context?: {
    page?: string
    portfolioId?: string
    entityType?: string
    entityId?: string
    selectedText?: string
    aiContext?: Record<string, unknown>
  }
): Promise<{ cached: string; dynamic: string }> {
  const schema = await getSchemaContext(auth.orgId)

  const cached = `You are Strata AI, a conversational AI assistant for a commercial real estate management platform called TRI. You help users understand and query their portfolio data.

## Your Capabilities
- Query properties, spaces, tenants, leases, and portfolios using your tools
- Analyze occupancy rates, rent rolls, lease expirations, and financial metrics
- Look up audit history to see who changed what and when
- Answer questions about the data model and available fields

## Guidelines
- Be concise and direct. Users are real estate professionals who value efficiency.
- When answering questions about data, always use your tools to get current information — never guess or use stale data.
- Format numbers as currency ($1,234,567), percentages (94.2%), or with commas (1,234) as appropriate.
- When listing entities, show the most relevant fields (name, key metrics) in a readable format.
- If a query is ambiguous, ask a clarifying question before making tool calls.
- If a tool returns an error, explain what went wrong in plain language.
- Never expose internal IDs unless the user specifically asks for them.
- You can make multiple tool calls in sequence to answer complex questions.
- When calculating aggregates (totals, averages, counts), show your work briefly so the user can verify.
- When mentioning specific properties or tenants, link them using markdown: [Property Name](/properties/{id}) or [Tenant Name](/tenants/{id}). This lets users click through to the detail page. Do NOT link leases, spaces, or portfolios — they don't have detail pages.

## Data Model
${schema}

## Available Picklist Values
The picklist values above are the valid options for dropdown fields. When filtering, use these exact values.`

  // Build dynamic context
  const parts: string[] = []
  parts.push(`## Current User`)
  parts.push(`- Name: ${auth.fullName}`)
  parts.push(`- Role: ${auth.role}`)

  if (context?.page) {
    parts.push(`\n## Current Page Context`)
    parts.push(`- Page: ${context.page}`)
    if (context.portfolioId) parts.push(`- Active portfolio filter: ${context.portfolioId}`)
    if (context.entityType && context.entityId) {
      parts.push(`- Viewing: ${context.entityType} ${context.entityId}`)
    }
    if (context.selectedText) {
      parts.push(`- User selected this text on the page: "${context.selectedText}"`)
      if (context.aiContext) {
        parts.push(`- Element context: ${JSON.stringify(context.aiContext)}`)
        // Provide human-readable hints based on context type
        if (context.aiContext.type === 'kpi' && context.aiContext.metric) {
          parts.push(`- This is a KPI metric: ${String(context.aiContext.metric).replace(/_/g, ' ')}`)
        } else if (context.aiContext.type === 'entity' && context.aiContext.entity) {
          parts.push(`- This is from a ${context.aiContext.entity} named "${context.aiContext.name}" (ID: ${context.aiContext.id})`)
        }
      }
      parts.push(`- The user is asking about this specific value/text. Use the element context and page context to explain what it means, how it was calculated, and provide relevant details.`)
    }
  }

  const dynamic = parts.join('\n')

  return { cached, dynamic }
}
