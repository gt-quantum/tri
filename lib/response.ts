import { NextResponse } from 'next/server'
import { randomUUID } from 'crypto'

/**
 * Generate a unique request ID for tracing.
 */
export function generateRequestId(): string {
  return `req_${randomUUID().slice(0, 12)}`
}

/**
 * Standard single-item response.
 */
interface SingleResponse<T> {
  data: T
  meta: {
    timestamp: string
    request_id: string
  }
}

/**
 * Standard list response with pagination.
 */
interface ListResponse<T> {
  data: T[]
  meta: {
    total: number
    limit: number
    offset: number
    timestamp: string
    request_id: string
  }
}

/**
 * Return a single item with standard envelope.
 */
export function successResponse<T>(
  data: T,
  requestId: string,
  status: number = 200
): NextResponse<SingleResponse<T>> {
  return NextResponse.json(
    {
      data,
      meta: {
        timestamp: new Date().toISOString(),
        request_id: requestId,
      },
    },
    { status }
  )
}

/**
 * Return a paginated list with standard envelope.
 */
export function listResponse<T>(
  data: T[],
  total: number,
  limit: number,
  offset: number,
  requestId: string
): NextResponse<ListResponse<T>> {
  return NextResponse.json({
    data,
    meta: {
      total,
      limit,
      offset,
      timestamp: new Date().toISOString(),
      request_id: requestId,
    },
  })
}
