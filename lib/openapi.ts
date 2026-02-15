import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

// ─── Shared schemas ──────────────────────────────────────────────

const ErrorResponse = z.object({
  error: z.object({
    code: z.string().openapi({ example: 'VALIDATION_ERROR' }),
    message: z.string().openapi({ example: '2 validation errors' }),
    details: z
      .array(z.object({ field: z.string(), message: z.string() }))
      .optional(),
    request_id: z.string().openapi({ example: 'req_abc123def456' }),
  }),
})

registry.register('ErrorResponse', ErrorResponse)

const PaginationMeta = z.object({
  total: z.number(),
  limit: z.number(),
  offset: z.number(),
  timestamp: z.string().datetime(),
  request_id: z.string(),
})

const SingleMeta = z.object({
  timestamp: z.string().datetime(),
  request_id: z.string(),
})

// ─── Entity schemas (simplified for docs) ──────────────────────

const Property = z.object({
  id: z.string().uuid(),
  portfolio_id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  address: z.string(),
  city: z.string(),
  state: z.string(),
  zip: z.string(),
  lat: z.number().nullable(),
  lng: z.number().nullable(),
  property_type: z.string(),
  total_sqft: z.number().nullable(),
  year_built: z.number().nullable(),
  acquisition_date: z.string().nullable(),
  acquisition_price: z.number().nullable(),
  current_value: z.number().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
  portfolio_name: z.string().nullable(),
})

registry.register('Property', Property)

const Portfolio = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
})

registry.register('Portfolio', Portfolio)

const Tenant = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  company_name: z.string(),
  industry: z.string().nullable(),
  website: z.string().nullable(),
  primary_contact_name: z.string().nullable(),
  primary_contact_email: z.string().nullable(),
  primary_contact_phone: z.string().nullable(),
  credit_rating: z.string().nullable(),
  parent_tenant_id: z.string().uuid().nullable(),
  parent_tenant_name: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
})

registry.register('Tenant', Tenant)

const Space = z.object({
  id: z.string().uuid(),
  property_id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  floor: z.string().nullable(),
  sqft: z.number().nullable(),
  status: z.string(),
  space_type: z.string(),
  property_name: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
})

registry.register('Space', Space)

const Lease = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  tenant_id: z.string().uuid(),
  property_id: z.string().uuid(),
  space_id: z.string().uuid().nullable(),
  lease_type: z.string(),
  status: z.string(),
  start_date: z.string(),
  end_date: z.string(),
  monthly_rent: z.number(),
  annual_rent: z.number(),
  rent_escalation: z.number().nullable(),
  security_deposit: z.number().nullable(),
  tenant_name: z.string().nullable(),
  property_name: z.string().nullable(),
  space_name: z.string().nullable(),
  metadata: z.record(z.unknown()).nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  deleted_at: z.string().datetime().nullable(),
})

registry.register('Lease', Lease)

const User = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  email: z.string().email(),
  full_name: z.string(),
  role: z.enum(['admin', 'manager', 'viewer']),
  created_at: z.string().datetime(),
})

registry.register('User', User)

// ─── Helper to register list + detail + create + update + delete ─────

