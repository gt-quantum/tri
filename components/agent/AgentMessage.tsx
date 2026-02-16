'use client'

import { memo } from 'react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { UIMessage } from 'ai'
import AgentToolResult from './AgentToolResult'

const markdownComponents = {
  a: ({ href, children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => {
    // Internal links use Next.js client-side navigation
    if (href && href.startsWith('/')) {
      return <Link href={href} {...props}>{children}</Link>
    }
    return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>
  },
}

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

  // Assistant messages — clean, no bubble, with markdown rendering
  return (
    <div className={isWidget ? '' : 'max-w-[85%]'}>
      <div className="space-y-2">
        {message.parts.map((part, i) => {
          if (part.type === 'text' && part.text) {
            return (
              <div key={i} className="agent-markdown font-body text-sm text-warm-200 leading-[1.7]">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>{part.text}</ReactMarkdown>
              </div>
            )
          }
          if (part.type === 'dynamic-tool' || part.type.startsWith('tool-')) {
            const toolPart = part as {
              type: string
              toolName?: string
              toolCallId?: string
              state: string
              input?: unknown
              output?: unknown
            }
            // DynamicToolUIPart has toolName directly; ToolUIPart encodes it in type as "tool-{name}"
            const name = toolPart.toolName ?? (part.type.startsWith('tool-') ? part.type.slice(5) : undefined)
            return (
              <AgentToolResult
                key={i}
                toolName={name ?? part.type}
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
