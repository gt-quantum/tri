'use client'

import { memo } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface AgentToolResultProps {
  toolName: string
  state: string
  args?: Record<string, unknown>
  result?: unknown
}

const TOOL_LABELS: Record<string, string> = {
  listProperties: 'Searching properties',
  getProperty: 'Loading property details',
  listTenants: 'Searching tenants',
  getTenant: 'Loading tenant details',
  listLeases: 'Searching leases',
  getLease: 'Loading lease details',
  listSpaces: 'Searching spaces',
  listPortfolios: 'Loading portfolios',
  getAuditLog: 'Querying audit log',
  getSchema: 'Loading data model',
}

function AgentToolResultComponent({ toolName, state, result }: AgentToolResultProps) {
  const label = TOOL_LABELS[toolName] || toolName || 'Processing'

  if (state === 'call' || state === 'partial-call' || state === 'input-available' || state === 'input-streaming') {
    return (
      <div className="flex items-center gap-2 py-1">
        <Loader2 size={12} className="text-warm-400 animate-spin flex-shrink-0" />
        <span className="text-[13px] font-body text-warm-400">{label}...</span>
      </div>
    )
  }

  if (state === 'output-error') {
    return (
      <div className="flex items-center gap-2 py-1">
        <span className="text-[13px] font-body text-red-400">Tool error: {label}</span>
      </div>
    )
  }

  if (state === 'result' || state === 'output-available') {
    const res = result as Record<string, unknown> | null

    if (res?.error) {
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="text-[13px] font-body text-red-400">Error: {String(res.error)}</span>
        </div>
      )
    }

    const total = res?.total as number | undefined
    const itemCount = getItemCount(res)

    return (
      <div className="flex items-center gap-2 py-1">
        <CheckCircle2 size={12} className="text-warm-500 flex-shrink-0" />
        <span className="text-[13px] font-body text-warm-400">
          {label.replace('Searching', 'Found').replace('Loading', 'Loaded').replace('Querying', 'Found')}
          {itemCount !== null && (
            <> — {itemCount}{total && total > itemCount ? ` of ${total}` : ''} result{itemCount !== 1 ? 's' : ''}</>
          )}
        </span>
      </div>
    )
  }

  return null
}

function getItemCount(res: Record<string, unknown> | null): number | null {
  if (!res) return null
  for (const key of ['properties', 'tenants', 'leases', 'spaces', 'portfolios', 'entries']) {
    const val = res[key]
    if (Array.isArray(val)) return val.length
  }
  return null
}

export default memo(AgentToolResultComponent)
