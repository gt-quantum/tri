import { NextRequest, NextResponse } from 'next/server'
import { streamText, convertToModelMessages, stepCountIs } from 'ai'
import { anthropic } from '@ai-sdk/anthropic'
import { getAuthContext } from '@/lib/auth'
import { ApiError } from '@/lib/errors'
import { generateRequestId } from '@/lib/response'
import { supabase } from '@/lib/supabase'
import { buildSystemPrompt } from '@/lib/ai/system-prompt'
import { createTools } from '@/lib/ai/tools'
import { checkRateLimit } from '@/lib/ai/rate-limit'

/**
 * POST /api/v1/chat
 *
 * Streaming chat endpoint for Strata AI.
 * Accepts messages in Vercel AI SDK UIMessage format.
 * Returns a streaming response compatible with useChat().
 */
export async function POST(request: NextRequest) {
  const requestId = generateRequestId()

  try {
    const auth = await getAuthContext(request)

    // Rate limit: 20 messages/minute per user
    const rateCheck = checkRateLimit(auth.userId)
    if (!rateCheck.allowed) {
      return NextResponse.json(
        {
          error: {
            code: 'RATE_LIMIT_EXCEEDED',
            message: `Too many requests. Try again in ${Math.ceil((rateCheck.retryAfterMs || 0) / 1000)} seconds.`,
            request_id: requestId,
          },
        },
        {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((rateCheck.retryAfterMs || 0) / 1000)) },
        }
      )
    }

    const body = await request.json()
    const { messages, conversationId, context } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new ApiError('VALIDATION_ERROR', 'messages array is required and must not be empty', 400)
    }

    // If conversationId provided, verify ownership
    if (conversationId) {
      const { data: conv } = await supabase
        .from('ai_conversations')
        .select('id')
        .eq('id', conversationId)
        .eq('org_id', auth.orgId)
        .eq('user_id', auth.userId)
        .single()

      if (!conv) {
        throw new ApiError('NOT_FOUND', 'Conversation not found', 404)
      }
    }

    // Build system prompt
    const prompt = await buildSystemPrompt(auth, context)

    // Stream the response
    const result = streamText({
      model: anthropic('claude-haiku-4-5-20251001'),
      messages: [
        {
          role: 'system',
          content: prompt.cached,
          providerOptions: {
            anthropic: { cacheControl: { type: 'ephemeral' } },
          },
        },
        {
          role: 'system',
          content: prompt.dynamic,
        },
        ...(await convertToModelMessages(messages)),
      ],
      tools: createTools(auth),
      stopWhen: stepCountIs(5),
      onFinish: async ({ text, usage, steps }) => {
        // Fire-and-forget: save conversation + log usage
        try {
          const firstUserMsg = messages.find((m: { role: string }) => m.role === 'user')
          // UIMessages have parts[], stored messages may have content
          const firstText = firstUserMsg?.parts?.find(
            (p: { type: string }) => p.type === 'text'
          )?.text || firstUserMsg?.content || ''
          const title = firstText
            ? String(firstText).slice(0, 80)
            : 'New conversation'

          // Build messages array for storage (input + new assistant response)
          const storedMessages = [
            ...messages,
            { role: 'assistant', content: text },
          ]

          // Extract the last user message text for usage log
          const lastUserMsg = [...messages].reverse().find((m: { role: string }) => m.role === 'user')
          const lastUserText = lastUserMsg?.parts?.find(
            (p: { type: string }) => p.type === 'text'
          )?.text || lastUserMsg?.content || ''

          // Collect tool names from all steps
          const toolsCalled = (steps || [])
            .flatMap((s: { toolCalls?: { toolName: string }[] }) => s.toolCalls || [])
            .map((tc: { toolName: string }) => tc.toolName)

          const source = context?.page === '/agent' ? 'page' : 'widget'

          // Save conversation and log usage in parallel
          const saveConversation = conversationId
            ? supabase
                .from('ai_conversations')
                .update({
                  messages: storedMessages,
                  context: context || null,
                })
                .eq('id', conversationId)
                .eq('org_id', auth.orgId)
                .eq('user_id', auth.userId)
            : supabase
                .from('ai_conversations')
                .insert({
                  org_id: auth.orgId,
                  user_id: auth.userId,
                  title,
                  messages: storedMessages,
                  context: context || null,
                  source,
                })

          const logUsage = supabase
            .from('ai_usage_log')
            .insert({
              org_id: auth.orgId,
              user_id: auth.userId,
              conversation_id: conversationId || null,
              source,
              user_message: String(lastUserText).slice(0, 500),
              tools_called: toolsCalled,
              token_input: usage?.inputTokens ?? null,
              token_output: usage?.outputTokens ?? null,
              duration_ms: null, // Could add timing later
            })

          await Promise.all([saveConversation, logUsage])
        } catch (err) {
          console.error('Failed to save conversation:', err)
        }
      },
    })

    return result.toUIMessageStreamResponse()
  } catch (err) {
    if (err instanceof ApiError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message, request_id: requestId } },
        { status: err.status }
      )
    }
    console.error('Chat error:', err)
    return NextResponse.json(
      { error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred', request_id: requestId } },
      { status: 500 }
    )
  }
}
