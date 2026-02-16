'use client'

import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { createSupabaseBrowserClient } from '@/lib/supabase-browser'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useState, Suspense } from 'react'

function SignupContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [supabase] = useState(() => createSupabaseBrowserClient())
  const token = searchParams.get('token')
  const [invitation, setInvitation] = useState<{
    org_name: string
    role: string
    email: string
  } | null>(null)
  const [inviteError, setInviteError] = useState<string | null>(null)

  // Look up invitation if token is present
  useEffect(() => {
    if (!token) return

    async function lookupInvitation() {
      try {
        const res = await fetch(
          `/api/v1/invitations/lookup?token=${encodeURIComponent(token!)}`
        )
        if (res.ok) {
          const data = await res.json()
          setInvitation(data.data)
        } else {
          const err = await res.json()
          setInviteError(
            err.error?.message || 'This invitation is no longer valid.'
          )
        }
      } catch {
        setInviteError('Unable to verify invitation.')
      }
    }

    lookupInvitation()
  }, [token])

  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        const orgId = session.user.app_metadata?.org_id
        if (orgId) {
          router.push('/')
        } else {
          router.push('/onboarding')
        }
      }
    })

    return () => subscription.unsubscribe()
  }, [supabase, router])

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mb-6" />
          <h1 className="font-display text-2xl text-warm-white tracking-wide mb-2">
            TRI Platform
          </h1>
          <p className="font-body text-warm-300 text-sm">
            Create your account
          </p>
        </div>

        {/* Invitation banner */}
        {invitation && (
          <div className="mb-4 p-3 rounded-lg bg-brass/5 border border-brass-faint">
            <p className="font-body text-sm text-warm-white">
              You&apos;ve been invited to join{' '}
              <span className="text-brass font-medium">
                {invitation.org_name}
              </span>{' '}
              as{' '}
              <span className="text-brass font-medium">{invitation.role}</span>
            </p>
            <p className="font-body text-xs text-warm-300 mt-1">
              Sign up with {invitation.email} to accept
            </p>
          </div>
        )}

        {/* Invitation error */}
        {inviteError && (
          <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-300 text-sm font-body">
            {inviteError}
          </div>
        )}

        {/* Auth UI */}
        <div className="card-surface p-6">
          <Auth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#c8a55a',
                    brandAccent: '#dfc07a',
                    brandButtonText: '#04040a',
                    defaultButtonBackground: '#10101c',
                    defaultButtonBackgroundHover: '#1c1c28',
                    defaultButtonBorder: 'rgba(200, 165, 90, 0.08)',
                    defaultButtonText: '#ece8e0',
                    inputBackground: '#0c0c16',
                    inputBorder: 'rgba(200, 165, 90, 0.08)',
                    inputBorderFocus: 'rgba(200, 165, 90, 0.3)',
                    inputBorderHover: 'rgba(200, 165, 90, 0.15)',
                    inputText: '#ece8e0',
                    inputLabelText: '#a8a498',
                    inputPlaceholder: '#5c5850',
                    anchorTextColor: '#c8a55a',
                    anchorTextHoverColor: '#dfc07a',
                  },
                  fonts: {
                    bodyFontFamily: '"Outfit", system-ui, sans-serif',
                    buttonFontFamily: '"Outfit", system-ui, sans-serif',
                    inputFontFamily: '"Outfit", system-ui, sans-serif',
                    labelFontFamily: '"Outfit", system-ui, sans-serif',
                  },
                  borderWidths: {
                    buttonBorderWidth: '1px',
                    inputBorderWidth: '1px',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem',
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                },
              },
            }}
            providers={['google', 'azure']}
            redirectTo={`${typeof window !== 'undefined' ? window.location.origin : ''}/auth/callback`}
            view="sign_up"
            showLinks={true}
            localization={{
              variables: {
                sign_up: {
                  email_label: 'Email address',
                  password_label: 'Password',
                  button_label: 'Create account',
                  link_text: 'Already have an account? Sign in',
                  social_provider_text: 'Sign up with {{provider}}',
                },
              },
            }}
          />
        </div>

        {/* Footer link */}
        <div className="text-center mt-6">
          <a
            href="/login"
            className="font-body text-sm text-brass hover:text-brass-light transition-colors"
          >
            Already have an account? Sign in
          </a>
        </div>

        <div className="h-px w-32 mx-auto bg-gradient-to-r from-transparent via-brass/40 to-transparent mt-8" />
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-warm-300 font-body text-sm">Loading...</div>
        </div>
      }
    >
      <SignupContent />
    </Suspense>
  )
}
