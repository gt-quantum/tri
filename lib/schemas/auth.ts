import { z } from 'zod'

/**
 * Schema for POST /api/v1/auth/create-org
 */
export const createOrgSchema = z.object({
  name: z.string().min(1, 'Organization name is required').max(200),
  org_type: z.string().min(1, 'Organization type is required'),
  industry: z.string().optional(),
})

/**
 * Schema for POST /api/v1/invitations
 */
export const createInvitationSchema = z.object({
  email: z.string().email('Must be a valid email address'),
  role: z.enum(['admin', 'manager', 'viewer'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or viewer' }),
  }),
})

/**
 * Schema for PATCH /api/v1/users/:id/role
 */
export const updateRoleSchema = z.object({
  role: z.enum(['admin', 'manager', 'viewer'], {
    errorMap: () => ({ message: 'Role must be admin, manager, or viewer' }),
  }),
})
