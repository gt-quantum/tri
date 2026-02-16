import { NextResponse } from 'next/server'
import { generateOpenApiSpec } from '@/lib/openapi'

export async function GET() {
  const spec = generateOpenApiSpec()
  const response = NextResponse.json(spec)
  response.headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400')
  return response
}
