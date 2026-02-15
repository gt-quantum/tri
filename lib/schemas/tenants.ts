import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createTenantSchema = z.object({
  company_name: z.string().min(1, 'company_name is required').max(255),
  industry: z.string().optional().nullable(),
  website: z.string().url('Must be a valid URL').optional().nullable(),
  primary_contact_name: z.string().max(255).optional().nullable(),
  primary_contact_email: z.string().email('Must be a valid email').optional().nullable(),
  primary_contact_phone: z.string().max(50).optional().nullable(),
  credit_rating: z.string().optional().nullable(),
  parent_tenant_id: z.string().uuid('parent_tenant_id must be a valid UUID').optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

export const updateTenantSchema = z
  .object({
    company_name: z.string().min(1).max(255),
    industry: z.string().nullable(),
    website: z.string().url('Must be a valid URL').nullable(),
    primary_contact_name: z.string().max(255).nullable(),
    primary_contact_email: z.string().email('Must be a valid email').nullable(),
    primary_contact_phone: z.string().max(50).nullable(),
    credit_rating: z.string().nullable(),
    parent_tenant_id: z.string().uuid('parent_tenant_id must be a valid UUID').nullable(),
    metadata: z.record(z.unknown()).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listTenantsQuery = paginationSchema.extend({
  industry: z.string().optional(),
  credit_rating: z.string().optional(),
  parent_tenant_id: z.string().uuid().optional(),
  search: z.string().optional(),
  sort: z.enum(['company_name', 'industry', 'credit_rating', 'created_at']).optional().default('company_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
