import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createCustomFieldSchema = z.object({
  entity_type: z.enum(
    ['property', 'space', 'tenant', 'lease', 'portfolio'],
    { errorMap: () => ({ message: 'entity_type must be one of: property, space, tenant, lease, portfolio' }) }
  ),
  field_name: z
    .string()
    .min(1, 'field_name is required')
    .max(100)
    .regex(/^[a-z][a-z0-9_]*$/, 'field_name must be lowercase with underscores (e.g. environmental_risk_score)'),
  display_name: z.string().min(1, 'display_name is required').max(255),
  field_type: z.enum(
    ['text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url'],
    { errorMap: () => ({ message: 'field_type must be one of: text, number, date, select, multi_select, boolean, url' }) }
  ),
  options: z.record(z.unknown()).optional().nullable(),
  required: z.boolean().optional().default(false),
})

export const updateCustomFieldSchema = z
  .object({
    display_name: z.string().min(1).max(255),
    field_type: z.enum(['text', 'number', 'date', 'select', 'multi_select', 'boolean', 'url']),
    options: z.record(z.unknown()).nullable(),
    required: z.boolean(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listCustomFieldsQuery = paginationSchema.extend({
  entity_type: z.string().optional(),
  sort: z.enum(['field_name', 'display_name', 'entity_type', 'created_at']).optional().default('entity_type'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
})
