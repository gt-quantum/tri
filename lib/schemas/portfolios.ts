import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createPortfolioSchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  metadata: z.record(z.unknown()).optional().nullable(),
})

export const updatePortfolioSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).nullable(),
    metadata: z.record(z.unknown()).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listPortfoliosQuery = paginationSchema.extend({
  sort: z.enum(['name', 'created_at']).optional().default('name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
