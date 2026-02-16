'use client'

import { useState } from 'react'
import ConversationSidebar from '@/components/agent/ConversationSidebar'
import AgentChatArea from '@/components/agent/AgentChatArea'

export default function AgentPage() {
  const [activeConversation, setActiveConversation] = useState<string | null>(null)

  return (
    <div className="flex h-full">
      <ConversationSidebar
        activeId={activeConversation}
        onSelect={setActiveConversation}
      />
      <AgentChatArea conversationId={activeConversation} />
    </div>
  )
}
