import { NextResponse } from 'next/server'

/**
 * Standard error codes used across all API responses.
 */
export type ErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'CONFLICT'
  | 'INTERNAL_ERROR'

/**
 * Structured API error with code, message, and optional field-level details.
 */
export class ApiError extends Error {
  constructor(
    public code: ErrorCode,
    message: string,
    public status: number = 400,
    public details?: { field: string; message: string }[]
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Standard error response shape. Every error from the API looks like this.
 */
interface ErrorResponse {
  error: {
    code: ErrorCode
    message: string
    details?: { field: string; message: string }[]
    request_id: string
  }
}

/**
 * Convert any error into a consistent JSON response.
 */
export function errorResponse(
  err: unknown,
  requestId: string
): NextResponse<ErrorResponse> {
  if (err instanceof ApiError) {
    return NextResponse.json(
      {
        error: {
          code: err.code,
          message: err.message,
          details: err.details,
          request_id: requestId,
        },
      },
      { status: err.status }
    )
  }

  // Unexpected errors — log and return generic message
  console.error('Unhandled error:', err)
  return NextResponse.json(
    {
      error: {
        code: 'INTERNAL_ERROR' as ErrorCode,
        message: 'An unexpected error occurred',
        request_id: requestId,
      },
    },
    { status: 500 }
  )
}

/**
 * Convenience constructors for common error types.
 */
export function notFound(entity: string, id: string): ApiError {
  return new ApiError(
    'NOT_FOUND',
    `${entity} with id '${id}' not found`,
    404
  )
}

export function validationError(
  details: { field: string; message: string }[]
): ApiError {
  const count = details.length
  return new ApiError(
    'VALIDATION_ERROR',
    `${count} validation error${count === 1 ? '' : 's'}`,
    400,
    details
  )
}
