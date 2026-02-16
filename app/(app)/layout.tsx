'use client'

import { Suspense } from 'react'
import { usePathname } from 'next/navigation'
import { AuthProvider } from '@/lib/auth-context'
import { PortfolioContext, usePortfolioProvider } from '@/lib/use-portfolio-context'
import CommandRail from '@/components/navigation/CommandRail'
import TopBar from '@/components/navigation/TopBar'
import AgentWidget from '@/components/agent/AgentWidget'
import SelectionTooltip from '@/components/agent/SelectionTooltip'

function AppShellInner({ children }: { children: React.ReactNode }) {
  const portfolio = usePortfolioProvider()
  const pathname = usePathname()
  const isAgentPage = pathname.startsWith('/agent')

  return (
    <PortfolioContext.Provider value={portfolio}>
      <div className="flex h-screen overflow-hidden">
        <CommandRail />
        <div className="flex-1 flex flex-col min-w-0">
          <TopBar />
          <main className="flex-1 overflow-y-auto">
            {isAgentPage ? (
              children
            ) : (
              <div className="max-w-[1440px] mx-auto px-6 lg:px-10 py-8">
                {children}
              </div>
            )}
          </main>
        </div>
      </div>
      <AgentWidget />
      <SelectionTooltip />
    </PortfolioContext.Provider>
  )
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <Suspense
        fallback={
          <div className="h-screen flex flex-col items-center justify-center gap-4">
            <div className="w-8 h-8 border-2 border-brass/30 border-t-brass rounded-full animate-spin" />
            <p className="font-body text-warm-300 text-sm tracking-wide">Loading...</p>
          </div>
        }
      >
        <AppShellInner>{children}</AppShellInner>
      </Suspense>
    </AuthProvider>
  )
}
