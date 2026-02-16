/**
 * Types and helpers for agent page context.
 * Used to provide the AI with awareness of what the user is viewing.
 */

export interface PageContext {
  page: string
  portfolioId?: string
  entityType?: string
  entityId?: string
  selectedText?: string
}

/**
 * Parse page context from the current pathname and portfolio selection.
 */
export function parsePageContext(
  pathname: string,
  portfolioId?: string | null
): PageContext {
  const ctx: PageContext = { page: pathname }

  if (portfolioId) {
    ctx.portfolioId = portfolioId
  }

  // Extract entity type and ID from URL patterns
  const patterns: [RegExp, string][] = [
    [/^\/properties\/([0-9a-f-]{36})/, 'property'],
    [/^\/tenants\/([0-9a-f-]{36})/, 'tenant'],
    [/^\/leases\/([0-9a-f-]{36})/, 'lease'],
  ]

  for (const [pattern, entityType] of patterns) {
    const match = pathname.match(pattern)
    if (match) {
      ctx.entityType = entityType
      ctx.entityId = match[1]
      break
    }
  }

  return ctx
}
