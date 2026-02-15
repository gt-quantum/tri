import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const listAuditLogQuery = paginationSchema.extend({
  entity_type: z.string().optional(),
  entity_id: z.string().uuid().optional(),
  field_name: z.string().optional(),
  action: z.enum(['create', 'update', 'soft_delete', 'restore']).optional(),
  changed_by: z.string().uuid().optional(),
  change_source: z.string().optional(),
  since: z.string().datetime({ offset: true }).optional(),
  until: z.string().datetime({ offset: true }).optional(),
  sort: z.enum(['changed_at']).optional().default('changed_at'),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
})
