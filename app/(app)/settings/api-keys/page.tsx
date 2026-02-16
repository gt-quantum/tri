'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'
import { ExternalLink } from 'lucide-react'

interface ApiKeyRecord {
  id: string
  name: string
  description: string | null
  key_prefix: string
  role: string
  created_by_name: string | null
  created_by_email: string | null
  last_used_at: string | null
  expires_at: string
  revoked_at: string | null
  created_at: string
  status: string
}

export default function ApiKeysPage() {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [loading, setLoading] = useState(true)
  const [keys, setKeys] = useState<ApiKeyRecord[]>([])
  const [isAdmin, setIsAdmin] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showKeyModal, setShowKeyModal] = useState<string | null>(null)
  const [showRotateConfirm, setShowRotateConfirm] = useState<string | null>(null)
  const [showRevokeConfirm, setShowRevokeConfirm] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [includeRevoked, setIncludeRevoked] = useState(false)

  const [createName, setCreateName] = useState('')
  const [createDescription, setCreateDescription] = useState('')
  const [createRole, setCreateRole] = useState<string>('viewer')
  const [createExpiry, setCreateExpiry] = useState<number>(90)
  const [createSubmitting, setCreateSubmitting] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)

  const [copied, setCopied] = useState(false)

  async function getToken() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.access_token
  }

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { router.push('/login'); return }

      const role = session.user.app_metadata?.role
      setIsAdmin(role === 'admin')

      if (role !== 'admin') { setLoading(false); return }

      const headers = { Authorization: `Bearer ${session.access_token}` }
      const res = await fetch(`/api/v1/api-keys?limit=100&include_revoked=${includeRevoked}`, { headers })

      if (res.ok) {
        const data = await res.json()
        setKeys(data.data || [])
      }
    } catch {
      // Silently fail
    } finally {
      setLoading(false)
    }
  }, [supabase, router, includeRevoked])

  useEffect(() => { fetchData() }, [fetchData])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setCreateError(null)
    setCreateSubmitting(true)
    try {
      const token = await getToken()
      const res = await fetch('/api/v1/api-keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, 'X-Change-Source': 'ui' },
        body: JSON.stringify({ name: createName, description: createDescription || undefined, role: createRole, expires_in_days: createExpiry }),
      })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error?.message || 'Failed to create API key') }
      const data = await res.json()
      setShowCreateModal(false)
      setCreateName(''); setCreateDescription(''); setCreateRole('viewer'); setCreateExpiry(90)
      setShowKeyModal(data.data.key)
      fetchData()
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setCreateSubmitting(false)
    }
  }

  async function handleRotate(id: string) {
    setShowRotateConfirm(null); setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/api-keys/${id}/rotate`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'X-Change-Source': 'ui' } })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error?.message || 'Failed to rotate') }
      const data = await res.json()
      setShowKeyModal(data.data.key)
      fetchData()
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed') }
  }

  async function handleRevoke(id: string) {
    setShowRevokeConfirm(null); setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/api-keys/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}`, 'X-Change-Source': 'ui' } })
      if (!res.ok) { const data = await res.json(); throw new Error(data.error?.message || 'Failed to revoke') }
      fetchData()
    } catch (err) { setActionError(err instanceof Error ? err.message : 'Failed') }
  }

  function copyToClipboard(text: string) { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  function formatDate(dateStr: string) { return new Date(dateStr).toLocaleDateString() }
  function formatRelative(dateStr: string | null) {
    if (!dateStr) return 'Never'
    const d = new Date(dateStr); const now = new Date(); const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    if (minutes < 1) return 'Just now'; if (minutes < 60) return `${minutes}m ago`
    const hours = Math.floor(minutes / 60); if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24); if (days < 30) return `${days}d ago`
    return formatDate(dateStr)
  }
  function daysUntil(dateStr: string) { return Math.ceil((new Date(dateStr).getTime() - new Date().getTime()) / (24 * 60 * 60 * 1000)) }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-warm-300 font-body text-sm">Loading API keys...</div>
      </div>
    )
  }

  if (!isAdmin) {
    return (
      <div className="card-surface p-8 text-center">
        <p className="text-warm-300 font-body">API key management requires admin access.</p>
      </div>
    )
  }

  const activeKeys = keys.filter((k) => k.status === 'active')
  const expiredKeys = keys.filter((k) => k.status === 'expired')
  const revokedKeys = keys.filter((k) => k.status === 'revoked')

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-display text-2xl text-warm-white tracking-wide">API Keys</h1>
          <p className="font-body text-warm-300 text-sm mt-1">
            Manage programmatic access to your organization&apos;s API
            <span className="mx-2 text-warm-500">·</span>
            <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer" className="text-brass/70 hover:text-brass transition-colors inline-flex items-center gap-1">
              API Documentation <ExternalLink size={11} />
            </a>
          </p>
        </div>
        <button onClick={() => setShowCreateModal(true)} className="px-4 py-2 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm hover:bg-brass-light transition-colors">
          Create API Key
        </button>
      </div>

      {actionError && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body flex justify-between items-center">
          <span>{actionError}</span>
          <button onClick={() => setActionError(null)} className="text-red-400 hover:text-red-200 ml-4">&times;</button>
        </div>
      )}

      {/* Active Keys */}
      <section className="mb-8">
        <h2 className="section-heading mb-4">Active Keys{activeKeys.length > 0 && <span className="ml-2 text-warm-400 font-normal">({activeKeys.length})</span>}</h2>
        <div className="card-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brass-faint">
                <th className="table-header">Name</th><th className="table-header">Key</th><th className="table-header">Role</th>
                <th className="table-header">Last Used</th><th className="table-header">Expires</th><th className="table-header">Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeKeys.map((key) => {
                const days = daysUntil(key.expires_at)
                return (
                  <tr key={key.id} className="border-b border-obsidian-700/50 last:border-0">
                    <td className="table-cell">
                      <div className="text-warm-white">{key.name}</div>
                      {key.description && <div className="text-warm-300 text-[13px] mt-0.5 truncate max-w-[200px]">{key.description}</div>}
                    </td>
                    <td className="table-cell"><code className="text-warm-300 text-xs bg-obsidian-800 px-1.5 py-0.5 rounded">{key.key_prefix}...</code></td>
                    <td className="table-cell">
                      <span className={`badge ${key.role === 'admin' ? 'bg-brass/15 text-brass' : key.role === 'manager' ? 'bg-blue-500/15 text-blue-300' : 'bg-warm-500/30 text-warm-200'}`}>{key.role}</span>
                    </td>
                    <td className="table-cell text-warm-300 text-sm">{formatRelative(key.last_used_at)}</td>
                    <td className="table-cell text-sm">
                      <span className={days <= 7 ? 'text-red-300' : days <= 30 ? 'text-amber-300' : 'text-warm-300'}>
                        {days <= 0 ? 'Expired' : `${days}d (${formatDate(key.expires_at)})`}
                      </span>
                    </td>
                    <td className="table-cell">
                      <div className="flex gap-3">
                        <button onClick={() => setShowRotateConfirm(key.id)} className="text-brass/70 hover:text-brass text-sm font-body transition-colors">Rotate</button>
                        <button onClick={() => setShowRevokeConfirm(key.id)} className="text-red-400/70 hover:text-red-300 text-sm font-body transition-colors">Revoke</button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {activeKeys.length === 0 && (
                <tr><td colSpan={6} className="table-cell text-warm-400 text-center py-8">No active API keys. Create one to get started.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {expiredKeys.length > 0 && (
        <section className="mb-8">
          <h2 className="section-heading mb-4 text-warm-300">Expired Keys ({expiredKeys.length})</h2>
          <div className="card-surface overflow-hidden opacity-70">
            <table className="w-full">
              <thead><tr className="border-b border-brass-faint"><th className="table-header">Name</th><th className="table-header">Key</th><th className="table-header">Role</th><th className="table-header">Expired</th></tr></thead>
              <tbody>
                {expiredKeys.map((key) => (
                  <tr key={key.id} className="border-b border-obsidian-700/50 last:border-0">
                    <td className="table-cell text-warm-400">{key.name}</td>
                    <td className="table-cell"><code className="text-warm-500 text-xs">{key.key_prefix}...</code></td>
                    <td className="table-cell text-warm-400">{key.role}</td>
                    <td className="table-cell text-warm-400 text-sm">{formatDate(key.expires_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <div className="mb-4">
        <label className="flex items-center gap-2 text-warm-300 text-sm font-body cursor-pointer">
          <input type="checkbox" checked={includeRevoked} onChange={(e) => setIncludeRevoked(e.target.checked)} className="accent-brass" />
          Show revoked keys
        </label>
      </div>

      {includeRevoked && revokedKeys.length > 0 && (
        <section className="mb-8">
          <h2 className="section-heading mb-4 text-warm-300">Revoked Keys ({revokedKeys.length})</h2>
          <div className="card-surface overflow-hidden opacity-60">
            <table className="w-full">
              <thead><tr className="border-b border-brass-faint"><th className="table-header">Name</th><th className="table-header">Key</th><th className="table-header">Role</th><th className="table-header">Revoked</th></tr></thead>
              <tbody>
                {revokedKeys.map((key) => (
                  <tr key={key.id} className="border-b border-obsidian-700/50 last:border-0">
                    <td className="table-cell text-warm-400">{key.name}</td>
                    <td className="table-cell"><code className="text-warm-500 text-xs">{key.key_prefix}...</code></td>
                    <td className="table-cell text-warm-400">{key.role}</td>
                    <td className="table-cell text-warm-400 text-sm">{key.revoked_at ? formatDate(key.revoked_at) : '\u2014'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
          <div className="card-surface p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg text-warm-white mb-4">Create API Key</h3>
            {createError && <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">{createError}</div>}
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">Name</label>
                <input type="text" required value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g., Zapier Integration" className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm placeholder:text-warm-400 focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors" />
              </div>
              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">Description (optional)</label>
                <input type="text" value={createDescription} onChange={(e) => setCreateDescription(e.target.value)} placeholder="What is this key used for?" className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm placeholder:text-warm-400 focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors" />
              </div>
              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">Role</label>
                <select value={createRole} onChange={(e) => setCreateRole(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors">
                  <option value="viewer">Viewer -- Read-only access</option>
                  <option value="manager">Manager -- Create and edit data</option>
                  <option value="admin">Admin -- Full access</option>
                </select>
              </div>
              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">Expiration</label>
                <select value={createExpiry} onChange={(e) => setCreateExpiry(Number(e.target.value))} className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint text-warm-white font-body text-sm focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20 transition-colors">
                  <option value={30}>30 days</option><option value={60}>60 days</option><option value={90}>90 days (default)</option><option value={180}>180 days</option><option value={365}>365 days</option>
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => { setShowCreateModal(false); setCreateError(null) }} className="flex-1 py-2.5 rounded-lg border border-brass-faint text-warm-200 font-body text-sm hover:border-brass/20 transition-colors">Cancel</button>
                <button type="submit" disabled={createSubmitting} className="flex-1 py-2.5 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm hover:bg-brass-light transition-colors disabled:opacity-40 disabled:cursor-not-allowed">{createSubmitting ? 'Creating...' : 'Create Key'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Key Display Modal */}
      {showKeyModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
          <div className="card-surface p-6 w-full max-w-md mx-4">
            <h3 className="font-display text-lg text-warm-white mb-2">API Key Created</h3>
            <p className="text-amber-300 text-sm font-body mb-4">Copy this key now. It will not be shown again.</p>
            <div className="relative">
              <code className="block w-full p-3 rounded-lg bg-obsidian-800 border border-brass-faint text-warm-white font-mono text-sm break-all select-all">{showKeyModal}</code>
              <button onClick={() => copyToClipboard(showKeyModal)} className="absolute top-2 right-2 px-2 py-1 rounded bg-obsidian-700 text-warm-300 text-xs font-body hover:text-warm-white hover:bg-obsidian-600 transition-colors">{copied ? 'Copied!' : 'Copy'}</button>
            </div>
            <div className="mt-4 p-3 rounded-lg bg-amber-500/5 border border-amber-500/10 space-y-1.5">
              <p className="text-warm-200 text-[13px] font-body">Use this key in the Authorization header: <code className="text-warm-200">Authorization: Bearer {showKeyModal.slice(0, 12)}...</code></p>
              <p className="text-warm-300 text-[13px] font-body">
                See the <a href="/api/v1/docs" target="_blank" rel="noopener noreferrer" className="text-brass/70 hover:text-brass transition-colors inline-flex items-center gap-0.5">API documentation <ExternalLink size={10} /></a> for available endpoints.
              </p>
            </div>
            <button onClick={() => setShowKeyModal(null)} className="w-full mt-4 py-2.5 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm hover:bg-brass-light transition-colors">Done</button>
          </div>
        </div>
      )}

      {/* Rotate Confirmation */}
      {showRotateConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
          <div className="card-surface p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg text-warm-white mb-2">Rotate API Key</h3>
            <p className="text-warm-300 text-sm font-body mb-4">This will revoke the current key and generate a new one. Any integrations using the old key will immediately lose access.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRotateConfirm(null)} className="flex-1 py-2.5 rounded-lg border border-brass-faint text-warm-200 font-body text-sm hover:border-brass/20 transition-colors">Cancel</button>
              <button onClick={() => handleRotate(showRotateConfirm)} className="flex-1 py-2.5 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm hover:bg-brass-light transition-colors">Rotate Key</button>
            </div>
          </div>
        </div>
      )}

      {/* Revoke Confirmation */}
      {showRevokeConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
          <div className="card-surface p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg text-warm-white mb-2">Revoke API Key</h3>
            <p className="text-warm-300 text-sm font-body mb-4">Are you sure? Any integrations using this key will immediately lose access. This cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setShowRevokeConfirm(null)} className="flex-1 py-2.5 rounded-lg border border-brass-faint text-warm-200 font-body text-sm hover:border-brass/20 transition-colors">Cancel</button>
              <button onClick={() => handleRevoke(showRevokeConfirm)} className="flex-1 py-2.5 rounded-lg bg-red-500/80 text-white font-body font-semibold text-sm hover:bg-red-500 transition-colors">Revoke Key</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
