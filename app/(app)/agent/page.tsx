'use client'

import { useState, useCallback, useRef } from 'react'
import ConversationSidebar from '@/components/agent/ConversationSidebar'
import AgentChatArea from '@/components/agent/AgentChatArea'

export default function AgentPage() {
  const [activeConversation, setActiveConversation] = useState<string | null>(null)
  const [sidebarRefreshKey, setSidebarRefreshKey] = useState(0)

  // chatKey controls when AgentChatArea remounts.
  // Changes when user clicks sidebar items (forces fresh state).
  // Does NOT change during eager conversation creation (preserves active stream).
  const [chatKey, setChatKey] = useState('new')
  const chatKeyCounter = useRef(0)

  const refreshSidebar = useCallback(() => {
    setSidebarRefreshKey((k) => k + 1)
  }, [])

  // User clicks a conversation in the sidebar or "New Chat"
  const handleSelect = useCallback((id: string | null) => {
    setActiveConversation(id)
    // Force remount with a unique key to clear all stale hook state
    chatKeyCounter.current += 1
    setChatKey(id || `new-${chatKeyCounter.current}`)
  }, [])

  // Eager creation completed — update active conversation WITHOUT remounting
  const handleConversationCreated = useCallback((id: string) => {
    setActiveConversation(id)
    refreshSidebar()
  }, [refreshSidebar])

  return (
    <div className="flex h-full">
      <ConversationSidebar
        activeId={activeConversation}
        onSelect={handleSelect}
        refreshKey={sidebarRefreshKey}
      />
      <AgentChatArea
        key={chatKey}
        conversationId={activeConversation}
        onConversationCreated={handleConversationCreated}
        onConversationUpdate={refreshSidebar}
      />
    </div>
  )
}
