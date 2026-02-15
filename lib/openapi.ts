import {
  OpenAPIRegistry,
  OpenApiGeneratorV31,
  extendZodWithOpenApi,
} from '@asteasolutions/zod-to-openapi'
import { z } from 'zod'

extendZodWithOpenApi(z)

const registry = new OpenAPIRegistry()

// ─── Security scheme ─────────────────────────────────────────────

registry.registerComponent('securitySchemes', 'bearerAuth', {
  type: 'http',
  scheme: 'bearer',
  bearerFormat: 'JWT',
  description:
    'Supabase Auth JWT token. Obtain by signing in via email/password or OAuth, then pass as `Authorization: Bearer <token>`. Tokens expire after ~1 hour; refresh via the Supabase SDK `auth.refreshSession()` method.',
})

registry.registerComponent('securitySchemes', 'apiKeyAuth', {
  type: 'http',
  scheme: 'bearer',
  description:
    'API key authentication. Create a key via the admin UI or `POST /api/v1/api-keys`, then pass it as `Authorization: Bearer sk_live_...`. Keys are long-lived (up to 1 year) and org-scoped with a configured role.',
})

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

const Invitation = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'manager', 'viewer']),
  invited_by: z.string().uuid(),
  accepted_at: z.string().datetime().nullable(),
  revoked_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime(),
  created_at: z.string().datetime(),
  invited_by_name: z.string().nullable(),
  invited_by_email: z.string().nullable(),
  status: z.enum(['pending', 'accepted', 'revoked', 'expired']),
})

registry.register('Invitation', Invitation)

const InvitationWithUrl = Invitation.omit({
  invited_by_name: true,
  invited_by_email: true,
  status: true,
}).extend({
  invite_url: z.string(),
})

registry.register('InvitationWithUrl', InvitationWithUrl)

const Organization = z.object({
  id: z.string().uuid(),
  name: z.string(),
  slug: z.string(),
  org_type: z.string(),
})

registry.register('Organization', Organization)

const ApiKey = z.object({
  id: z.string().uuid(),
  org_id: z.string().uuid(),
  name: z.string(),
  description: z.string().nullable(),
  key_prefix: z.string(),
  role: z.enum(['admin', 'manager', 'viewer']),
  scopes: z.array(z.string()).nullable(),
  created_by: z.string().uuid(),
  created_by_name: z.string().nullable(),
  created_by_email: z.string().nullable(),
  last_used_at: z.string().datetime().nullable(),
  expires_at: z.string().datetime(),
  revoked_at: z.string().datetime().nullable(),
  created_at: z.string().datetime(),
  status: z.enum(['active', 'expired', 'revoked']),
})

registry.register('ApiKey', ApiKey)

const ApiKeyWithPlaintext = ApiKey.omit({
  created_by_name: true,
  created_by_email: true,
  status: true,
}).extend({
  key: z.string().openapi({ description: 'Plaintext API key — shown exactly once at creation. Store securely.' }),
})

registry.register('ApiKeyWithPlaintext', ApiKeyWithPlaintext)

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
  description: 'Returns API status, version, and timestamp. No authentication required.',
  security: [],
  responses: {
    200: { description: 'Healthy' },
  },
})

// ─── Auth & onboarding endpoints ─────────────────────────────────

