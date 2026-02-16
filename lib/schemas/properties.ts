import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

/**
 * Schema for creating a new property.
 */
export const createPropertySchema = z.object({
  portfolio_id: z.string().uuid('portfolio_id must be a valid UUID'),
  name: z.string().min(1, 'name is required').max(255),
  address: z.string().min(1, 'address is required').max(500),
  city: z.string().min(1, 'city is required').max(100),
  state: z.string().min(1, 'state is required').max(50),
  zip: z.string().min(1, 'zip is required').max(20),
  lat: z.number().min(-90).max(90).optional().nullable(),
  lng: z.number().min(-180).max(180).optional().nullable(),
  property_type: z.string().min(1, 'property_type is required'),
  total_sqft: z.number().positive('total_sqft must be positive').optional().nullable(),
  year_built: z.number().int().min(1800).max(2100).optional().nullable(),
  acquisition_date: z.string().date('Must be YYYY-MM-DD format').optional().nullable(),
  acquisition_price: z.number().min(0).optional().nullable(),
  current_value: z.number().min(0).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

/**
 * Schema for updating a property. All fields optional.
 */
export const updatePropertySchema = z
  .object({
    portfolio_id: z.string().uuid('portfolio_id must be a valid UUID'),
    name: z.string().min(1).max(255),
    address: z.string().min(1).max(500),
    city: z.string().min(1).max(100),
    state: z.string().min(1).max(50),
    zip: z.string().min(1).max(20),
    lat: z.number().min(-90).max(90).nullable(),
    lng: z.number().min(-180).max(180).nullable(),
    property_type: z.string().min(1),
    total_sqft: z.number().positive().nullable(),
    year_built: z.number().int().min(1800).max(2100).nullable(),
    acquisition_date: z.string().date('Must be YYYY-MM-DD format').nullable(),
    acquisition_price: z.number().min(0).nullable(),
    current_value: z.number().min(0).nullable(),
    metadata: z.record(z.unknown()).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

/**
 * Query params for listing properties.
 */
export const listPropertiesQuery = paginationSchema.extend({
  portfolio_id: z.string().uuid().optional(),
  property_type: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  search: z.string().optional(),
  sort: z.enum(['name', 'city', 'created_at', 'current_value', 'total_sqft']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
