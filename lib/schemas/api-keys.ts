import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createApiKeySchema = z.object({
  name: z.string().min(1, 'name is required').max(255),
  description: z.string().max(2000).optional().nullable(),
  role: z.enum(['admin', 'manager', 'viewer'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or viewer' }),
  }),
  expires_in_days: z
    .number()
    .int()
    .min(1, 'Must be at least 1 day')
    .max(365, 'Maximum expiration is 365 days')
    .optional()
    .default(90),
})

export const updateApiKeySchema = z
  .object({
    name: z.string().min(1).max(255),
    description: z.string().max(2000).nullable(),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listApiKeysQuery = paginationSchema.extend({
  include_revoked: z.enum(['true', 'false']).optional().default('false'),
})
