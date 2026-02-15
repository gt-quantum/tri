import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createLeaseSchema = z
  .object({
    tenant_id: z.string().uuid('tenant_id must be a valid UUID'),
    property_id: z.string().uuid('property_id must be a valid UUID'),
    space_id: z.string().uuid('space_id must be a valid UUID').optional().nullable(),
    lease_type: z.string().min(1, 'lease_type is required'),
    status: z.string().min(1, 'status is required'),
    start_date: z.string().date('start_date must be YYYY-MM-DD format'),
    end_date: z.string().date('end_date must be YYYY-MM-DD format'),
    monthly_rent: z.number().min(0, 'monthly_rent must be non-negative'),
    annual_rent: z.number().min(0).optional().nullable(),
    rent_escalation: z.number().min(0).max(100).optional().nullable(),
    security_deposit: z.number().min(0).optional().nullable(),
    renewal_options: z.record(z.unknown()).optional().nullable(),
    terms: z.record(z.unknown()).optional().nullable(),
    metadata: z.record(z.unknown()).optional().nullable(),
  })
  .refine((data) => data.end_date >= data.start_date, {
    message: 'end_date must be on or after start_date',
    path: ['end_date'],
  })

export const updateLeaseSchema = z
  .object({
    tenant_id: z.string().uuid('tenant_id must be a valid UUID'),
    property_id: z.string().uuid('property_id must be a valid UUID'),
    space_id: z.string().uuid('space_id must be a valid UUID').nullable(),
    lease_type: z.string().min(1),
    status: z.string().min(1),
    start_date: z.string().date('Must be YYYY-MM-DD format'),
    end_date: z.string().date('Must be YYYY-MM-DD format'),
    monthly_rent: z.number().min(0),
    annual_rent: z.number().min(0).nullable(),
    rent_escalation: z.number().min(0).max(100).nullable(),
    security_deposit: z.number().min(0).nullable(),
    renewal_options: z.record(z.unknown()).nullable(),
    terms: z.record(z.unknown()).nullable(),
    metadata: z.record(z.unknown()).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listLeasesQuery = paginationSchema.extend({
  tenant_id: z.string().uuid().optional(),
  property_id: z.string().uuid().optional(),
  space_id: z.string().uuid().optional(),
  status: z.string().optional(),
  lease_type: z.string().optional(),
  sort: z
    .enum(['start_date', 'end_date', 'monthly_rent', 'status', 'created_at'])
    .optional()
    .default('end_date'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
