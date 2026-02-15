#!/usr/bin/env node
/**
 * TRI Real Estate Platform — MCP Server
 *
 * Connects any MCP-compatible AI client to the TRI REST API.
 * Auth: API key via TRI_API_KEY env var.
 * Transport: stdio.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { z } from 'zod'
import { get, post, patch, del, ApiError } from './api-client.js'

// ─── Helpers ──────────────────────────────────────────────────────────

function formatResult(data: unknown): string {
  return JSON.stringify(data, null, 2)
}

function handleError(err: unknown): { content: { type: 'text'; text: string }[] } {
  if (err instanceof ApiError) {
    return { content: [{ type: 'text', text: err.toText() }] }
  }
  const message = err instanceof Error ? err.message : String(err)
  return { content: [{ type: 'text', text: `Error: ${message}` }] }
}

function ok(data: unknown): { content: { type: 'text'; text: string }[] } {
  return { content: [{ type: 'text', text: formatResult(data) }] }
}

// Optional string helper for tool params
const optStr = z.string().optional().describe

// ─── Server ───────────────────────────────────────────────────────────

const server = new McpServer({
  name: 'tri-real-estate',
  version: '1.0.0',
})

// =====================================================================
// SYSTEM TOOLS
// =====================================================================

server.tool(
  'health_check',
  'Check API health and connectivity. No auth required.',
  {},
  async () => {
    try { return ok(await get('/api/v1/health')) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_schema',
  'Get full data model: entities, fields, relationships, picklist values, custom fields, and conventions. Requires manager role. Call this first to understand the platform.',
  {},
  async () => {
    try { return ok(await get('/api/v1/schema')) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// PORTFOLIOS
// =====================================================================

server.tool(
  'list_portfolios',
  'List portfolios. Sortable and paginated.',
  {
    sort: z.enum(['name', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted records'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/portfolios', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_portfolio',
  'Get portfolio detail with property summary.',
  { id: z.string().uuid().describe('Portfolio UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/portfolios/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_portfolio',
  'Create a portfolio. Requires manager role.',
  {
    name: z.string().describe('Portfolio name'),
    description: z.string().optional().describe('Description'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/portfolios', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_portfolio',
  'Update a portfolio. Send only fields to change. Requires manager role.',
  {
    id: z.string().uuid().describe('Portfolio UUID'),
    name: z.string().optional().describe('Portfolio name'),
    description: z.string().nullable().optional().describe('Description'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/portfolios/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'delete_portfolio',
  'Soft-delete a portfolio. Requires admin role.',
  { id: z.string().uuid().describe('Portfolio UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/portfolios/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// PROPERTIES
// =====================================================================

server.tool(
  'list_properties',
  'List properties with filtering. Enriched with portfolio_name.',
  {
    portfolio_id: z.string().uuid().optional().describe('Filter by portfolio UUID'),
    property_type: z.string().optional().describe('Filter by type (office, retail, industrial, etc.)'),
    city: z.string().optional().describe('Filter by city (partial match)'),
    state: z.string().optional().describe('Filter by state (partial match)'),
    sort: z.enum(['name', 'city', 'created_at', 'current_value', 'total_sqft']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted records'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/properties', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_property',
  'Get property detail including spaces and leases (enriched with tenant/space names).',
  { id: z.string().uuid().describe('Property UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/properties/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_property',
  'Create a property. Validates portfolio_id belongs to your org. Requires manager role.',
  {
    portfolio_id: z.string().uuid().describe('Portfolio UUID'),
    name: z.string().describe('Property name'),
    address: z.string().describe('Street address'),
    city: z.string().describe('City'),
    state: z.string().describe('State'),
    zip: z.string().describe('ZIP code'),
    property_type: z.string().describe('Property type (office, retail, industrial, etc.)'),
    lat: z.number().optional().describe('Latitude (-90 to 90)'),
    lng: z.number().optional().describe('Longitude (-180 to 180)'),
    total_sqft: z.number().optional().describe('Total square footage'),
    year_built: z.number().optional().describe('Year built (1800-2100)'),
    acquisition_date: z.string().optional().describe('Acquisition date (YYYY-MM-DD)'),
    acquisition_price: z.number().optional().describe('Acquisition price'),
    current_value: z.number().optional().describe('Current estimated value'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/properties', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_property',
  'Update a property. Send only fields to change. Requires manager role.',
  {
    id: z.string().uuid().describe('Property UUID'),
    portfolio_id: z.string().uuid().optional().describe('Portfolio UUID'),
    name: z.string().optional().describe('Property name'),
    address: z.string().optional().describe('Street address'),
    city: z.string().optional().describe('City'),
    state: z.string().optional().describe('State'),
    zip: z.string().optional().describe('ZIP code'),
    property_type: z.string().optional().describe('Property type'),
    lat: z.number().nullable().optional().describe('Latitude'),
    lng: z.number().nullable().optional().describe('Longitude'),
    total_sqft: z.number().nullable().optional().describe('Total square footage'),
    year_built: z.number().nullable().optional().describe('Year built'),
    acquisition_date: z.string().nullable().optional().describe('Acquisition date (YYYY-MM-DD)'),
    acquisition_price: z.number().nullable().optional().describe('Acquisition price'),
    current_value: z.number().nullable().optional().describe('Current estimated value'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/properties/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'delete_property',
  'Soft-delete a property. Requires admin role.',
  { id: z.string().uuid().describe('Property UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/properties/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// SPACES
// =====================================================================

server.tool(
  'list_spaces',
  'List spaces with filtering. Enriched with property_name.',
  {
    property_id: z.string().uuid().optional().describe('Filter by property UUID'),
    status: z.string().optional().describe('Filter by status (occupied, vacant, etc.)'),
    space_type: z.string().optional().describe('Filter by space type (office, retail, etc.)'),
    sort: z.enum(['name', 'floor', 'sqft', 'status', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted records'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/spaces', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_space',
  'Get space detail including property info and leases (enriched with tenant names).',
  { id: z.string().uuid().describe('Space UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/spaces/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_space',
  'Create a space. Validates property_id belongs to your org. Requires manager role.',
  {
    property_id: z.string().uuid().describe('Property UUID'),
    name: z.string().describe('Space name'),
    status: z.string().describe('Status (occupied, vacant, etc.)'),
    space_type: z.string().describe('Space type (office, retail, etc.)'),
    floor: z.string().optional().describe('Floor'),
    sqft: z.number().optional().describe('Square footage'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/spaces', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_space',
  'Update a space. Send only fields to change. Requires manager role.',
  {
    id: z.string().uuid().describe('Space UUID'),
    property_id: z.string().uuid().optional().describe('Property UUID'),
    name: z.string().optional().describe('Space name'),
    status: z.string().optional().describe('Status'),
    space_type: z.string().optional().describe('Space type'),
    floor: z.string().nullable().optional().describe('Floor'),
    sqft: z.number().nullable().optional().describe('Square footage'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/spaces/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'delete_space',
  'Soft-delete a space. Requires admin role.',
  { id: z.string().uuid().describe('Space UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/spaces/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// TENANTS
// =====================================================================

server.tool(
  'list_tenants',
  'List tenants with filtering. Enriched with parent_tenant_name.',
  {
    industry: z.string().optional().describe('Filter by industry'),
    credit_rating: z.string().optional().describe('Filter by credit rating'),
    parent_tenant_id: z.string().uuid().optional().describe('Filter by parent tenant UUID'),
    search: z.string().optional().describe('Search company_name (partial match)'),
    sort: z.enum(['company_name', 'industry', 'credit_rating', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted records'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/tenants', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_tenant',
  'Get tenant detail including subsidiaries and leases (enriched with property/space names).',
  { id: z.string().uuid().describe('Tenant UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/tenants/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_tenant',
  'Create a tenant. Requires manager role.',
  {
    company_name: z.string().describe('Company name'),
    industry: z.string().optional().describe('Industry'),
    website: z.string().optional().describe('Website URL'),
    primary_contact_name: z.string().optional().describe('Primary contact name'),
    primary_contact_email: z.string().optional().describe('Primary contact email'),
    primary_contact_phone: z.string().optional().describe('Primary contact phone'),
    credit_rating: z.string().optional().describe('Credit rating'),
    parent_tenant_id: z.string().uuid().optional().describe('Parent tenant UUID (for subsidiaries)'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/tenants', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_tenant',
  'Update a tenant. Send only fields to change. Requires manager role.',
  {
    id: z.string().uuid().describe('Tenant UUID'),
    company_name: z.string().optional().describe('Company name'),
    industry: z.string().nullable().optional().describe('Industry'),
    website: z.string().nullable().optional().describe('Website URL'),
    primary_contact_name: z.string().nullable().optional().describe('Primary contact name'),
    primary_contact_email: z.string().nullable().optional().describe('Primary contact email'),
    primary_contact_phone: z.string().nullable().optional().describe('Primary contact phone'),
    credit_rating: z.string().nullable().optional().describe('Credit rating'),
    parent_tenant_id: z.string().uuid().nullable().optional().describe('Parent tenant UUID'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/tenants/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'delete_tenant',
  'Soft-delete a tenant. Requires admin role.',
  { id: z.string().uuid().describe('Tenant UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/tenants/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// LEASES
// =====================================================================

server.tool(
  'list_leases',
  'List leases with filtering. Enriched with tenant_name, property_name, space_name.',
  {
    tenant_id: z.string().uuid().optional().describe('Filter by tenant UUID'),
    property_id: z.string().uuid().optional().describe('Filter by property UUID'),
    space_id: z.string().uuid().optional().describe('Filter by space UUID'),
    status: z.string().optional().describe('Filter by lease status (active, expired, etc.)'),
    lease_type: z.string().optional().describe('Filter by lease type (nnn, gross, etc.)'),
    sort: z.enum(['start_date', 'end_date', 'monthly_rent', 'status', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include soft-deleted records'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/leases', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_lease',
  'Get lease detail with full tenant, property, and space objects.',
  { id: z.string().uuid().describe('Lease UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/leases/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_lease',
  'Create a lease. Cross-validates tenant/property/space belong to your org. Auto-calculates annual_rent. Requires manager role.',
  {
    tenant_id: z.string().uuid().describe('Tenant UUID'),
    property_id: z.string().uuid().describe('Property UUID'),
    space_id: z.string().uuid().optional().describe('Space UUID (optional)'),
    lease_type: z.string().describe('Lease type (nnn, gross, modified_gross, etc.)'),
    status: z.string().describe('Lease status (active, expired, etc.)'),
    start_date: z.string().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().describe('End date (YYYY-MM-DD)'),
    monthly_rent: z.number().describe('Monthly rent amount'),
    annual_rent: z.number().optional().describe('Annual rent (auto-calculated if omitted)'),
    rent_escalation: z.number().optional().describe('Annual rent escalation percentage'),
    security_deposit: z.number().optional().describe('Security deposit amount'),
    metadata: z.record(z.string(), z.unknown()).optional().describe('Custom field values'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/leases', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_lease',
  'Update a lease. Send only fields to change. Re-validates references if changed. Requires manager role.',
  {
    id: z.string().uuid().describe('Lease UUID'),
    tenant_id: z.string().uuid().optional().describe('Tenant UUID'),
    property_id: z.string().uuid().optional().describe('Property UUID'),
    space_id: z.string().uuid().nullable().optional().describe('Space UUID'),
    lease_type: z.string().optional().describe('Lease type'),
    status: z.string().optional().describe('Lease status'),
    start_date: z.string().optional().describe('Start date (YYYY-MM-DD)'),
    end_date: z.string().optional().describe('End date (YYYY-MM-DD)'),
    monthly_rent: z.number().optional().describe('Monthly rent'),
    annual_rent: z.number().nullable().optional().describe('Annual rent'),
    rent_escalation: z.number().nullable().optional().describe('Rent escalation %'),
    security_deposit: z.number().nullable().optional().describe('Security deposit'),
    metadata: z.record(z.string(), z.unknown()).nullable().optional().describe('Custom field values'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/leases/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'delete_lease',
  'Soft-delete a lease. Requires admin role.',
  { id: z.string().uuid().describe('Lease UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/leases/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// USERS (manager+ for list/detail, admin for mutations)
// =====================================================================

server.tool(
  'list_users',
  'List users in your organization. Requires manager role.',
  {
    role: z.enum(['admin', 'manager', 'viewer']).optional().describe('Filter by role'),
    search: z.string().optional().describe('Search by name or email (partial match)'),
    sort: z.enum(['full_name', 'email', 'role', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    include_deleted: z.enum(['true', 'false']).optional().describe('Include deactivated users'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/users', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_user',
  'Get user detail. Requires manager role.',
  { id: z.string().uuid().describe('User UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/users/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'change_user_role',
  'Change a user\'s role. Cannot change own role or demote last admin. Requires admin role.',
  {
    id: z.string().uuid().describe('User UUID'),
    role: z.enum(['admin', 'manager', 'viewer']).describe('New role'),
  },
  async ({ id, role }) => {
    try { return ok(await patch(`/api/v1/users/${id}/role`, { role })) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'deactivate_user',
  'Deactivate (soft-delete) a user. Cannot deactivate yourself or last admin. Requires admin role.',
  { id: z.string().uuid().describe('User UUID') },
  async ({ id }) => {
    try { return ok(await post(`/api/v1/users/${id}/deactivate`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'reactivate_user',
  'Reactivate a previously deactivated user. Requires admin role.',
  { id: z.string().uuid().describe('User UUID') },
  async ({ id }) => {
    try { return ok(await post(`/api/v1/users/${id}/reactivate`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// INVITATIONS (admin for most, manager+ for list)
// =====================================================================

server.tool(
  'list_invitations',
  'List all invitations for your organization. Includes status and invited_by_name. Requires manager role.',
  {
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/invitations', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_invitation',
  'Invite a new user to your organization. Generates secure token with 7-day expiry. Returns invite URL. Requires admin role.',
  {
    email: z.string().describe('Email address to invite'),
    role: z.enum(['admin', 'manager', 'viewer']).describe('Role to assign'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/invitations', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'resend_invitation',
  'Regenerate invitation token and extend expiry. Old token becomes invalid. Requires admin role.',
  { id: z.string().uuid().describe('Invitation UUID') },
  async ({ id }) => {
    try { return ok(await patch(`/api/v1/invitations/${id}/resend`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'revoke_invitation',
  'Permanently revoke a pending invitation. Requires admin role.',
  { id: z.string().uuid().describe('Invitation UUID') },
  async ({ id }) => {
    try { return ok(await patch(`/api/v1/invitations/${id}/revoke`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// PICKLISTS
// =====================================================================

server.tool(
  'list_picklists',
  'List picklist values (org-specific + system defaults). Use entity_type and field_name to filter.',
  {
    entity_type: z.string().optional().describe('Filter by entity type (property, space, tenant, lease)'),
    field_name: z.string().optional().describe('Filter by field name (property_type, status, etc.)'),
    is_active: z.enum(['true', 'false']).optional().describe('Filter by active status'),
    sort: z.enum(['sort_order', 'value', 'display_label', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/picklists', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_picklist',
  'Get a specific picklist value by ID.',
  { id: z.string().uuid().describe('Picklist UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/picklists/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_picklist',
  'Create an org-specific picklist value. Requires manager role.',
  {
    entity_type: z.string().describe('Entity type (property, space, tenant, lease)'),
    field_name: z.string().describe('Field name (property_type, status, lease_type, etc.)'),
    value: z.string().describe('Internal value'),
    display_label: z.string().describe('Display label'),
    color: z.string().optional().describe('Color code'),
    sort_order: z.number().optional().describe('Sort order (default 0)'),
    is_default: z.boolean().optional().describe('Is default value'),
    is_active: z.boolean().optional().describe('Is active'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/picklists', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_picklist',
  'Update an org-specific picklist value. Cannot modify system picklists. Requires manager role.',
  {
    id: z.string().uuid().describe('Picklist UUID'),
    display_label: z.string().optional().describe('Display label'),
    color: z.string().nullable().optional().describe('Color code'),
    sort_order: z.number().optional().describe('Sort order'),
    is_default: z.boolean().optional().describe('Is default'),
    is_active: z.boolean().optional().describe('Is active'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/picklists/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// CUSTOM FIELDS
// =====================================================================

server.tool(
  'list_custom_fields',
  'List custom field definitions for your organization.',
  {
    entity_type: z.string().optional().describe('Filter by entity type (property, space, tenant, lease, portfolio)'),
    sort: z.enum(['field_name', 'display_name', 'entity_type', 'created_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/custom-fields', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_custom_field',
  'Get a specific custom field definition.',
  { id: z.string().uuid().describe('Custom field UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/custom-fields/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_custom_field',
  'Create a custom field definition. field_name must be snake_case. Requires manager role.',
  {
    entity_type: z.enum(['property', 'space', 'tenant', 'lease', 'portfolio']).describe('Entity type'),
    field_name: z.string().describe('Field name (snake_case, e.g. environmental_risk_score)'),
    display_name: z.string().describe('Display name'),
    field_type: z.enum(['text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url']).describe('Field type'),
    options: z.record(z.string(), z.unknown()).optional().describe('Options for select/multi_select fields'),
    required: z.boolean().optional().describe('Whether the field is required'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/custom-fields', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_custom_field',
  'Update a custom field definition. Requires manager role.',
  {
    id: z.string().uuid().describe('Custom field UUID'),
    display_name: z.string().optional().describe('Display name'),
    field_type: z.enum(['text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url']).optional().describe('Field type'),
    options: z.record(z.string(), z.unknown()).nullable().optional().describe('Options'),
    required: z.boolean().optional().describe('Whether the field is required'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/custom-fields/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// AUDIT LOG
// =====================================================================

server.tool(
  'query_audit_log',
  'Query the audit log. Read-only. Enriched with changed_by_name. Filter by entity, action, user, source, and date range.',
  {
    entity_type: z.string().optional().describe('Filter by entity type (property, tenant, lease, etc.)'),
    entity_id: z.string().uuid().optional().describe('Filter by entity UUID'),
    field_name: z.string().optional().describe('Filter by field name'),
    action: z.enum(['create', 'update', 'soft_delete', 'restore']).optional().describe('Filter by action'),
    changed_by: z.string().uuid().optional().describe('Filter by user UUID'),
    change_source: z.string().optional().describe('Filter by source (ui, api, mcp, desktop, csv_import, etc.)'),
    since: z.string().optional().describe('Filter changes after this ISO-8601 datetime'),
    until: z.string().optional().describe('Filter changes before this ISO-8601 datetime'),
    sort: z.enum(['changed_at']).optional().describe('Sort field'),
    order: z.enum(['asc', 'desc']).optional().describe('Sort order (default desc)'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/audit-log', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// API KEYS (admin only)
// =====================================================================

server.tool(
  'list_api_keys',
  'List API keys for your organization. Excludes revoked by default. Requires admin role.',
  {
    include_revoked: z.enum(['true', 'false']).optional().describe('Include revoked keys'),
    limit: z.string().optional().describe('Max results (1-100, default 25)'),
    offset: z.string().optional().describe('Pagination offset'),
  },
  async (params) => {
    try { return ok(await get('/api/v1/api-keys', params as Record<string, string | undefined>)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'get_api_key',
  'Get API key details (never returns plaintext). Requires admin role.',
  { id: z.string().uuid().describe('API key UUID') },
  async ({ id }) => {
    try { return ok(await get(`/api/v1/api-keys/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'create_api_key',
  'Create a new API key. Returns plaintext key ONCE — store it securely. Default expiry 90 days, max 365. Requires admin role.',
  {
    name: z.string().describe('Key name (e.g. "Zapier Integration")'),
    role: z.enum(['admin', 'manager', 'viewer']).describe('Key role'),
    description: z.string().optional().describe('Key description'),
    expires_in_days: z.number().optional().describe('Expiry in days (1-365, default 90)'),
  },
  async (params) => {
    try { return ok(await post('/api/v1/api-keys', params)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'update_api_key',
  'Update API key name or description. Cannot change role or expiry. Requires admin role.',
  {
    id: z.string().uuid().describe('API key UUID'),
    name: z.string().optional().describe('Key name'),
    description: z.string().nullable().optional().describe('Key description'),
  },
  async ({ id, ...body }) => {
    try { return ok(await patch(`/api/v1/api-keys/${id}`, body)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'revoke_api_key',
  'Immediately revoke an API key. Integrations using this key will lose access. Requires admin role.',
  { id: z.string().uuid().describe('API key UUID') },
  async ({ id }) => {
    try { return ok(await del(`/api/v1/api-keys/${id}`)) }
    catch (e) { return handleError(e) }
  }
)

server.tool(
  'rotate_api_key',
  'Rotate an API key: revokes old key and creates new one with same metadata. Returns new plaintext key ONCE. Requires admin role.',
  { id: z.string().uuid().describe('API key UUID to rotate') },
  async ({ id }) => {
    try { return ok(await post(`/api/v1/api-keys/${id}/rotate`)) }
    catch (e) { return handleError(e) }
  }
)

// =====================================================================
// RESOURCES
// =====================================================================

server.resource(
  'properties-list',
  'tri://properties',
  { description: 'All properties in the organization with portfolio names', mimeType: 'application/json' },
  async () => {
    try {
      const data = await get('/api/v1/properties', { limit: '100' })
      return { contents: [{ uri: 'tri://properties', text: formatResult(data), mimeType: 'application/json' }] }
    } catch (e) {
      const msg = e instanceof ApiError ? e.toText() : String(e)
      return { contents: [{ uri: 'tri://properties', text: msg, mimeType: 'text/plain' }] }
    }
  }
)

server.resource(
  'tenants-list',
  'tri://tenants',
  { description: 'All tenants in the organization', mimeType: 'application/json' },
  async () => {
    try {
      const data = await get('/api/v1/tenants', { limit: '100' })
      return { contents: [{ uri: 'tri://tenants', text: formatResult(data), mimeType: 'application/json' }] }
    } catch (e) {
      const msg = e instanceof ApiError ? e.toText() : String(e)
      return { contents: [{ uri: 'tri://tenants', text: msg, mimeType: 'text/plain' }] }
    }
  }
)

server.resource(
  'leases-list',
  'tri://leases',
  { description: 'All leases with tenant, property, and space names', mimeType: 'application/json' },
  async () => {
    try {
      const data = await get('/api/v1/leases', { limit: '100' })
      return { contents: [{ uri: 'tri://leases', text: formatResult(data), mimeType: 'application/json' }] }
    } catch (e) {
      const msg = e instanceof ApiError ? e.toText() : String(e)
      return { contents: [{ uri: 'tri://leases', text: msg, mimeType: 'text/plain' }] }
    }
  }
)

server.resource(
  'schema',
  'tri://schema',
  { description: 'Full data model, relationships, picklist values, and conventions', mimeType: 'application/json' },
  async () => {
    try {
      const data = await get('/api/v1/schema')
      return { contents: [{ uri: 'tri://schema', text: formatResult(data), mimeType: 'application/json' }] }
    } catch (e) {
      const msg = e instanceof ApiError ? e.toText() : String(e)
      return { contents: [{ uri: 'tri://schema', text: msg, mimeType: 'text/plain' }] }
    }
  }
)

// =====================================================================
// START
// =====================================================================

async function main() {
  if (!process.env.TRI_API_KEY) {
    console.error('Error: TRI_API_KEY environment variable is required.')
    console.error('Create an API key at /settings/api-keys or via POST /api/v1/api-keys')
    process.exit(1)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
}

main().catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
