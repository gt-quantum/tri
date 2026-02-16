import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const listConversationsQuery = paginationSchema.extend({
  source: z.enum(['widget', 'page']).optional(),
  include_archived: z.enum(['true', 'false']).optional().default('false'),
})

export const createConversationSchema = z.object({
  title: z.string().max(200).optional(),
  source: z.enum(['widget', 'page']).optional().default('widget'),
  context: z.record(z.string(), z.unknown()).optional().nullable(),
})

export const updateConversationSchema = z
  .object({
    title: z.string().min(1).max(200),
    is_archived: z.boolean(),
    source: z.enum(['widget', 'page']),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })
