import { z } from 'zod'
import { paginationSchema } from '@/lib/validation'

export const createUserSchema = z.object({
  email: z.string().email('Must be a valid email'),
  full_name: z.string().min(1, 'full_name is required').max(255),
  role: z.enum(['admin', 'manager', 'viewer'], {
    errorMap: () => ({ message: 'role must be one of: admin, manager, viewer' }),
  }),
})

export const updateUserSchema = z
  .object({
    email: z.string().email('Must be a valid email'),
    full_name: z.string().min(1).max(255),
    role: z.enum(['admin', 'manager', 'viewer'], {
      errorMap: () => ({ message: 'role must be one of: admin, manager, viewer' }),
    }),
  })
  .partial()
  .refine((data) => Object.keys(data).length > 0, {
    message: 'At least one field must be provided for update',
  })

export const listUsersQuery = paginationSchema.extend({
  role: z.enum(['admin', 'manager', 'viewer']).optional(),
  search: z.string().optional(),
  sort: z.enum(['full_name', 'email', 'role', 'created_at']).optional().default('full_name'),
  order: z.enum(['asc', 'desc']).optional().default('asc'),
  include_deleted: z.enum(['true', 'false']).optional().default('false'),
})
