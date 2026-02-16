import { NextResponse } from 'next/server'

export async function GET() {
  const response = NextResponse.json({
    status: 'ok',
    version: 'v1',
    timestamp: new Date().toISOString(),
  })
  response.headers.set('Cache-Control', 'no-cache, no-store, must-revalidate')
  return response
}
