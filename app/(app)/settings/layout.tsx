'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/lib/auth-context'

const personalTabs = [
  { label: 'Profile', path: '/settings/profile', roles: ['viewer', 'manager', 'admin'] },
  { label: 'Security', path: '/settings/security', roles: ['viewer', 'manager', 'admin'] },
]

const orgTabs = [
  { label: 'Organization', path: '/settings/organization', roles: ['admin'] },
  { label: 'Users', path: '/settings/users', roles: ['admin'] },
  { label: 'Invitations', path: '/settings/invitations', roles: ['admin'] },
  { label: 'Portfolios', path: '/settings/portfolios', roles: ['manager', 'admin'] },
  { label: 'Custom Fields', path: '/settings/custom-fields', roles: ['manager', 'admin'] },
  { label: 'Picklists', path: '/settings/picklists', roles: ['manager', 'admin'] },
  { label: 'API Keys', path: '/settings/api-keys', roles: ['admin'] },
  { label: 'Audit Log', path: '/settings/audit-log', roles: ['admin'] },
  { label: 'Integrations', path: '/settings/integrations', roles: ['admin'] },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user } = useAuth()
  const role = user?.role || 'viewer'

  const visiblePersonal = personalTabs.filter((t) => t.roles.includes(role))
  const visibleOrg = orgTabs.filter((t) => t.roles.includes(role))

  return (
    <div>
      {/* Tab Navigation */}
      <div className="flex items-center gap-1 mb-8 overflow-x-auto pb-1 -mt-2">
        {visiblePersonal.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`settings-tab ${pathname === tab.path ? 'settings-tab-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}

        {visibleOrg.length > 0 && (
          <div className="w-px h-5 bg-brass-faint mx-1 flex-shrink-0" />
        )}

        {visibleOrg.map((tab) => (
          <Link
            key={tab.path}
            href={tab.path}
            className={`settings-tab ${pathname === tab.path ? 'settings-tab-active' : ''}`}
          >
            {tab.label}
          </Link>
        ))}
      </div>

      {/* Page Content */}
      {children}
    </div>
  )
}