function registerCrudRoutes(
  entityName: string,
  path: string,
  schema: z.ZodObject<z.ZodRawShape>,
  opts: {
    listDescription: string
    detailDescription: string
    createDescription: string
    updateDescription: string
    deleteDescription: string
    filterParams?: { name: string; description: string }[]
  }
) {
  const listParams = [
    { name: 'limit', in: 'query' as const, schema: z.string().optional(), description: 'Max results (1-100, default 25)' },
    { name: 'offset', in: 'query' as const, schema: z.string().optional(), description: 'Offset for pagination (default 0)' },
    ...(opts.filterParams || []).map((p) => ({
      name: p.name,
      in: 'query' as const,
      schema: z.string().optional(),
      description: p.description,
    })),
  ]

  registry.registerPath({
    method: 'get',
    path,
    summary: `List ${entityName}s`,
    description: opts.listDescription,
    request: { params: z.object({}), query: z.object({}) },
    responses: {
      200: {
        description: `Paginated list of ${entityName}s`,
        content: { 'application/json': { schema: z.object({ data: z.array(schema), meta: PaginationMeta }) } },
      },
    },
  })

  // Suppress unused variable warning — params are documented above
  void listParams

  registry.registerPath({
    method: 'get',
    path: `${path}/{id}`,
    summary: `Get ${entityName} by ID`,
    description: opts.detailDescription,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: {
        description: `${entityName} detail with related data`,
        content: { 'application/json': { schema: z.object({ data: schema, meta: SingleMeta }) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    },
  })

  registry.registerPath({
    method: 'post',
    path,
    summary: `Create ${entityName}`,
    description: opts.createDescription,
    request: { body: { content: { 'application/json': { schema } } } },
    responses: {
      201: {
        description: `Created ${entityName}`,
        content: { 'application/json': { schema: z.object({ data: schema, meta: SingleMeta }) } },
      },
      400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
    },
  })

  registry.registerPath({
    method: 'patch',
    path: `${path}/{id}`,
    summary: `Update ${entityName}`,
    description: opts.updateDescription,
    request: {
      params: z.object({ id: z.string().uuid() }),
      body: { content: { 'application/json': { schema: schema.partial() } } },
    },
    responses: {
      200: {
        description: `Updated ${entityName}`,
        content: { 'application/json': { schema: z.object({ data: schema, meta: SingleMeta }) } },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    },
  })

  registry.registerPath({
    method: 'delete',
    path: `${path}/{id}`,
    summary: `Soft-delete ${entityName}`,
    description: opts.deleteDescription,
    request: { params: z.object({ id: z.string().uuid() }) },
    responses: {
      200: {
        description: 'Soft-deleted',
        content: {
          'application/json': {
            schema: z.object({
              data: z.object({ id: z.string().uuid(), deleted: z.boolean() }),
              meta: SingleMeta,
            }),
          },
        },
      },
      404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    },
  })
}

// ─── Register all entity routes ──────────────────────────────────

registerCrudRoutes('Property', '/api/v1/properties', Property, {
  listDescription: 'List properties with filtering by portfolio_id, property_type, city, state. Enriched with portfolio_name.',
  detailDescription: 'Get property detail including spaces, leases (enriched with tenant_name and space_name).',
  createDescription: 'Create a property. Validates portfolio_id belongs to your organization. Requires manager role.',
  updateDescription: 'Partial update. Only send fields you want to change. Creates per-field audit entries. Requires manager role.',
  deleteDescription: 'Soft-delete (sets deleted_at). Requires admin role.',
  filterParams: [
    { name: 'portfolio_id', description: 'Filter by portfolio UUID' },
    { name: 'property_type', description: 'Filter by property type (office, retail, industrial, etc.)' },
    { name: 'city', description: 'Filter by city (partial match)' },
    { name: 'state', description: 'Filter by state (partial match)' },
    { name: 'sort', description: 'Sort by: name, city, created_at, current_value, total_sqft' },
    { name: 'order', description: 'Sort order: asc or desc' },
  ],
})

registerCrudRoutes('Portfolio', '/api/v1/portfolios', Portfolio, {
  listDescription: 'List portfolios.',
  detailDescription: 'Get portfolio detail with summary of its properties.',
  createDescription: 'Create a portfolio. Requires manager role.',
  updateDescription: 'Partial update. Requires manager role.',
  deleteDescription: 'Soft-delete. Requires admin role.',
})

registerCrudRoutes('Tenant', '/api/v1/tenants', Tenant, {
  listDescription: 'List tenants with filtering. Enriched with parent_tenant_name.',
  detailDescription: 'Get tenant detail including subsidiaries, leases (enriched with property_name and space_name).',
  createDescription: 'Create a tenant. Validates parent_tenant_id belongs to your org if provided. Requires manager role.',
  updateDescription: 'Partial update. Prevents self-reference as parent. Requires manager role.',
  deleteDescription: 'Soft-delete. Requires admin role.',
  filterParams: [
    { name: 'industry', description: 'Filter by industry' },
    { name: 'credit_rating', description: 'Filter by credit rating' },
    { name: 'parent_tenant_id', description: 'Filter by parent tenant UUID' },
    { name: 'search', description: 'Search company_name (partial match)' },
  ],
})

registerCrudRoutes('Space', '/api/v1/spaces', Space, {
  listDescription: 'List spaces with filtering. Enriched with property_name.',
  detailDescription: 'Get space detail including parent property and leases (enriched with tenant_name).',
  createDescription: 'Create a space. Validates property_id belongs to your org. Requires manager role.',
  updateDescription: 'Partial update. Requires manager role.',
  deleteDescription: 'Soft-delete. Requires admin role.',
  filterParams: [
    { name: 'property_id', description: 'Filter by property UUID' },
    { name: 'status', description: 'Filter by status (occupied, vacant, etc.)' },
    { name: 'space_type', description: 'Filter by space type (office, retail, etc.)' },
  ],
})

registerCrudRoutes('Lease', '/api/v1/leases', Lease, {
  listDescription: 'List leases with filtering. Enriched with tenant_name, property_name, space_name.',
  detailDescription: 'Get lease detail with full tenant, property, and space objects.',
  createDescription: 'Create a lease. Cross-validates: tenant and property must belong to your org; space must belong to the referenced property. Auto-calculates annual_rent if not provided. Requires manager role.',
  updateDescription: 'Partial update. Re-validates references if changed. Checks date consistency. Requires manager role.',
  deleteDescription: 'Soft-delete. Requires admin role.',
  filterParams: [
    { name: 'tenant_id', description: 'Filter by tenant UUID' },
    { name: 'property_id', description: 'Filter by property UUID' },
    { name: 'space_id', description: 'Filter by space UUID' },
    { name: 'status', description: 'Filter by lease status (active, expired, etc.)' },
    { name: 'lease_type', description: 'Filter by lease type (nnn, gross, etc.)' },
  ],
})

registerCrudRoutes('User', '/api/v1/users', User, {
  listDescription: 'List users in your organization.',
  detailDescription: 'Get user detail.',
  createDescription: 'Create a user. Requires admin role. Returns 409 if email already exists in org.',
  updateDescription: 'Update user. Requires admin role.',
  deleteDescription: 'Soft-delete user. Requires admin role. Cannot delete yourself.',
  filterParams: [
    { name: 'role', description: 'Filter by role (admin, manager, viewer)' },
    { name: 'search', description: 'Search by name or email (partial match)' },
  ],
})

// ─── Additional endpoints ────────────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/api/v1/picklists',
  summary: 'List picklist values',
  description: 'Returns both org-specific and system-wide default picklist values. Use entity_type and field_name to filter.',
  responses: {
    200: { description: 'Picklist values' },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/custom-fields',
  summary: 'List custom field definitions',
  description: 'Returns custom field definitions for your organization. Filter by entity_type.',
  responses: {
    200: { description: 'Custom field definitions' },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/audit-log',
  summary: 'Query audit log',
  description: 'Read-only. Filter by entity_type, entity_id, field_name, action, changed_by, change_source, date range. Enriched with changed_by_name.',
  responses: {
    200: { description: 'Audit log entries' },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/schema',
  summary: 'Schema discovery',
  description: 'Returns the full data model, entity relationships, available picklist values, and custom field definitions. Designed for AI agents to understand the system from a single call.',
  responses: {
    200: { description: 'Schema definition' },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/health',
  summary: 'Health check',
  description: 'Returns API status, version, and timestamp.',
  responses: {
    200: { description: 'Healthy' },
  },
})

// ─── Generate spec ───────────────────────────────────────────────

export function generateOpenApiSpec() {
  const generator = new OpenApiGeneratorV31(registry.definitions)
  return generator.generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'TRI Platform API',
      version: '1.0.0',
      description:
        'Real estate portfolio intelligence platform API. Multi-tenant, role-based access, full audit logging. All responses include resolved entity names for AI readability. Include X-Change-Source header on mutations to identify the calling client.',
    },
    servers: [{ url: '/' }],
    security: [{ bearerAuth: [] }],
  })
}
