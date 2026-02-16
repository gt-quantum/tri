'use client'

import Link from 'next/link'
import { ExternalLink, BookOpen, FileJson, Key, Bot } from 'lucide-react'

export default function SettingsIntegrationsPage() {
  return (
    <div>
      <div className="mb-8">
        <h1 className="font-display text-2xl text-warm-white tracking-wide">Integrations</h1>
        <p className="font-body text-warm-300 text-sm mt-1">Connect external tools and services to your organization&apos;s data</p>
      </div>

      {/* Developer Resources */}
      <section className="mb-10">
        <div className="flex items-center gap-4 mb-5">
          <h2 className="section-heading">Developer Resources</h2>
          <div className="flex-1 brass-line" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a
            href="/api/v1/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="card-surface-hover p-5 group block"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-brass/10 text-brass">
                <BookOpen size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-body font-semibold text-warm-white">API Documentation</h3>
                  <ExternalLink size={12} className="text-warm-400 group-hover:text-brass transition-colors" />
                </div>
                <p className="font-body text-warm-400 text-sm mt-1">Interactive API reference with all endpoints, request/response schemas, and authentication guide.</p>
              </div>
            </div>
          </a>

          <a
            href="/api/v1/openapi.json"
            target="_blank"
            rel="noopener noreferrer"
            className="card-surface-hover p-5 group block"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-brass/10 text-brass">
                <FileJson size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-body font-semibold text-warm-white">OpenAPI Specification</h3>
                  <ExternalLink size={12} className="text-warm-400 group-hover:text-brass transition-colors" />
                </div>
                <p className="font-body text-warm-400 text-sm mt-1">OpenAPI 3.1 JSON spec for code generation, Postman import, or custom client libraries.</p>
              </div>
            </div>
          </a>

          <Link
            href="/settings/api-keys"
            className="card-surface-hover p-5 group block"
          >
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-brass/10 text-brass">
                <Key size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-body font-semibold text-warm-white">API Keys</h3>
                <p className="font-body text-warm-400 text-sm mt-1">Create and manage API keys for programmatic access. Keys support role-based permissions and mandatory expiration.</p>
              </div>
            </div>
          </Link>

          <div className="card-surface p-5 opacity-60">
            <div className="flex items-start gap-4">
              <div className="p-2.5 rounded-lg bg-warm-500/10 text-warm-400">
                <Bot size={20} strokeWidth={1.5} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-body font-semibold text-warm-300">MCP Server</h3>
                  <span className="badge bg-warm-500/20 text-warm-300 border border-warm-500/10">Coming Soon</span>
                </div>
                <p className="font-body text-warm-400 text-sm mt-1">Connect AI assistants (Claude, Cursor, etc.) to your data via the Model Context Protocol. Available locally via the <code className="text-warm-300 text-xs">mcp/</code> directory.</p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
