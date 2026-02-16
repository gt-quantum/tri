'use client'

import { useState, useEffect, useCallback } from 'react'
import { Plus, Archive, Trash2, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

interface Conversation {
  id: string
  title: string
  source: string
  message_count: number
  updated_at: string
}

interface ConversationSidebarProps {
  activeId: string | null
  onSelect: (id: string | null) => void
}

export default function ConversationSidebar({ activeId, onSelect }: ConversationSidebarProps) {
  const { getToken } = useAuth()
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [collapsed, setCollapsed] = useState(false)

  const fetchConversations = useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const res = await fetch('/api/v1/conversations?limit=50', {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) {
        const body = await res.json()
        setConversations(body.data || [])
      }
    } catch {
      // Non-critical
    } finally {
      setLoading(false)
    }
  }, [getToken])

  useEffect(() => {
    fetchConversations()
  }, [fetchConversations])

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const token = await getToken()
      if (!token) return

      await fetch(`/api/v1/conversations/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) onSelect(null)
    } catch {
      // Non-critical
    }
  }

  const handleArchive = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const token = await getToken()
      if (!token) return

      await fetch(`/api/v1/conversations/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_archived: true }),
      })
      setConversations((prev) => prev.filter((c) => c.id !== id))
      if (activeId === id) onSelect(null)
    } catch {
      // Non-critical
    }
  }

  function formatTime(dateStr: string) {
    const date = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)

    if (diffMins < 1) return 'Just now'
    if (diffMins < 60) return `${diffMins}m`

    const diffHrs = Math.floor(diffMins / 60)
    if (diffHrs < 24) return `${diffHrs}h`

    const diffDays = Math.floor(diffHrs / 24)
    if (diffDays < 7) return `${diffDays}d`

    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Collapsed state — just a thin strip with toggle + new chat
  if (collapsed) {
    return (
      <div className="w-12 flex-shrink-0 border-r border-brass-faint/30 flex flex-col items-center py-3 gap-3">
        <button
          onClick={() => setCollapsed(false)}
          className="p-1.5 text-warm-500 hover:text-brass transition-colors"
          title="Show sidebar"
        >
          <PanelLeftOpen size={16} strokeWidth={1.5} />
        </button>
        <button
          onClick={() => onSelect(null)}
          className="p-1.5 text-warm-500 hover:text-brass transition-colors"
          title="New chat"
        >
          <Plus size={16} strokeWidth={1.5} />
        </button>
      </div>
    )
  }

  return (
    <div className="w-[240px] flex-shrink-0 border-r border-brass-faint/30 flex flex-col h-full">
      {/* Header: New Chat + collapse */}
      <div className="flex items-center gap-2 p-3">
        <button
          onClick={() => onSelect(null)}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg border border-brass-faint/15 text-warm-300 hover:text-brass hover:border-brass/15 transition-colors font-body text-[13px]"
        >
          <Plus size={13} />
          New chat
        </button>
        <button
          onClick={() => setCollapsed(true)}
          className="p-1.5 text-warm-500 hover:text-brass transition-colors"
          title="Hide sidebar"
        >
          <PanelLeftClose size={16} strokeWidth={1.5} />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="w-4 h-4 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="font-body text-[13px] text-warm-500">No conversations yet</p>
          </div>
        ) : (
          <div className="space-y-0.5">
            {conversations.map((conv) => (
              <div
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`group flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                  activeId === conv.id
                    ? 'bg-obsidian-800'
                    : 'hover:bg-obsidian-800/50'
                }`}
              >
                <div className="flex-1 min-w-0">
                  <p className="font-body text-[13px] text-warm-200 truncate">
                    {conv.title}
                  </p>
                  <p className="font-body text-[11px] text-warm-500 mt-0.5">
                    {formatTime(conv.updated_at)}
                  </p>
                </div>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => handleArchive(e, conv.id)}
                    className="p-1 text-warm-500 hover:text-brass transition-colors"
                    title="Archive"
                  >
                    <Archive size={11} />
                  </button>
                  <button
                    onClick={(e) => handleDelete(e, conv.id)}
                    className="p-1 text-warm-500 hover:text-red-400 transition-colors"
                    title="Delete"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
