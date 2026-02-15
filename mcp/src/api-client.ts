/**
 * HTTP client for the TRI Platform REST API.
 * Sends Authorization: Bearer sk_live_... and X-Change-Source: mcp on every request.
 */

const apiUrl = process.env.TRI_API_URL?.replace(/\/$/, '') || 'http://localhost:3000'
const apiKey = process.env.TRI_API_KEY || ''

interface ApiErrorBody {
  error: {
    code: string
    message: string
    details?: { field: string; message: string }[]
    request_id: string
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public details?: { field: string; message: string }[],
    public requestId?: string
  ) {
    super(message)
    this.name = 'ApiError'
  }

  toText(): string {
    let msg = `${this.code}: ${this.message}`
    if (this.details?.length) {
      msg += '\n' + this.details.map((d) => `  - ${d.field}: ${d.message}`).join('\n')
    }
    if (this.requestId) {
      msg += `\n(request_id: ${this.requestId})`
    }
    return msg
  }
}

export async function apiRequest(
  method: string,
  path: string,
  body?: Record<string, unknown>,
  queryParams?: Record<string, string | undefined>
): Promise<unknown> {
  const url = new URL(`${apiUrl}${path}`)
  if (queryParams) {
    for (const [key, value] of Object.entries(queryParams)) {
      if (value !== undefined && value !== '') {
        url.searchParams.set(key, value)
      }
    }
  }

  const headers: Record<string, string> = {
    'Authorization': `Bearer ${apiKey}`,
    'X-Change-Source': 'mcp',
  }
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(url.toString(), {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const text = await response.text()
  let json: unknown
  try {
    json = JSON.parse(text)
  } catch {
    if (!response.ok) {
      throw new ApiError(response.status, 'HTTP_ERROR', `HTTP ${response.status}: ${text}`)
    }
    return text
  }

  if (!response.ok) {
    const err = json as ApiErrorBody
    if (err?.error) {
      throw new ApiError(
        response.status,
        err.error.code,
        err.error.message,
        err.error.details,
        err.error.request_id
      )
    }
    throw new ApiError(response.status, 'HTTP_ERROR', `HTTP ${response.status}: ${text}`)
  }

  return json
}

export function get(path: string, queryParams?: Record<string, string | undefined>): Promise<unknown> {
  return apiRequest('GET', path, undefined, queryParams)
}

export function post(path: string, body?: Record<string, unknown>): Promise<unknown> {
  return apiRequest('POST', path, body)
}

export function patch(path: string, body?: Record<string, unknown>): Promise<unknown> {
  return apiRequest('PATCH', path, body)
}

export function del(path: string): Promise<unknown> {
  return apiRequest('DELETE', path)
}