registry.registerPath({
  method: 'post',
  path: '/api/v1/auth/create-org',
  summary: 'Create organization (onboarding)',
  description:
    'Creates a new organization for an authenticated user who does not yet belong to one. The calling user becomes the org admin. After calling this endpoint, refresh your session (`auth.refreshSession()`) to get updated JWT claims with org_id and role. Returns 409 if user already belongs to an organization.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().openapi({ example: 'Apex Capital Partners' }),
            org_type: z.string().openapi({ example: 'reit' }),
            industry: z.string().optional().openapi({ example: 'Commercial Real Estate' }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Organization and user created',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              organization: Organization,
              user: z.object({
                id: z.string().uuid(),
                email: z.string().email(),
                role: z.literal('admin'),
              }),
            }),
            meta: SingleMeta,
          }),
        },
      },
    },
    409: { description: 'User already belongs to an organization', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/invitations',
  summary: 'List invitations',
  description: 'List all invitations for your organization. Includes status (pending, accepted, revoked, expired) and invited_by_name. Requires manager role or higher.',
  responses: {
    200: {
      description: 'List of invitations',
      content: {
        'application/json': {
          schema: z.object({
            data: z.array(Invitation),
            meta: PaginationMeta,
          }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/invitations',
  summary: 'Create invitation',
  description:
    'Invite a new user to your organization. Generates a secure invitation token (256-bit) with a 7-day expiry. Returns an invite_url to share. Returns 409 if the email already belongs to an active user or has a pending invitation. Requires admin role.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            email: z.string().email().openapi({ example: 'newuser@company.com' }),
            role: z.enum(['admin', 'manager', 'viewer']).openapi({ example: 'viewer' }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Invitation created with invite URL',
      content: {
        'application/json': {
          schema: z.object({ data: InvitationWithUrl, meta: SingleMeta }),
        },
      },
    },
    409: { description: 'User or pending invitation already exists', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/invitations/lookup',
  summary: 'Look up invitation by token',
  description:
    'Public endpoint (no authentication required). Validates an invitation token and returns minimal info for the signup page: email, role, and org name. Returns 404 for invalid tokens; 409 for accepted, revoked, or expired invitations.',
  security: [],
  request: {
    query: z.object({
      token: z.string().openapi({ description: 'Invitation token from the invite URL', example: 'abc123...' }),
    }),
  },
  responses: {
    200: {
      description: 'Invitation details',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({
              email: z.string().email(),
              role: z.enum(['admin', 'manager', 'viewer']),
              org_name: z.string(),
            }),
            meta: SingleMeta,
          }),
        },
      },
    },
    404: { description: 'Invalid token', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Invitation already used, revoked, or expired', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/v1/invitations/{id}/resend',
  summary: 'Resend invitation',
  description:
    'Regenerates the invitation token and extends expiry by 7 days. The old token becomes invalid. Returns the updated invitation with a new invite_url. Only works on pending invitations. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Invitation resent with new token',
      content: {
        'application/json': {
          schema: z.object({ data: InvitationWithUrl, meta: SingleMeta }),
        },
      },
    },
    404: { description: 'Invitation not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Invitation already accepted or revoked', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/v1/invitations/{id}/revoke',
  summary: 'Revoke invitation',
  description:
    'Permanently revokes a pending invitation. The invitation token will no longer be valid for signup. Only works on pending invitations. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'Invitation revoked',
      content: {
        'application/json': {
          schema: z.object({
            data: Invitation.omit({ invited_by_name: true, invited_by_email: true, status: true }),
            meta: SingleMeta,
          }),
        },
      },
    },
    404: { description: 'Invitation not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Invitation already accepted or already revoked', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/v1/users/{id}/role',
  summary: 'Change user role',
  description:
    'Update a user\'s role within the organization. Updates both the application database and JWT claims. The target user\'s next session refresh will reflect the new role. Cannot change your own role. Cannot demote the last admin. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            role: z.enum(['admin', 'manager', 'viewer']).openapi({ example: 'manager' }),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'User role updated',
      content: {
        'application/json': {
          schema: z.object({ data: User, meta: SingleMeta }),
        },
      },
    },
    403: { description: 'Cannot change own role or demote last admin', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'User not found', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/users/{id}/deactivate',
  summary: 'Deactivate user',
  description:
    'Soft-delete a user (sets deleted_at). The user will be excluded from queries and cannot log in again. Cannot deactivate yourself. Cannot deactivate the last admin. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'User deactivated',
      content: {
        'application/json': {
          schema: z.object({
            data: User.extend({ deleted_at: z.string().datetime() }),
            meta: SingleMeta,
          }),
        },
      },
    },
    403: { description: 'Cannot deactivate yourself or last admin', content: { 'application/json': { schema: ErrorResponse } } },
    404: { description: 'User not found', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/users/{id}/reactivate',
  summary: 'Reactivate user',
  description:
    'Restore a previously deactivated (soft-deleted) user. Clears the deleted_at timestamp. The user can then log in again. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'User reactivated',
      content: {
        'application/json': {
          schema: z.object({ data: User, meta: SingleMeta }),
        },
      },
    },
    404: { description: 'Deactivated user not found', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

// ─── API Key management endpoints ─────────────────────────────────

registry.registerPath({
  method: 'get',
  path: '/api/v1/api-keys',
  summary: 'List API keys',
  description:
    'List all API keys for your organization. Returns key metadata (never plaintext keys or hashes). Excludes revoked keys by default — pass `?include_revoked=true` to include them. Requires admin role.',
  responses: {
    200: {
      description: 'Paginated list of API keys',
      content: {
        'application/json': {
          schema: z.object({ data: z.array(ApiKey), meta: PaginationMeta }),
        },
      },
    },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/api-keys',
  summary: 'Create API key',
  description:
    'Create a new API key. The plaintext key is returned exactly once in the response — store it securely. The key is SHA-256 hashed before storage and cannot be retrieved again. Default expiration is 90 days (max 365). Requires admin role.',
  request: {
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().openapi({ example: 'Zapier Integration' }),
            description: z.string().optional().openapi({ example: 'Used by our Zapier workflow for lease updates' }),
            role: z.enum(['admin', 'manager', 'viewer']).openapi({ example: 'manager' }),
            expires_in_days: z.number().optional().openapi({ example: 90 }),
          }),
        },
      },
    },
  },
  responses: {
    201: {
      description: 'API key created with plaintext key (shown once)',
      content: {
        'application/json': {
          schema: z.object({ data: ApiKeyWithPlaintext, meta: SingleMeta }),
        },
      },
    },
    400: { description: 'Validation error', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'get',
  path: '/api/v1/api-keys/{id}',
  summary: 'Get API key details',
  description: 'Get details of a specific API key. Never returns the plaintext key. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'API key details',
      content: {
        'application/json': {
          schema: z.object({ data: ApiKey, meta: SingleMeta }),
        },
      },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'patch',
  path: '/api/v1/api-keys/{id}',
  summary: 'Update API key metadata',
  description: 'Update name or description of an API key. Cannot change role, expiry, or the key itself — create a new key instead. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
    body: {
      content: {
        'application/json': {
          schema: z.object({
            name: z.string().optional(),
            description: z.string().nullable().optional(),
          }),
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Updated API key',
      content: {
        'application/json': {
          schema: z.object({ data: ApiKey.omit({ created_by_name: true, created_by_email: true, status: true }), meta: SingleMeta }),
        },
      },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Key is revoked', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'delete',
  path: '/api/v1/api-keys/{id}',
  summary: 'Revoke API key',
  description:
    'Immediately revoke an API key. Any integrations using this key will lose access. The key record is preserved for audit purposes (soft revocation). Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    200: {
      description: 'API key revoked',
      content: {
        'application/json': {
          schema: z.object({
            data: z.object({ id: z.string().uuid(), revoked: z.boolean(), name: z.string() }),
            meta: SingleMeta,
          }),
        },
      },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Already revoked', content: { 'application/json': { schema: ErrorResponse } } },
  },
})

registry.registerPath({
  method: 'post',
  path: '/api/v1/api-keys/{id}/rotate',
  summary: 'Rotate API key',
  description:
    'Revoke the current key and generate a new one with the same name, role, and description. The new plaintext key is returned exactly once. Requires admin role.',
  request: {
    params: z.object({ id: z.string().uuid() }),
  },
  responses: {
    201: {
      description: 'New API key created (old key revoked)',
      content: {
        'application/json': {
          schema: z.object({
            data: ApiKeyWithPlaintext.extend({ rotated_from: z.string().uuid() }),
            meta: SingleMeta,
          }),
        },
      },
    },
    404: { description: 'Not found', content: { 'application/json': { schema: ErrorResponse } } },
    409: { description: 'Key is already revoked', content: { 'application/json': { schema: ErrorResponse } } },
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
      description: [
        'Real estate portfolio intelligence platform API. Multi-tenant, role-based access with full audit logging.',
        '',
        '## Authentication',
        '',
        'The API supports two authentication methods. Send either as a Bearer token:',
        '',
        '```',
        'Authorization: Bearer <access_token_or_api_key>',
        '```',
        '',
        '### Method 1: Supabase Auth JWT (interactive users)',
        '',
        '1. Sign in via the Supabase Auth SDK (email/password, Google OAuth, or Microsoft OAuth)',
        '2. Extract the `access_token` from the session: `session.access_token`',
        '3. Pass it in the Authorization header on every API request',
        '',
        '**Token lifecycle:**',
        '- Access tokens expire after ~1 hour',
        '- Use `supabase.auth.refreshSession()` to obtain a new token before expiry',
        '- Browser clients get automatic refresh via session cookies and middleware',
        '',
        '**JWT claims:** The token contains `org_id` and `role` in `app_metadata`. These are used for org-scoped data access and role enforcement — no additional headers needed.',
        '',
        '### Method 2: API Keys (integrations & MCP)',
        '',
        'For programmatic access (integrations, MCP servers, scripts):',
        '',
        '1. Create an API key via `POST /api/v1/api-keys` or the Settings > API Keys UI (admin only)',
        '2. Store the key securely — it is shown exactly once at creation',
        '3. Pass it as: `Authorization: Bearer sk_live_...`',
        '',
        '**Key features:**',
        '- Long-lived (up to 365 days) with mandatory expiration',
        '- Org-scoped with a configured role (admin/manager/viewer)',
        '- One-click rotation: revoke old key + generate new one',
        '- SHA-256 hashed at rest — plaintext never stored',
        '- All operations are fully audited',
        '',
        '**Best practices:**',
        '- Use the minimum required role (prefer viewer or manager over admin)',
        '- Set the `X-Change-Source` header to identify your integration (e.g., `mcp`, `google_sheets`)',
        '- Rotate keys periodically and before team member departures',
        '',
        '## Roles',
        '',
        '| Role | Permissions |',
        '|------|------------|',
        '| **viewer** | Read-only access to all org data |',
        '| **manager** | Create and update entities (properties, leases, etc.) |',
        '| **admin** | Full access including user management, invitations, and soft-deletes |',
        '',
        '## Conventions',
        '',
        '- **Multi-tenant:** All data is scoped to your organization. You only see your org\'s data.',
        '- **Soft deletes:** DELETE endpoints set `deleted_at` instead of removing records. Pass `?include_deleted=true` to include soft-deleted records in list queries.',
        '- **Enriched responses:** Responses include resolved names (e.g., `portfolio_name`, `tenant_name`) alongside foreign key IDs for AI readability.',
        '- **Audit logging:** Every mutation is recorded. Include the `X-Change-Source` header (values: `ui`, `api`, `mcp`, `desktop`, `csv_import`, `google_sheets`) to identify the calling client. Defaults to `api`.',
        '- **Pagination:** Use `?limit=25&offset=0` query parameters. Responses include `meta.total` for the full count.',
      ].join('\n'),
    },
    servers: [{ url: '/' }],
    security: [{ bearerAuth: [] }, { apiKeyAuth: [] }],
  })
}
