import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createPicklistSchema = z.object({
  entity_type: z.string().min(1, 'entity_type is required'),
  field_name: z.string().min(1, 'field_name is required'),
  value: z.string().min(1, 'value is required'),
  display_label: z.string().min(1, 'display_label is required'),
  color: z.string().max(20).optional().nullable(),
  sort_order: z.number().int().min(0).optional().default(0),
  is_default: z.boolean().optional().default(false),
  is_active: z.boolean().optional().default(true),
})

export const updatePicklistSchema = z
  .object({
    display_label: z.string().min(1),
    color: z.string().max(20).nullable(),
    sort_order: z.number().int().min(0),
    is_default: z.boolean(),
    is_active: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listPicklistsQuery = paginationSchema.extend({
  entity_type: z.string().optional(),
  field_name: z.string().optional(),
  is_active: z.enum(['true', 'false']).optional(),
  sort: z.enum(['sort_order', 'value', 'display_label', 'created_at']).optional().default('sort_order'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})
