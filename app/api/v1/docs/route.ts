import { NextRequest, NextResponse } from 'next/server'

/**
 * GET /api/v1/docs
 * Serves an interactive API documentation viewer using Scalar.
 */
export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin

  const html = `<!DOCTYPE html>
<html>
<head>
  <title>TRI Platform API Docs</title>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <style>
    body { margin: 0; background: #04040a; }
  </style>
</head>
<body>
  <script id="api-reference" data-url="${origin}/api/v1/openapi.json"></script>
  <script src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"></script>
</body>
</html>`

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
