'use client'

import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter } from 'next/navigation'
import { useEffect, useState, useCallback } from 'react'

interface UserRecord {
  id: string
  email: string
  full_name: string | null
  role: string
  last_login_at: string | null
  created_at: string
  deleted_at: string | null
}

interface InvitationRecord {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by_name: string | null
}

export default function TeamPage() {
  const router = useRouter()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState<UserRecord[]>([])
  const [invitations, setInvitations] = useState<InvitationRecord[]>([])
  const [currentUser, setCurrentUser] = useState<{
    id: string
    role: string
  } | null>(null)
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>('viewer')
  const [inviteSubmitting, setInviteSubmitting] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      if (!session) {
        router.push('/login')
        return
      }

      const headers = {
        Authorization: `Bearer ${session.access_token}`,
      }

      setCurrentUser({
        id: session.user.id,
        role: session.user.app_metadata?.role || 'viewer',
      })

      // Fetch users and invitations in parallel
      const [usersRes, invitesRes] = await Promise.all([
        fetch('/api/v1/users?limit=100&include_deleted=true', { headers }),
        fetch('/api/v1/invitations', { headers }),
      ])

      if (usersRes.ok) {
        const usersData = await usersRes.json()
        setUsers(usersData.data || [])
      }

      if (invitesRes.ok) {
        const invitesData = await invitesRes.json()
        setInvitations(invitesData.data || [])
      }
    } catch {
      // Silently fail — user sees empty state
    } finally {
      setLoading(false)
    }
  }, [supabase, router])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const isAdmin = currentUser?.role === 'admin'

  async function getToken() {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    return session?.access_token
  }

  async function handleInvite(e: React.FormEvent) {
    e.preventDefault()
    setInviteError(null)
    setInviteSubmitting(true)

    try {
      const token = await getToken()
      const res = await fetch('/api/v1/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Change-Source': 'ui',
        },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to send invitation')
      }

      setShowInviteModal(false)
      setInviteEmail('')
      setInviteRole('viewer')
      fetchData()
    } catch (err) {
      setInviteError(err instanceof Error ? err.message : 'Failed')
    } finally {
      setInviteSubmitting(false)
    }
  }

  async function handleRoleChange(userId: string, newRole: string) {
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/users/${userId}/role`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          'X-Change-Source': 'ui',
        },
        body: JSON.stringify({ role: newRole }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to change role')
      }

      fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleDeactivate(userId: string) {
    if (!confirm('Are you sure you want to deactivate this user?')) return
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/users/${userId}/deactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Change-Source': 'ui',
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to deactivate')
      }

      fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleReactivate(userId: string) {
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/users/${userId}/reactivate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'X-Change-Source': 'ui',
        },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to reactivate')
      }

      fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleResend(invitationId: string) {
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/invitations/${invitationId}/resend`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to resend')
      }

      fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleRevoke(invitationId: string) {
    setActionError(null)
    try {
      const token = await getToken()
      const res = await fetch(`/api/v1/invitations/${invitationId}/revoke`, {
        method: 'PATCH',
        headers: { Authorization: `Bearer ${token}` },
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error?.message || 'Failed to revoke')
      }

      fetchData()
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-warm-300 font-body text-sm">Loading team...</div>
      </div>
    )
  }

  const activeUsers = users.filter((u) => !u.deleted_at)
  const deactivatedUsers = users.filter((u) => u.deleted_at)
  const pendingInvitations = invitations.filter(
    (i) => i.status === 'pending'
  )
  const pastInvitations = invitations.filter(
    (i) => i.status !== 'pending'
  )

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <button
              onClick={() => router.push('/')}
              className="text-warm-300 hover:text-warm-white transition-colors text-sm font-body"
            >
              &larr; Dashboard
            </button>
          </div>
          <h1 className="font-display text-2xl text-warm-white tracking-wide">
            Team Management
          </h1>
          <p className="font-body text-warm-300 text-sm mt-1">
            {activeUsers.length} active member
            {activeUsers.length !== 1 ? 's' : ''}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowInviteModal(true)}
            className="px-4 py-2 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm
              hover:bg-brass-light transition-colors"
          >
            Invite User
          </button>
        )}
      </div>

      {/* Error banner */}
      {actionError && (
        <div className="mb-6 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body flex justify-between items-center">
          <span>{actionError}</span>
          <button
            onClick={() => setActionError(null)}
            className="text-red-400 hover:text-red-200 ml-4"
          >
            &times;
          </button>
        </div>
      )}

      {/* Active Users */}
      <section className="mb-8">
        <h2 className="section-heading mb-4">Active Members</h2>
        <div className="card-surface overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-brass-faint">
                <th className="table-header">Name</th>
                <th className="table-header">Email</th>
                <th className="table-header">Role</th>
                <th className="table-header">Last Login</th>
                {isAdmin && <th className="table-header">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {activeUsers.map((user) => (
                <tr
                  key={user.id}
                  className="border-b border-obsidian-700/50 last:border-0"
                >
                  <td className="table-cell text-warm-white">
                    {user.full_name || '—'}
                    {user.id === currentUser?.id && (
                      <span className="ml-2 text-[10px] text-brass font-semibold uppercase tracking-wider">
                        You
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-warm-200">{user.email}</td>
                  <td className="table-cell">
                    {isAdmin && user.id !== currentUser?.id ? (
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(user.id, e.target.value)
                        }
                        className="bg-obsidian-800 border border-brass-faint rounded px-2 py-1 text-sm text-warm-white font-body
                          focus:outline-none focus:border-brass/30"
                      >
                        <option value="admin">Admin</option>
                        <option value="manager">Manager</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span
                        className={`badge ${
                          user.role === 'admin'
                            ? 'bg-brass/15 text-brass'
                            : user.role === 'manager'
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-warm-500/30 text-warm-200'
                        }`}
                      >
                        {user.role}
                      </span>
                    )}
                  </td>
                  <td className="table-cell text-warm-300 text-sm">
                    {user.last_login_at
                      ? new Date(user.last_login_at).toLocaleDateString()
                      : '—'}
                  </td>
                  {isAdmin && (
                    <td className="table-cell">
                      {user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeactivate(user.id)}
                          className="text-red-400/70 hover:text-red-300 text-sm font-body transition-colors"
                        >
                          Deactivate
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              ))}
              {activeUsers.length === 0 && (
                <tr>
                  <td
                    colSpan={isAdmin ? 5 : 4}
                    className="table-cell text-warm-400 text-center py-8"
                  >
                    No active members
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Pending Invitations */}
      {pendingInvitations.length > 0 && (
        <section className="mb-8">
          <h2 className="section-heading mb-4">Pending Invitations</h2>
          <div className="card-surface overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brass-faint">
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Invited</th>
                  <th className="table-header">Expires</th>
                  {isAdmin && <th className="table-header">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {pendingInvitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-obsidian-700/50 last:border-0"
                  >
                    <td className="table-cell text-warm-white">{inv.email}</td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          inv.role === 'admin'
                            ? 'bg-brass/15 text-brass'
                            : inv.role === 'manager'
                              ? 'bg-blue-500/15 text-blue-300'
                              : 'bg-warm-500/30 text-warm-200'
                        }`}
                      >
                        {inv.role}
                      </span>
                    </td>
                    <td className="table-cell text-warm-300 text-sm">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                    <td className="table-cell text-warm-300 text-sm">
                      {new Date(inv.expires_at).toLocaleDateString()}
                    </td>
                    {isAdmin && (
                      <td className="table-cell">
                        <div className="flex gap-3">
                          <button
                            onClick={() => handleResend(inv.id)}
                            className="text-brass/70 hover:text-brass text-sm font-body transition-colors"
                          >
                            Resend
                          </button>
                          <button
                            onClick={() => handleRevoke(inv.id)}
                            className="text-red-400/70 hover:text-red-300 text-sm font-body transition-colors"
                          >
                            Revoke
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Deactivated Users */}
      {deactivatedUsers.length > 0 && isAdmin && (
        <section className="mb-8">
          <h2 className="section-heading mb-4 text-warm-300">
            Deactivated Users
          </h2>
          <div className="card-surface overflow-hidden opacity-70">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brass-faint">
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Actions</th>
                </tr>
              </thead>
              <tbody>
                {deactivatedUsers.map((user) => (
                  <tr
                    key={user.id}
                    className="border-b border-obsidian-700/50 last:border-0"
                  >
                    <td className="table-cell text-warm-400">
                      {user.full_name || '—'}
                    </td>
                    <td className="table-cell text-warm-400">{user.email}</td>
                    <td className="table-cell text-warm-400">{user.role}</td>
                    <td className="table-cell">
                      <button
                        onClick={() => handleReactivate(user.id)}
                        className="text-emerald-400/70 hover:text-emerald-300 text-sm font-body transition-colors"
                      >
                        Reactivate
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Past Invitations */}
      {pastInvitations.length > 0 && (
        <section className="mb-8">
          <h2 className="section-heading mb-4 text-warm-300">
            Past Invitations
          </h2>
          <div className="card-surface overflow-hidden opacity-60">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brass-faint">
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Date</th>
                </tr>
              </thead>
              <tbody>
                {pastInvitations.map((inv) => (
                  <tr
                    key={inv.id}
                    className="border-b border-obsidian-700/50 last:border-0"
                  >
                    <td className="table-cell text-warm-400">{inv.email}</td>
                    <td className="table-cell text-warm-400">{inv.role}</td>
                    <td className="table-cell">
                      <span
                        className={`badge ${
                          inv.status === 'accepted'
                            ? 'bg-emerald-500/15 text-emerald-300'
                            : inv.status === 'revoked'
                              ? 'bg-red-500/15 text-red-300'
                              : 'bg-warm-500/30 text-warm-400'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="table-cell text-warm-400 text-sm">
                      {new Date(inv.created_at).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-obsidian-950/80 backdrop-blur-sm">
          <div className="card-surface p-6 w-full max-w-sm mx-4">
            <h3 className="font-display text-lg text-warm-white mb-4">
              Invite Team Member
            </h3>

            {inviteError && (
              <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">
                {inviteError}
              </div>
            )}

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">
                  Email address
                </label>
                <input
                  type="email"
                  required
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint
                    text-warm-white font-body text-sm placeholder:text-warm-400
                    focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20
                    transition-colors"
                />
              </div>

              <div>
                <label className="block font-body text-sm text-warm-200 mb-1.5">
                  Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg bg-obsidian-850 border border-brass-faint
                    text-warm-white font-body text-sm
                    focus:outline-none focus:border-brass/30 focus:ring-1 focus:ring-brass/20
                    transition-colors"
                >
                  <option value="viewer">Viewer — Read-only access</option>
                  <option value="manager">
                    Manager — Create and edit data
                  </option>
                  <option value="admin">Admin — Full access</option>
                </select>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteModal(false)
                    setInviteError(null)
                  }}
                  className="flex-1 py-2.5 rounded-lg border border-brass-faint text-warm-200 font-body text-sm
                    hover:border-brass/20 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={inviteSubmitting}
                  className="flex-1 py-2.5 rounded-lg bg-brass text-obsidian-950 font-body font-semibold text-sm
                    hover:bg-brass-light transition-colors
                    disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {inviteSubmitting ? 'Sending...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
