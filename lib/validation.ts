import { z } from 'zod'
import { ApiError } from '@/lib/errors'

/**
 * Parse and validate request body against a Zod schema.
 * Throws a structured VALIDATION_ERROR on failure.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function parseBody<T>(
  request: Request,
  schema: z.ZodType<T, z.ZodTypeDef, any>
): Promise<T> {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    throw new ApiError(
      'VALIDATION_ERROR',
      'Request body must be valid JSON',
      400
    )
  }

  const result = schema.safeParse(body)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }))
    const count = details.length
    throw new ApiError(
      'VALIDATION_ERROR',
      `${count} validation error${count === 1 ? '' : 's'}`,
      400,
      details
    )
  }

  return result.data
}

/**
 * Parse and validate query parameters against a Zod schema.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseQuery<T>(
  searchParams: URLSearchParams,
  schema: z.ZodType<T, z.ZodTypeDef, any>
): T {
  const params: Record<string, string> = {}
  searchParams.forEach((value, key) => {
    params[key] = value
  })

  const result = schema.safeParse(params)
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.') || '(root)',
      message: issue.message,
    }))
    const count = details.length
    throw new ApiError(
      'VALIDATION_ERROR',
      `${count} validation error${count === 1 ? '' : 's'}`,
      400,
      details
    )
  }

  return result.data
}

/**
 * Standard pagination query params.
 */
export const paginationSchema = z.object({
  limit: z
    .string()
    .optional()
    .default('25')
    .transform(Number)
    .pipe(z.number().int().min(1).max(100)),
  offset: z
    .string()
    .optional()
    .default('0')
    .transform(Number)
    .pipe(z.number().int().min(0)),
})

/**
 * UUID validation helper.
 */
export const uuidSchema = z.string().uuid('Must be a valid UUID')
