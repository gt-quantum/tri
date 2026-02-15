import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createSpaceSchema = z.object({
  property_id: z.string().uuid('property_id must be a valid UUID'),
  name: z.string().min(1, 'name is required').max(255),
  floor: z.string().max(50).optional().nullable(),
  sqft: z.number().positive('sqft must be positive').optional().nullable(),
  status: z.string().min(1, 'status is required'),
  space_type: z.string().min(1, 'space_type is required'),
  metadata: z.record(z.unknown()).optional().nullable(),
})

export const updateSpaceSchema = z
  .object({
    property_id: z.string().uuid('property_id must be a valid UUID'),
    name: z.string().min(1).max(255),
    floor: z.string().max(50).nullable(),
    sqft: z.number().positive().nullable(),
    status: z.string().min(1),
    space_type: z.string().min(1),
    metadata: z.record(z.unknown()).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listSpacesQuery = paginationSchema.extend({
  property_id: z.string().uuid().optional(),
  status: z.string().optional(),
  space_type: z.string().optional(),
  sort: z.enum(['name', 'floor', 'sqft', 'status', 'created_at']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
