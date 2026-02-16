/**
 * Simple in-memory per-user rate limiter for the chat endpoint.
 * Appropriate for Vercel Hobby tier (no Redis needed).
 *
 * Limits: 20 messages per minute per user.
 */

const WINDOW_MS = 60_000 // 1 minute
const MAX_REQUESTS = 20

// Map of userId -> array of request timestamps
const requestLog = new Map<string, number[]>()

/**
 * Check if a user has exceeded the rate limit.
 * Returns { allowed: true } or { allowed: false, retryAfterMs }.
 */
export function checkRateLimit(userId: string): {
  allowed: boolean
  retryAfterMs?: number
} {
  const now = Date.now()
  const windowStart = now - WINDOW_MS

  // Get existing timestamps, filter out expired ones
  let timestamps = requestLog.get(userId) || []
  timestamps = timestamps.filter((t) => t > windowStart)

  if (timestamps.length >= MAX_REQUESTS) {
    const oldest = timestamps[0]
    const retryAfterMs = oldest + WINDOW_MS - now
    requestLog.set(userId, timestamps)
    return { allowed: false, retryAfterMs }
  }

  // Record this request
  timestamps.push(now)
  requestLog.set(userId, timestamps)

  return { allowed: true }
}

// Periodic cleanup to prevent memory leak (runs every 5 minutes)
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const cutoff = Date.now() - WINDOW_MS
    for (const [userId, timestamps] of requestLog.entries()) {
      const valid = timestamps.filter((t) => t > cutoff)
      if (valid.length === 0) {
        requestLog.delete(userId)
      } else {
        requestLog.set(userId, valid)
      }
    }
  }, 5 * 60_000)
}
