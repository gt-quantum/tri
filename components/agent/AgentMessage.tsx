'use client'

import { memo } from 'react'
import type { UIMessage } from 'ai'
import AgentToolResult from './AgentToolResult'

interface AgentMessageProps {
  message: UIMessage
  variant?: 'page' | 'widget'
}

function AgentMessageComponent({ message, variant = 'page' }: AgentMessageProps) {
  const isUser = message.role === 'user'
  const isWidget = variant === 'widget'

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div
          className={`rounded-2xl px-4 py-2.5 bg-obsidian-800 text-warm-white ${
            isWidget ? 'max-w-[85%]' : 'max-w-[70%]'
          }`}
        >
          {message.parts.map((part, i) => {
            if (part.type === 'text' && part.text) {
              return (
                <div key={i} className="font-body text-sm whitespace-pre-wrap leading-relaxed">
                  {part.text}
                </div>
              )
            }
            return null
          })}
        </div>
      </div>
    )
  }

  // Assistant messages — clean, no bubble
  return (
    <div className={isWidget ? '' : 'max-w-[85%]'}>
      <div className="space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div key={i} className="font-body text-sm text-warm-200 whitespace-pre-wrap leading-[1.7]">
                {part.text}
              </div>
            )
          }
          if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            const toolPart = part as {
              type: string
              toolName: string
              state: string
              input?: unknown
              output?: unknown
            }
            return (
              <AgentToolResult
                key={i}
                toolName={toolPart.toolName}
                state={toolPart.state}
                args={toolPart.input as Record<string, unknown> | undefined}
                result={toolPart.output}
              />
            )
          }
          return null
        })}
      </div>
    </div>
  )
}

export default memo(AgentMessageComponent)
